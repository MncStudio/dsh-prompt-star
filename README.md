# dsh-prompt-star

一个 DeepSeek Harness (DSH) 插件：在对话输入框旁放一个 **⭐ 星星按钮**。
你随手写完草稿点一下 ⭐，它读懂你的意图、读取当前项目的说明文件（CLAUDE.md / AGENTS.md / .cursorrules / README.md）作为上下文，复用 DSH 已配置的默认模型，生成一版更完整、更省 token 的提示词，**直接填入输入框**；不满意就 **Ctrl/Cmd+Z** 撤回原草稿。

> 设计说明见 [`设计说明.md`](./设计说明.md)。

## 发布模型：本地零构建，CI 构建

CLIENT 插件 bundle **无法独立构建**——`clientBundle()` 预设依赖 harness 仓库内部模块（`scripts/`、`packages/client/modules/`、`packages/client/web/`），所以必须在 **deepseek-harness workspace 内**构建。因此：

- **你在本地不下载、不构建、不 `pnpm install`**；
- 构建（连同那 2GB 依赖）全部发生在 **GitHub Actions runner** 上：`.github/workflows/build.yml` 会 checkout harness → 叠加本包 → 装依赖 → 先用 `tsc` 生成 `lib/types`（含 `@Remote` 装饰器的可执行 JS）→ 构建 host(`lib/index.js`) + client(`lib/client.js`) → 发布 npm（或打包成 `.tgz` 上传）；
- 你只用 `dsh plugin add <包名>` 安装**构建好的小产物**，或下载 Release 附件。

## 架构

插件按 harness 原生结构组织，位于 `packages/extensions/prompt-star/`：

```
dsh-prompt-star/
├── .github/workflows/build.yml      # CI：checkout harness + 叠加 + 构建 + 发布
├── packages/extensions/prompt-star/ # 插件包（要被叠加进 harness 构建）
│   ├── package.json                 # dsh.bundle + dsh.client manifest
│   ├── cordis.patch.yml             # host 插件行
│   ├── tsdown.config.ts             # clientBundle('dsh-prompt-star', ['src/index.ts'], { hostPhase:true })
│   └── src/
│       ├── index.ts                 # host: PromptStarService (TypertRemoteService + @Remote)
│       ├── types.ts                 # 共享 PromptStarRequest/Result
│       ├── host/generate.ts         # 探测说明文件 + ctx.llm.stream + BlockAssembler
│       └── client/
│           ├── index.ts             # client apply + slot 注册
│           └── StarButton.tsx       # ⭐ 按钮组件
└── templates/                       # 模板骨架（提需求/改bug/写信/通用）
```

- **host**：`PromptStarService` 继承 `@deepseek-ai/dsh-typert-protocol` 的 `TypertRemoteService`，方法用 `@Remote('generate')` 暴露；`generate` 读项目说明文件并调用 `ctx.llm.stream`（参考 `dsh-session-title-llm`）。
- **client**：`scope.slots.inject('conversation.input.right', () => scope.slots.register({...}, StarButton))` 把按钮挂进 composer 工具行（参考 `dsh-client-ui-input-trigger`）。组件用 `useInput()` 读草稿、`inputActions.setDraft()` 写回。

## 安装（在别人构建好之后）

```sh
# 从 npm（先发布）
dsh plugin --profile web add dsh-prompt-star

# 或从本地构建产物 / git
dsh plugin --profile web add ./dsh-prompt-star-0.1.1.tgz
```

因为声明了 `dsh.bundle`，`dsh` 会把它追加进 profile 的 `dsh.profile.bundles`；验证层生效：

```sh
dsh --profile web --dump-config   # 出现 "# == dsh-prompt-star" 层
dsh web                            # 启动（alias: --profile web）
```

## 需要在真实 harness 里核验的点（CI 首跑 + 运行时）

下列依赖 DSH 源码仓库与运行中的 web GUI，离线无法验证；**首次 CI 运行必须据此实测校准**：

1. **构建流水线**——`tsdown.config.ts` 的 `clientBundle()` 只接受 `lib/types` 作为输入；CI 已在两个 bundle pass 前运行 `tsc -b packages/extensions/prompt-star/tsconfig.json`，再通过 `tsdown --env.DSH_BUILD_FACE <host|client>` 选择构建面。
2. **tsconfig 归入**——插件自有的 composite `tsconfig.json` 明确引用它使用的 harness 包，因此不依赖修改 harness 根目录的 `tsconfig.host.json` / `tsconfig.client.json`。
3. **typert 远程类型**——`@Remote('generate')` 后 client 侧 `ctx.remote.promptStar` 由 typert 生成；`src/client/index.ts` 里用局部接口占位。
4. **`dsh-llm` 的 `purpose`**——当前发布版只接受 `'compaction' | 'session-title'`，因此插件不传此字段，以兼容已发布的 DSH。若 Harness 日后增加 `'prompt-star'`，可再传入该用途以启用提供方的专用策略。
5. **workspace 根目录**——`src/host/generate.ts` 用 `request.workspaceRoot ?? process.cwd()`；规范做法是走会话 workspace 服务（`ctx.workspaceFiles` / `dsh-util-workspace-path`）取真实根 + `FileSystem.contains` 授权。
6. **UI 位置**——⭐ 按钮最终渲染位置要看运行中的 web GUI（`conversation.input.right` 或改挂 `conversation.composer.dock`）。

## 安全 / 已知限制

- 本地生成、不上传代码（用户项目多涉内网/涉密）：host 只读工作区内文档文件并调用本机已配置模型，不发起外部请求。
- 意图精确匹配、可视化模板编辑器、无说明文件时"帮你生成 CLAUDE.md"弹窗：均属后续迭代。
