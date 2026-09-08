/**
 * Client plugin: mounts the ⭐ button into the composer input tool row
 * (`conversation.input.right`, a session-scoped list slot) and wires it to the
 * host `promptStar` Remote namespace. Loaded by the web app through the
 * `dsh.client` manifest; the button reads the draft via the session input
 * snapshot and writes the result back with `inputActions.setDraft`.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PromptStarRequest, PromptStarResult } from '../types.ts'
import { StarButton } from './StarButton.tsx'

export type * from '../types.ts'

/** Client-facing shape of the host `promptStar` Remote namespace. */
export interface PromptStarRemote {
  generate(request: PromptStarRequest): Promise<PromptStarResult>
}

/** Cordis services this client plugin needs. */
export const inject = ['slots', 'remote']

/**
 * Client plugin body: register the ⭐ button once the slot registry and the
 * remote face are up.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['slots', 'remote'], (scope: Context & { remote: { promptStar: PromptStarRemote } }) => {
    const promptStar = scope.remote.promptStar
    scope.slots.inject('conversation.input.right', () => scope.slots.register({
      name: 'conversation.input.right',
      id: 'prompt-star',
      order: 0,
      // The slot's inject face is what the component receives in addition to
      // the session standard seat (useInput / inputActions / useConversation).
      inject: () => ({ generate: promptStar.generate }),
    }, StarButton))
  })
}
