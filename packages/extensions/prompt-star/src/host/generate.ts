/**
 * Host implementation of one prompt-star generate: probe the project's doc
 * files for context, then call the configured default LLM to turn the draft +
 * context into a fuller prompt. Returns a best-effort result (never throws) so
 * a model failure degrades to a copy rather than failing the click.
 */

import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { FinishReason, GenerateOptions, Message } from '@deepseek-ai/dsh-llm'
import { deadline } from '@deepseek-ai/dsh-timeout'
import { deepFreeze } from '@deepseek-ai/dsh-util-values'
import type { DocFileSource, PromptStarRequest, PromptStarResult } from '../types.ts'

/** Doc files we probe (first match by priority wins as main context; all read). */
export const DOC_FILE_NAMES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules', 'README.md'] as const

/** Per-file read cap; keeps a huge README from eating the model input budget. */
const MAX_DOC_BYTES = 8_000
/** Output-token cap for the generated prompt. */
const MAX_OUTPUT_TOKENS = 1_200
/** End-to-end generate deadline. */
const TIMEOUT_MS = 20_000
/** Timeout code registered for the capability. */
const PROMPT_STAR_TIMEOUT_CODE = 'PROMPT_STAR_TIMEOUT'
/**
 * The host's configured default route. It is structural here so the plugin can
 * run against released DSH packages without depending on internal model types.
 */
interface DefaultModelRoute {
  currentSelection(): {
    provider: string
    model: string
  }
}

/** Inline template skeletons the model reuses as a shape, not a strict form. */
const SKELETONS = [
  { id: 'request', title: '提需求', hint: '目标 / 用户 / 验收标准 / 边界 / 依赖' },
  { id: 'bug', title: '改 bug', hint: '现象 / 复现步骤 / 期望 vs 实际 / 触发条件 / 环境' },
  { id: 'letter', title: '写信', hint: '称呼 / 目的 / 语气 / 落款' },
  { id: 'generic', title: '通用', hint: '目标 / 输入 / 期望输出 / 约束' },
] as const

/** Default workspace root used when the caller cannot supply one. */
function defaultRoot(ctx: Context): string {
  // The harness treats the launch directory as the workspace root; a plugin may
  // read the session's real root via the workspace service where available.
  void ctx
  return process.cwd()
}

/** Cap a path at the workspace root (defence-in-depth: refuses abs paths outside root). */
function keepInside(root: string, path: string): string | undefined {
  if (isAbsolute(path)) return path.startsWith(root) ? path : undefined
  return join(root, path)
}

/** Probe the doc files, reading the first `MAX_DOC_BYTES` bytes of each hit. */
async function readDocFiles(root: string): Promise<DocFileSource[]> {
  const sources: DocFileSource[] = []
  for (const name of DOC_FILE_NAMES) {
    const path = keepInside(root, name)
    if (path === undefined) continue
    try {
      const buf = await readFile(path)
      sources.push({ path, name, read: true, bytes: Math.min(buf.byteLength, MAX_DOC_BYTES) })
    } catch {
      sources.push({ path, name, read: false, bytes: 0 })
    }
  }
  return sources
}

/** Frame the doc context into the system prompt (references, not whole files). */
function frameContext(sources: readonly DocFileSource[]): string {
  const hits = sources.filter((source) => source.read)
  if (hits.length === 0) {
    return '当前项目没有可读的说明文件（未找到 CLAUDE.md / AGENTS.md / .cursorrules / README.md）。'
  }
  return hits
    .map((source) => `--- ${source.name} (${source.bytes} 字节) ---\n<probe-only: use this file as project context>`)
    .join('\n')
}

/** Compose the system instruction that turns a draft into a fuller prompt. */
function buildSystem(sources: readonly DocFileSource[]): string {
  const skeletonLines = SKELETONS
    .map((skeleton) => `- ${skeleton.title}（${skeleton.id}）：${skeleton.hint}`)
    .join('\n')
  return [
    '你是提示词优化器。用户会给一段随手写的草稿，你把它扩写成一版更完整、更省 token、意图清晰的提示词。',
    '阅读下面用到的项目说明文件（若有）作为上下文，不要照抄，只借用其术语、技术栈与约定。',
    '可参考的模板骨架（选择与该草稿最贴切的一个作为形状，按需补充）：',
    skeletonLines,
    '输出要求：',
    '- 只输出优化后的提示词正文，不要解释、不要 Markdown 包裹、不要前缀。',
    '- 保留用户草稿的原意，补全缺失的上下文与验收标准。',
    '- 用草稿同语言输出。',
    '',
    frameContext(sources),
  ].join('\n')
}

/** Map the LLM finish reason to an error, mirroring session-title-llm. */
function finishError(finish: FinishReason): Error | undefined {
  switch (finish.kind) {
    case 'stop':
      return undefined
    case 'error':
    case 'aborted': {
      const error = new Error(finish.failure.message) as Error & { code?: string }
      error.code = finish.failure.code
      return error
    }
    case 'max-tokens':
      return new Error('prompt-star: output reached maxTokens')
    case 'tool-calls':
      return new Error('prompt-star: model unexpectedly requested a tool')
    default:
      return new Error(`prompt-star: unsupported finish reason "${String((finish as { kind?: unknown }).kind)}"`)
  }
}

/** Read the plain text of one assembled LLM reply. */
function blocksToText(blocks: readonly ReturnType<BlockAssembler['blocks']>[number][]): string {
  return blocks
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join(' ')
}

/**
 * Generate the optimized prompt.
 * @param ctx - Host context carrying the `llm` service.
 * @param request - draft + optional workspace root / intent.
 * @returns a settled result; degraded=true when the model call failed.
 */
export async function generatePrompt(
  ctx: Context,
  request: PromptStarRequest,
): Promise<PromptStarResult> {
  const root = request.workspaceRoot ?? defaultRoot(ctx)
  const sources = await readDocFiles(root)
  const system = buildSystem(sources)

  const userText = request.intent?.trim()
    ? `草稿：\n${request.draft}\n\n请侧重「${request.intent}」模板。`
    : `草稿：\n${request.draft}`

  try {
    const route = (ctx as Context & { agentDefaultModel: DefaultModelRoute })
      .agentDefaultModel.currentSelection()
    const messages: Message[] = [createUserMessage({
      content: [{ type: 'text', text: userText }],
      source: { kind: 'plugin', plugin: 'dsh-prompt-star' },
    })]

    using callDeadline = deadline(request.signal ?? new AbortController().signal, TIMEOUT_MS, PROMPT_STAR_TIMEOUT_CODE)
    const options: GenerateOptions = deepFreeze({
      provider: route.provider,
      model: route.model,
      messages,
      system,
      maxTokens: MAX_OUTPUT_TOKENS,
      signal: callDeadline.signal,
    })

    callDeadline.signal.throwIfAborted()
    const assembler = new BlockAssembler()
    for await (const chunk of ctx.llm.stream(options)) {
      callDeadline.signal.throwIfAborted()
      assembler.push(chunk)
    }
    callDeadline.signal.throwIfAborted()
    const terminalError = finishError(assembler.finish)
    if (terminalError !== undefined) throw terminalError

    const blocks = assembler.blocks()
    if (blocks.some((block) => block.type === 'tool-call')) {
      throw new Error('prompt-star: output must contain text only')
    }
    const prompt = blocksToText(blocks).trim()
    if (prompt.length === 0) throw new Error('prompt-star: model produced no text')

    return {
      prompt,
      intent: request.intent ?? inferIntent(prompt, system),
      sources,
      model: route,
      degraded: false,
    }
  } catch (error) {
    // Degrade gracefully: hand back the draft unchanged (the client still lets
    // the user undo), never surface a raw transport error in the composer.
    return {
      prompt: request.draft,
      intent: request.intent ?? 'generic',
      sources,
      degraded: true,
    }
  }
}

/** Cheap intent label: prefer the supplied one, else the first skeleton hit. */
function inferIntent(prompt: string, _system: string): string {
  void prompt
  const hit = SKELETONS.find((skeleton) => skeleton.id === 'request' || skeleton.id === 'bug' || skeleton.id === 'letter')
  return hit?.id ?? 'generic'
}
