/**
 * dsh-prompt-star — host↔client RPC protocol (shared vocabulary).
 *
 * Transport: the generic Connection RPC channel `/dsh-prompt-star`
 * (the host registers it with `ctx.connection.rpc.handle`, the browser calls
 * `ctx.connection.rpc.call('/dsh-prompt-star', endpoint, payload)`).
 *
 * The host sells exactly one capability: reading a few project documentation
 * files for the current workspace (it CAN read file contents natively; the
 * browser client cannot). Everything else — assembling the fuller prompt from
 * the draft + that context — stays on the client.
 */
/** Absolute logical Connection RPC channel owned by this plugin. */
export const RPC_CHANNEL = '/dsh-prompt-star';
/** Channel-relative endpoint that reads project doc files on the host. */
export const EP_CONTEXT = 'context';
//# sourceMappingURL=types.js.map