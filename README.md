# dsh-prompt-star

一个 **DeepSeek Harness (DSH)** 插件：在对话输入框旁放一个 **⭐ 星星按钮**。你随手写完草稿点一下 ⭐，它读懂你的意图、读取当前项目的说明文件（`CLAUDE.md` / `AGENTS.md` / `.cursorrules` / `README.md`）作为上下文，生成一版**更完整、更高效、更省 token** 的提示词，**直接填入输入框**；不满意就按 **Ctrl/Cmd+Z** 撤回原草稿。

> 设计说明见 [`设计说明.md`](./设计说明.md)。

## 安装

```sh
dsh plugin --profile web add dsh-prompt-star
```

安装后完整重启 `dsh web`，并在浏览器硬刷新（`Cmd+Shift+R`），输入框旁就会出现 ⭐。

> 需要 `dsh web`（web profile）。插件声明了 `dsh.bundle`，`dsh` 会把它追加进 profile 的 `dsh.profile.bundles`。

## 它做什么

点 ⭐ 后，插件会在**完全本地**完成：

1. 读取当前会话的**草稿**（输入框内容）；
2. 读取项目的**说明文件**（README / AGENTS / CLAUDE / .cursorrules 等，读不到就跳过）；
3. 把这些拼成一份**结果清晰、上下文完整、可直接用的提示词**，`setDraft` 写回输入框。

不在本地构建、不上传你的代码、不发起任何外部网络请求——只复用 DSH 已配置好的模型与工作区。

## 架构：纯 client 插件

这是**纯 client 插件**，不依赖自定义 host↔client RPC，因此能跑在任何 stock `dsh web` 组合里：

- **client**（`src/client/`）：⭐ 组件挂进 `conversation.input.right` 槽位；用 `useInput()` 读草稿、`inputActions.setDraft()` 写回；通过**已挂载的内置 `workspaceFiles` remote** 读取项目说明文件。
- **host**（`src/index.ts`）：仅提供一个最小 `apply(ctx)`，让插件行挂载，从而让 `dsh-client-modules` 发现并服务其 client bundle。

目录结构：

```
dsh-prompt-star/
├── .github/workflows/build.yml      # CI：checkout harness + 叠加 + 构建 + 发布 npm
└── packages/extensions/prompt-star/ # 插件包（叠加进 harness 构建）
    ├── package.json                 # dsh.bundle + dsh.client manifest
    ├── cordis.patch.yml             # host 插件行
    ├── tsdown.config.ts             # clientBundle('dsh-prompt-star', ..., { hostPhase:true })
    └── src/
        ├── index.ts                 # host: 最小 apply(ctx)
        ├── types.ts                 # 共享类型
        └── client/
            ├── index.ts             # client apply + slot 注册
            └── StarButton.tsx       # ⭐ 按钮组件
```

## 发布模型

client bundle 依赖 harness 仓库内部模块（`clientBundle()` 预设），无法独立构建，因此构建全部发生在 **GitHub Actions** 上：CI checkout harness → 叠加本包 → 装依赖 → `tsc` 生成 `lib/types` → 构建 host + client → `npm publish`。你无需本地构建或安装重依赖。

## 安全 / 已知限制

- 完全本地生成，不上传代码（用户项目常涉内网/涉密）。
- 读取**只读**：仅读取工作区内的说明文件与草稿，不修改源文件。
- 意图精确匹配、可视化模板编辑器、无说明文件时“帮你生成 CLAUDE.md”弹窗：属后续迭代。

## 许可证

MIT
