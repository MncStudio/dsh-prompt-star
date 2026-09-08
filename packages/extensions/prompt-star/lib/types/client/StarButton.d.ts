/**
 * The ⭐ button rendered beside the conversation input.
 *
 * On click it reads the current draft (session input snapshot), asks the host
 * (over the `/dsh-prompt-star` Connection RPC channel) to read a few project
 * doc files as context, assembles a fuller, more efficient prompt on the client,
 * then writes it back with `inputActions.setDraft`. Press Ctrl/Cmd+Z to restore
 * the original draft.
 *
 * The slot framework composes this component's props: the session standard seat
 * (`useInput`, `inputActions`) plus the register-time `context` face this client
 * plugin injects. The interfaces below are the minimal structural shapes this
 * component needs; they match the composed slot props without importing the
 * harness client types.
 */
import { type ReactElement } from 'react';
import type { ContextRpcResult } from '../types';
export interface StarButtonProps {
    /** Host RPC caller that returns the project doc context. */
    context(): Promise<ContextRpcResult>;
    /** Session input snapshot hook (returns the current draft). */
    useInput(): {
        draft: string;
    };
    /** Session public input actions (write the whole draft). */
    inputActions: {
        setDraft(text: string): void;
    };
}
export declare function StarButton({ context, useInput, inputActions }: StarButtonProps): ReactElement;
//# sourceMappingURL=StarButton.d.ts.map