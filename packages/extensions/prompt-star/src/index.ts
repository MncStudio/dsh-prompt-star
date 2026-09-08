/**
 * Host plugin: owns the `promptStar` Remote namespace. The client ⭐ button
 * calls `ctx.remote.promptStar.generate(...)`; this service reads the project
 * doc files and calls the configured LLM. Mirrors the workspace-controller
 * pattern: extend {@link TypertRemoteService}, declare the Cordis service,
 * decorate each RPC with `@Remote`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { generatePrompt } from './host/generate.ts'
import type { PromptStarRequest, PromptStarResult } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host business API and Remote namespace owner for prompt-star. */
    promptStar: PromptStarService
  }
}

/** Host service backing the generated `ctx.remote.promptStar` namespace. */
export class PromptStarService extends TypertRemoteService {
  static inject = ['typert']

  private readonly ctx: Context

  /** @param ctx - Host context exposing the LLM and workspace services. */
  constructor(ctx: Context) {
    super(ctx, 'promptStar', { namespace: 'promptStar' })
    this.ctx = ctx
  }

  /**
   * Turn a draft + project context into a fuller prompt.
   * @param request - draft and optional workspace root / intent / signal.
   * @returns generated prompt and the doc files probed for context.
   */
  @Remote('generate')
  async generate(request: PromptStarRequest): Promise<PromptStarResult> {
    return generatePrompt(this.ctx, request)
  }
}

export default PromptStarService
