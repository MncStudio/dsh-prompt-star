/**
 * Shared request/result types for the prompt-star host Remote namespace.
 * Kept free of Cordis/Node so the client bundle can import them.
 */

/** One project doc file the host probes and may read as context. */
export interface DocFileSource {
  /** Absolute path as resolved on the host. */
  readonly path: string
  /** Basename (CLAUDE.md / AGENTS.md / .cursorrules / README.md). */
  readonly name: string
  /** Whether the file existed and was read. */
  readonly read: boolean
  /** Bytes read, capped; 0 when `read` is false. */
  readonly bytes: number
}

/** Client → Host: a click of ⭐ with the current draft. */
export interface PromptStarRequest {
  /** Current draft text (the editor's clipboard-text projection). */
  readonly draft: string
  /**
   * Session workspace root when the client knows it, else undefined and the
   * host falls back to its own resolution / process.cwd().
   */
  readonly workspaceRoot?: string
  /** Pick a template intent explicitly; empty lets the model infer it. */
  readonly intent?: string
  /** Optional caller cancellation; the host falls back to an internal deadline. */
  readonly signal?: AbortSignal
}

/** Host → Client: the generated prompt ready to fill the input. */
export interface PromptStarResult {
  /** Generated full prompt text. */
  readonly prompt: string
  /** Intent/template the model chose (or the supplied `intent`). */
  readonly intent: string
  /** Doc files the host probed for context. */
  readonly sources: readonly DocFileSource[]
  /** Model route actually used (provider/model when available). */
  readonly model?: { readonly provider: string; readonly model: string }
  /** True when a transient/LLM failure was swallowed and `prompt` is a best-effort copy. */
  readonly degraded: boolean
}
