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
export declare const RPC_CHANNEL = "/dsh-prompt-star";
/** Channel-relative endpoint that reads project doc files on the host. */
export declare const EP_CONTEXT = "context";
export interface GenerateContextRequest {
    /**
     * Optional workspace directory to probe for doc files. When absent the host
     * falls back to the DSH process working directory.
     */
    cwd?: string;
}
export interface DocContext {
    /** One entry per successfully read project-doc file. */
    docs: Array<{
        name: string;
        text: string;
    }>;
    /** Number of doc files read. */
    filesRead: number;
}
/** The `context` endpoint's success/error envelope (Connection RPC result). */
export type ContextRpcResult = {
    ok: true;
    value: DocContext;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
        details: object;
    };
};
//# sourceMappingURL=types.d.ts.map