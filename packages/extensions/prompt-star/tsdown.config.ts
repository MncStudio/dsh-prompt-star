import { clientBundle } from '../../client/tsdown.client.ts'

/**
 * Host + client plugin bundle. Mirrors host-and-client packages (e.g.
 * `packages/api/workspace-controller`): `hostPhase: true` emits the node-half
 * (`lib/index.js`) during the Host pass and the browser bundle (`lib/client.js`)
 * during the Client pass.
 *
 * This config can only be built INSIDE the deepseek-harness workspace — the
 * `clientBundle` preset imports repo-internal modules (`scripts/`,
 * `packages/client/modules/`, `packages/client/web/`). The CI workflow in
 * `.github/workflows/build.yml` checks out the harness, overlays this package,
 * and builds it there.
 */
export default clientBundle(
  'dsh-prompt-star',
  // `clientBundle` deliberately consumes TypeScript's emitted JavaScript.
  // Besides producing declarations, that pass lowers standard decorators such
  // as `@Remote('generate')`. Passing `src/index.ts` directly makes tsdown
  // preserve the decorator token in `lib/index.js`, which Node cannot parse
  // when DSH loads the host plugin.
  ['lib/types/index.js'],
  { hostPhase: true },
)
