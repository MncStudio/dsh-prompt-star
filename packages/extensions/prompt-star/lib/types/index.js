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
import { RPC_CHANNEL, EP_CONTEXT } from './types';
/** Project doc files probed, in priority order. Reads are best-effort. */
const DOC_CANDIDATES = [
    'README.md',
    'README',
    'AGENTS.md',
    'CLAUDE.md',
    'CONTRIBUTING.md',
    'docs/README.md',
    'docs/index.md',
    '.cursorrules',
];
/** Per-doc content cap so a huge README cannot flood the input. */
const MAX_DOC_CHARS = 4000;
/**
 * Minimal host plugin body: mount the `/dsh-prompt-star` RPC channel.
 * @param ctx - host root context.
 */
export function apply(ctx) {
    const host = ctx;
    // Registrations on `ctx.connection.rpc` belong to this plugin's Cordis fiber,
    // so they are removed automatically when the plugin is torn down.
    host.connection.rpc.handle(RPC_CHANNEL, async (endpoint, payload) => {
        if (endpoint !== EP_CONTEXT) {
            return {
                ok: false,
                error: { code: 'unknown_endpoint', message: `unknown endpoint '${endpoint}'`, details: {} },
            };
        }
        try {
            const req = (payload ?? {});
            const root = req.cwd?.trim() || process.cwd();
            const docs = [];
            const seen = new Set();
            let filesRead = 0;
            for (const name of DOC_CANDIDATES) {
                try {
                    const target = host.fs.resolve(name, { cwd: root });
                    const text = await host.fs.readText(target);
                    const trimmed = text?.trim();
                    if (trimmed && !seen.has(name)) {
                        seen.add(name);
                        docs.push({ name, text: trimmed.slice(0, MAX_DOC_CHARS) });
                        filesRead += 1;
                    }
                }
                catch {
                    // Absent / unreadable / outside the workspace: leave it out.
                }
            }
            return { ok: true, value: { docs, filesRead } };
        }
        catch (err) {
            return {
                ok: false,
                error: {
                    code: 'internal',
                    message: err instanceof Error ? err.message : String(err),
                    details: {},
                },
            };
        }
    });
}
//# sourceMappingURL=index.js.map