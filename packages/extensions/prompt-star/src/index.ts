/**
 * Host entry for dsh-prompt-star.
 *
 * The ⭐ button is a pure client plugin (see `src/client/`): it reads the
 * conversation draft via the session input snapshot, reads project doc files
 * through the already-mounted `workspaceFiles` remote, and assembles a fuller,
 * more efficient prompt entirely on the client. It needs no custom host↔client
 * RPC, so this host half only provides a minimal Cordis plugin that keeps the
 * bundle mounted as a Loader entry — which is what makes `dsh-client-modules`
 * discover and serve its client bundle.
 *
 * This entry follows the standard DSH plugin export contract `apply(ctx)`.
 */

import type { Context } from '@deepseek-ai/cordis'

/**
 * Minimal host plugin body. The button logic lives entirely in the client
 * bundle; mounting this row is what lets the web app serve `lib/client.js`.
 */
export function apply(_ctx: Context): void {
  // no-op by design: the client plugin does the real work.
}

export default apply
