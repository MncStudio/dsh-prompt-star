/**
 * Client plugin: mounts the ⭐ button into the composer input tool row
 * (`conversation.input.right`, a session-scoped list slot) and wires it to the
 * host's `/dsh-prompt-star` Connection RPC channel.
 *
 * This client half only needs the slot registry and the `connection` service.
 * On click the button asks the host for project doc context (the browser cannot
 * read file contents itself), then assembles the fuller prompt on the client and
 * writes it back with `inputActions.setDraft`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { StarButton } from './StarButton.tsx'
import { RPC_CHANNEL, EP_CONTEXT, type ContextRpcResult } from '../types'

/** Local structural face of the client services this plugin uses. */
interface ClientScope {
  slots: {
    inject(name: string, setup: () => void): void
    register(
      entry: {
        name: string
        id: string
        order: number
        inject: () => { context(): Promise<ContextRpcResult> }
      },
      component: typeof StarButton,
    ): void
  }
  connection: {
    rpc: {
      call(
        channel: string,
        endpoint: string,
        payload: unknown,
        signal?: AbortSignal,
      ): Promise<ContextRpcResult>
    }
  }
}

/** Cordis services this client plugin needs: the slot registry and the
 *  Connection service (both provided by the stock web-app composition). */
export const inject = ['slots', 'connection']

/**
 * Client plugin body: register the ⭐ button once the slot registry and the
 * Connection service are up.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['slots', 'connection'], (scope) => {
    const root = scope as unknown as ClientScope
    const rpc = root.connection.rpc

    root.slots.inject('conversation.input.right', () => {
      root.slots.register({
        name: 'conversation.input.right',
        id: 'prompt-star',
        order: 0,
        inject: () => ({
          context: () => rpc.call(RPC_CHANNEL, EP_CONTEXT, {}),
        }),
      }, StarButton)
    })
  })
}
