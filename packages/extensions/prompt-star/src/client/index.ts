/**
 * Client plugin: mounts the ⭐ button into the composer input tool row
 * (`conversation.input.right`, a session-scoped list slot) and wires it to the
 * already-mounted `workspaceFiles` remote.
 *
 * This is a pure-client plugin: it reads the draft via the session input
 * snapshot, reads project doc files through `ctx.remote.workspaceFiles`, and
 * assembles a fuller prompt on the client — no custom host↔client RPC is needed,
 * so it works in any stock `dsh web` build.
 */

import type { Context } from '@deepseek-ai/cordis'
import { StarButton, type WorkspaceFilesRemote } from './StarButton.tsx'

interface PromptStarSlots {
  inject(name: string, setup: () => void): void
  register(
    entry: {
      name: string
      id: string
      order: number
      inject: () => { workspaceFiles: WorkspaceFilesRemote }
    },
    component: typeof StarButton,
  ): void
}

type PromptStarClientScope = Context & {
  remote: { workspaceFiles: WorkspaceFilesRemote }
  slots: PromptStarSlots
}

/** Cordis services this client plugin needs: the slot registry and the mounted
 *  `workspaceFiles` remote (both provided by the stock web-app composition). */
export const inject = ['slots', 'remote', 'remote.workspaceFiles']

/**
 * Client plugin body: register the ⭐ button once the slot registry and the
 * `workspaceFiles` remote are up.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['slots', 'remote', 'remote.workspaceFiles'], (scope) => {
    const root = scope as PromptStarClientScope
    const { workspaceFiles } = root.remote
    root.slots.inject('conversation.input.right', () => {
      root.slots.register({
        name: 'conversation.input.right',
        id: 'prompt-star',
        order: 0,
        inject: () => ({ workspaceFiles }),
      }, StarButton)
    })
  })
}
