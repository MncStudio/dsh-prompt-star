/**
 * The ⭐ button rendered beside the conversation input.
 *
 * Pure-client plugin: on click it reads the current draft (from the session
 * input snapshot), reads a few project doc files through the already-mounted
 * `workspaceFiles` remote, and assembles a fuller, more efficient prompt on the
 * client, then writes it back with `inputActions.setDraft`. The user presses
 * Ctrl/Cmd+Z if they want the original draft back.
 *
 * The slot framework composes this component's props: the session standard seat
 * (`useInput`, `inputActions`, `sessionId`) plus the register-time `workspaceFiles`
 * face the client plugin injects. The interfaces below are the minimal structural
 * shapes this component needs; they match the mounted `workspaceFiles` remote and
 * the composed slot props without importing the harness client types.
 */

import { useState, type CSSProperties, type ReactElement } from 'react'

/** Minimal structural face of the mounted `workspaceFiles` remote. */
export interface WorkspaceFilesRemote {
  read(
    sessionId: string,
    path: string,
    range: { offset?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; value?: { text: string; eof?: boolean } }>
  list(
    sessionId: string,
    path: string,
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; value?: { entries: Array<{ name: string; type: string }> } }>
}

export interface StarButtonProps {
  /** Mounted `workspaceFiles` remote (reads project docs). */
  workspaceFiles: WorkspaceFilesRemote
  /** Session input snapshot hook (returns the current draft). */
  useInput(): { draft: string }
  /** Session public input actions (write the whole draft). */
  inputActions: { setDraft(text: string): void }
  /** Current session identity, used as the wire identity for file reads. */
  sessionId: string
}

/** Common project-doc filenames probed as prompt context. */
const DOC_CANDIDATES: readonly string[] = [
  'README.md',
  'README',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/index.md',
  '.cursorrules',
]

const buttonStyle: CSSProperties = {
  all: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '30px',
  height: '30px',
  cursor: 'pointer',
  borderRadius: '6px',
  fontSize: '16px',
  lineHeight: 1,
  opacity: 0.9,
  userSelect: 'none',
}

interface DocContext {
  readonly docs: Array<{ name: string; text: string }>
  readonly filesRead: number
}

/** Best-effort read of project doc files; every read is guarded so a missing
 *  or unreadable file is skipped rather than breaking the button. */
async function gatherContext(
  workspaceFiles: WorkspaceFilesRemote,
  sessionId: string,
): Promise<DocContext> {
  const docs: Array<{ name: string; text: string }> = []
  const seen = new Set<string>()
  let filesRead = 0
  for (const path of DOC_CANDIDATES) {
    try {
      const result = await workspaceFiles.read(sessionId, path, { offset: 1, limit: 120 })
      if (result.ok && result.value?.text) {
        const text = result.value.text.trim()
        if (text.length > 0 && !seen.has(path)) {
          seen.add(path)
          docs.push({ name: path, text })
          filesRead += 1
        }
      }
    } catch {
      // Not present / not readable: leave it out.
    }
  }
  return { docs, filesRead }
}

/** Assemble a fuller, structured prompt from the draft + any project context. */
function assemblePrompt(draft: string, context: DocContext): string {
  const projectContext = context.filesRead === 0
    ? '（未读取到项目文档）'
    : context.docs.map((doc) => `## ${doc.name}\n${doc.text}`).join('\n\n')

  return [
    '请把下面的【我的草稿】整理成一段完整、清晰、高效的提示词，直接输出整理后的提示词本身。',
    '',
    '整理要求：',
    '1. 明确任务目标、所需上下文、约束条件与期望输出形式。',
    '2. 若【项目文档】提供了相关规范、术语或背景，请吸收进去，使提示词更贴合项目。',
    '3. 语气中立专业，结构清晰（可用编号、小节或列表），忠于草稿原意，不虚构。',
    '4. 长度以覆盖草稿要点为准，不要过度扩写。',
    '',
    '# 项目文档',
    projectContext,
    '',
    '# 我的草稿',
    draft,
  ].join('\n')
}

export function StarButton({
  workspaceFiles,
  useInput,
  inputActions,
  sessionId,
}: StarButtonProps): ReactElement {
  const input = useInput()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  async function onClick(): Promise<void> {
    const draft = input.draft.trim()
    if (draft.length === 0) {
      setError('草稿为空，先写点什么再点 ⭐')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const context = await gatherContext(workspaceFiles, sessionId)
      const full = assemblePrompt(draft, context)
      if (full && full !== draft) {
        inputActions.setDraft(full)
        setError(
          context.filesRead === 0
            ? '已按草稿整理（未读取到项目文档）'
            : `已整理并读取 ${context.filesRead} 个项目文档`,
        )
      } else {
        setError('未生成新内容')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(`生成失败: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      style={buttonStyle}
      title={error ?? 'prompt-star: 整理成更完整的提示词'}
      disabled={busy}
      onClick={onClick}
    >
      {busy ? '…' : '⭐'}
    </button>
  )
}
