/**
 * Host entry for dsh-prompt-star.
 *
 * The ⭐ button lives in the client half; this host half registers ONE generic
 * Connection RPC channel (`/dsh-prompt-star`) that reads a few project
 * documentation files for the current workspace. The browser client CANNOT read
 * file contents (the stock web app exposes no content-reading remote), so the
 * read happens here and is shipped to the browser over the Connection channel.
 *
 * This entry follows the standard DSH plugin export contract `apply(ctx)`.
 *
 * The host-side services (`ctx.connection.rpc`, `ctx.fs`) are consumed through
 * small local structural types instead of importing the harness packages, so the
 * plugin's `tsc` stays inside its own `rootDir` and never drags harness source
 * files into its program.
 */
import type { Context } from '@deepseek-ai/cordis';
/**
 * Minimal host plugin body: mount the `/dsh-prompt-star` RPC channel.
 * @param ctx - host root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map