import { jsx as _jsx } from "react/jsx-runtime";
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
import { useState } from 'react';
/** Common project-doc filenames are probed on the HOST; the client never
 *  enumerates them (it just asks the host for the read context). */
const buttonStyle = {
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
};
/** Build a fuller, structured prompt from the draft + any project context. */
function assemblePrompt(draft, context) {
    const projectContext = context.docs.length === 0
        ? '（未读取到项目文档）'
        : context.docs.map((doc) => `## ${doc.name}\n${doc.text}`).join('\n\n');
    return [
        '请把下面的【我的草稿】整理成一段完整、清晰、高效的提示词，直接输出整理后的提示词本身。',
        '',
        '整理要求：',
        '1. 明确任务目标、所需上下文、约束条件与期望输出形式。',
        '2. 若【项目文档】提供了相关规范、术语或背景，请吸收进去，使提示词更贴合项目。',
        '3. 语气中立专业，结构清晰（可用编号、小节或列表），忠于草稿原意，不虚构。',
        '4. 长度以覆盖草稿要点为准，不要过度扩写。',
        '',
        '# 项目文档',
        projectContext,
        '',
        '# 我的草稿',
        draft,
    ].join('\n');
}
export function StarButton({ context, useInput, inputActions }) {
    const input = useInput();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(undefined);
    async function onClick() {
        const draft = input.draft.trim();
        if (draft.length === 0) {
            setError('草稿为空，先写点什么再点 ⭐');
            return;
        }
        setBusy(true);
        setError(undefined);
        try {
            const res = await context();
            if (!res.ok) {
                setError(`读取项目文档失败: ${res.error?.message ?? '未知错误'}`);
                return;
            }
            const value = res.value;
            const full = assemblePrompt(draft, value);
            if (full && full !== draft) {
                inputActions.setDraft(full);
                setError(value.docs.length === 0
                    ? '已按草稿整理（未读取到项目文档）'
                    : `已整理并读取 ${value.docs.length} 个项目文档`);
            }
            else {
                setError('未生成新内容');
            }
        }
        catch (cause) {
            const message = cause instanceof Error ? cause.message : String(cause);
            setError(`生成失败: ${message}`);
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx("button", { type: "button", style: buttonStyle, title: error ?? 'prompt-star: 整理成更完整的提示词', disabled: busy, onClick: onClick, children: busy ? '…' : '⭐' }));
}
//# sourceMappingURL=StarButton.js.map