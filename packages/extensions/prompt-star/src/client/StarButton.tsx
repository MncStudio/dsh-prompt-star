/**
 * The ⭐ button rendered beside the conversation input. On click it reads the
 * current draft (from the session input snapshot), asks the host to generate a
 * fuller prompt, and writes it back with `inputActions.setDraft` — the user
 * presses Ctrl/Cmd+Z if they want the original draft back.
 *
 * The slot framework composes this component's props: the session standard seat
 * (`useInput`, `inputActions`, `useConversation`) plus the register-time
 * `generate` face the client plugin injects. The interface below is the minimal
 * structural shape this component needs; it matches the composed slot props.
 */

import { useState, type CSSProperties, type ReactElement } from 'react'
import type { PromptStarRequest, PromptStarResult } from '../types.ts'

export interface StarButtonProps {
  /** Host RPC producing the optimized prompt from a draft. */
  generate(request: PromptStarRequest): Promise<PromptStarResult>
  /** Session input snapshot hook (returns the current draft). */
  useInput(): { draft: string }
  /** Session public input actions (write the whole draft). */
  inputActions: { setDraft(text: string): void }
  /** Optional workspace root to pass through to the host. */
  useActiveRoot?: () => string | undefined
}

const buttonStyle: CSSProperties = {
  all: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '30px',
  height: '30px',
  cursor: 'pointer',
  borderRadius: '6px',
  fontSize: '16px',
  lineHeight: 1,
  opacity: 0.9,
  userSelect: 'none',
}

export function StarButton({
  generate,
  useInput,
  inputActions,
  useActiveRoot,
}: StarButtonProps): ReactElement {
  const input = useInput()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  async function onClick(): Promise<void> {
    const draft = input.draft.trim()
    if (draft.length === 0) {
      setError('草稿为空，先写点什么再点 ⭐')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const workspaceRoot = useActiveRoot?.()
      const result = await generate({
        draft,
        ...(workspaceRoot === undefined ? {} : { workspaceRoot }),
      })
      if (result.prompt && result.prompt !== draft) {
        inputActions.setDraft(result.prompt)
        if (result.degraded) setError('模型调用失败，已保留原草稿')
      } else {
        setError(result.degraded ? '模型调用失败，未生成新内容' : '生成结果与原草稿相同，未替换')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(`生成失败: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      style={buttonStyle}
      title={error ?? ('prompt-star: 生成更完整的提示词')}
      disabled={busy}
      onClick={onClick}
    >
      {busy ? '…' : '⭐'}
    </button>
  )
}
