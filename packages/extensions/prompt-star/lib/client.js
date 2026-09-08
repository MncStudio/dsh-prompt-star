window.__ModuleLoader__.load({
	id: "dsh-prompt-star",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/StarButton.js
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
		/** Common project-doc filenames are probed on the HOST; the client never
		*  enumerates them (it just asks the host for the read context). */
		const buttonStyle = {
			all: "unset",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: "30px",
			height: "30px",
			cursor: "pointer",
			borderRadius: "6px",
			fontSize: "16px",
			lineHeight: 1,
			opacity: .9,
			userSelect: "none"
		};
		/** Build a fuller, structured prompt from the draft + any project context. */
		function assemblePrompt(draft, context) {
			return [
				"请把下面的【我的草稿】整理成一段完整、清晰、高效的提示词，直接输出整理后的提示词本身。",
				"",
				"整理要求：",
				"1. 明确任务目标、所需上下文、约束条件与期望输出形式。",
				"2. 若【项目文档】提供了相关规范、术语或背景，请吸收进去，使提示词更贴合项目。",
				"3. 语气中立专业，结构清晰（可用编号、小节或列表），忠于草稿原意，不虚构。",
				"4. 长度以覆盖草稿要点为准，不要过度扩写。",
				"",
				"# 项目文档",
				context.docs.length === 0 ? "（未读取到项目文档）" : context.docs.map((doc) => `## ${doc.name}\n${doc.text}`).join("\n\n"),
				"",
				"# 我的草稿",
				draft
			].join("\n");
		}
		function StarButton({ context, useInput, inputActions }) {
			const input = useInput();
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			async function onClick() {
				const draft = input.draft.trim();
				if (draft.length === 0) {
					setError("草稿为空，先写点什么再点 ⭐");
					return;
				}
				setBusy(true);
				setError(void 0);
				try {
					const res = await context();
					if (!res.ok) {
						setError(`读取项目文档失败: ${res.error?.message ?? "未知错误"}`);
						return;
					}
					const value = res.value;
					const full = assemblePrompt(draft, value);
					if (full && full !== draft) {
						inputActions.setDraft(full);
						setError(value.docs.length === 0 ? "已按草稿整理（未读取到项目文档）" : `已整理并读取 ${value.docs.length} 个项目文档`);
					} else setError("未生成新内容");
				} catch (cause) {
					setError(`生成失败: ${cause instanceof Error ? cause.message : String(cause)}`);
				} finally {
					setBusy(false);
				}
			}
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				style: buttonStyle,
				title: error ?? "prompt-star: 整理成更完整的提示词",
				disabled: busy,
				onClick,
				children: busy ? "…" : "⭐"
			});
		}
		//#endregion
		//#region lib/types/types.js
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
		const RPC_CHANNEL = "/dsh-prompt-star";
		/** Channel-relative endpoint that reads project doc files on the host. */
		const EP_CONTEXT = "context";
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Client plugin: mounts the ⭐ button into the composer input tool row
		* (`conversation.input.right`, a session-scoped list slot) and wires it to the
		* host's `/dsh-prompt-star` Connection RPC channel.
		*
		* This client half only needs the slot registry and the `connection` service.
		* On click the button asks the host for project doc context (the browser cannot
		* read file contents itself), then assembles the fuller prompt on the client and
		* writes it back with `inputActions.setDraft`.
		*/
		/** Cordis services this client plugin needs: the slot registry and the
		*  Connection service (both provided by the stock web-app composition). */
		const inject = ["slots", "connection"];
		/**
		* Client plugin body: register the ⭐ button once the slot registry and the
		* Connection service are up.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.inject(["slots", "connection"], (scope) => {
				const root = scope;
				const rpc = root.connection.rpc;
				root.slots.inject("conversation.input.right", () => {
					root.slots.register({
						name: "conversation.input.right",
						id: "prompt-star",
						order: 0,
						inject: () => ({ context: () => rpc.call(RPC_CHANNEL, EP_CONTEXT, {}) })
					}, StarButton);
				});
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map