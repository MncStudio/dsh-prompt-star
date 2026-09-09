# AGENTS.md — 交接说明（给下一个 AI 会话 / 协作者）

> **读这份再动手。** 它讲清三件事：**这个项目是什么**、**用户到底要什么**、**已经踩过哪些坑**。
> 目的：下一轮工作不跑偏、不重复犯错。
>
> 文件名用 `AGENTS.md` 是刻意的——DSH 新会话会自动读取项目根目录的这类文件。
> 最后更新：2026-09-09 02:10 UTC

---

## 0. 红线：协作方式（先看这条）

- **说中文。**
- **不要设定时提醒、不要主动反复轮询外部状态。** 用户明确说过「不用提醒我」「我自己看」。做完一件事就停下来给结论，不要自己挂后台任务盯着商城 / CI。
- **构建一律在 CI 上做**（GitHub Actions），**不要在本机安装 deepseek-harness**（源码 108M + 依赖）。
- **报错先查根因**，不要猜、不要靠反复重试。查完说清「根因是什么、怎么修、影响面」。
- **改动要能解释清楚**：改了哪些文件、为什么、对安装 / 上架有什么影响。
- 涉及密钥 / 账号 / token 的操作，**先问用户**。
- 不要为了「让状态好看」制造无意义提交（见 §3 坑 3）。

---

## 1. 项目是什么

| 项 | 值 |
|---|---|
| 名称 | `dsh-prompt-star`（npm 同名） |
| 仓库 | https://github.com/MncStudio/dsh-prompt-star（public，MIT） |
| 插件路径 | `packages/extensions/prompt-star` |
| 当前版本 | `0.1.3`（已发布 npm，`registry.npmmirror.com` 镜像） |
| 形态 | DeepSeek Harness（DSH）Web 插件 |

### 功能（一句话）

在 DSH 会话输入框旁加一个 **⭐ 按钮**：点一下读取当前草稿 + 项目说明文件，复用 DSH 当前默认模型，生成一版更完整高效的提示词，**直接填入输入框**（Ctrl/Cmd+Z 撤回原草稿）。

### 架构

- **client 侧**：React 组件 `src/client/StarButton.tsx`，渲染 ⭐ 按钮、组装提示词、写入输入框。
- **host 侧**：`src/index.ts`，通过**通用 Connection RPC** 读取项目文档（不直接用 `fs` 模块）。
- **不自己调模型**：复用 DSH 已配置的默认模型，不额外要 API key。
- 项目说明文件优先级：`CLAUDE.md` / `AGENTS.md` / `.cursorrules` / `README.md`。

### 目录

```
packages/extensions/prompt-star/
├─ src/                 # 源码（改这里）
│  ├─ index.ts          # host 入口
│  ├─ types.ts
│  └─ client/{index.ts,StarButton.tsx}
├─ lib/                 # 构建产物（必须提交！见下）
│  ├─ index.js          # host bundle
│  ├─ client.js         # client bundle
│  └─ types/            # tsc 产出的 .d.ts / .js
├─ templates/           # 提示词模板骨架
├─ package.json         # 含 dsh.bundle / dsh.client / dsh.compatibility
└─ tsconfig.json · tsdown.config.ts · cordis.patch.yml
```

### 为什么 `lib/` 必须提交进仓库

DSH-Store 用**固定 commit** 做 git 安装，而 git 安装**不执行构建脚本**——这是刻意的选择（保持「无生命周期脚本」这一最干净的安全档位）。

因此：**改了 `src/` 却不重新构建并提交 `lib/`，市场里装的还是旧代码，改动不生效。**
→ 已用 `.github/workflows/rebuild-lib.yml` 自动解决（见 §6）。

---

## 2. 用户的需求

### 核心目标

1. 插件能在 **DSH-Store 商城**（dsh.store）被收录 / 上架，别人能 `dsh plugin add dsh-prompt-star` 安装。
2. 功能按 `设计说明.md` 落地（⭐ 按钮 → 读文档 → 生成提示词 → 填入输入框）。
3. 改源码后，**分发链路自动跟上**（不用手动重建 / 提交 `lib/`）。

### 用户已定的产品决策（详见 `设计说明.md`）

- 项目说明文件**全认**，按优先级找，有哪个读哪个；没有时问用户要不要生成。
- 模板是给模型的**参考骨架**，不是手动套用框架。
- 生成结果**直接填入**，不做 diff / 对比编辑；用 Ctrl/Cmd+Z 撤回。
- 文件读取**不做内容白名单**，只跳过 `node_modules` / `.git` / 构建产物等超大目录。
- 复用 DSH 默认模型，不额外要 key。
- MVP 优先，模板库 / 意图精确匹配后续迭代。

### 协作偏好

- 用户会**自己看**商城状态 → 不要替他盯。
- 用户选择**保留** `marketplace-freshness.yml` 工作流（见 §4），不要擅自删。

---

## 3. 已经踩过的坑（别再犯）

| # | 坑 | 现象 | 根因 | 修法 |
|---|---|---|---|---|
| 1 | **以为「提交 issue = 上架」** | 提交了 issue，商城目录里却一直没有 | 提交 issue 只触发**预检**；真正收录靠 DSH-Store 的**定时雷达**（catalog-automation），它用 GitHub 搜索 `topic:dsh-plugin` 等**按 updated_at 倒序取前 20**，每轮最多新增 8 个 | 加 `marketplace-freshness.yml` 周期性刷新 `updated_at`（收录后自动停）。⚠️ 但仍不可靠，见 §5 |
| 2 | **上架门槛缺失** | 即使被扫到也会被自动批准拦下 | 自动批准要求：仓库 LICENSE 与清单一致、显式 `dsh.compatibility.dsh`、显式 `engines.node`。当时**没有 LICENSE**、缺这两个字段 | `1f69cd6`：加 MIT `LICENSE`；`package.json` 补 `engines.node: ">=20"` + `dsh.compatibility` |
| 3 | **构建残留被提交进仓库** | 自动重建流水线把 `.js.map` / `.d.ts.map` / `tsconfig.tsbuildinfo` 也提交了（`d3339e3`） | 流水线直接 `cp` 整个 `lib/` 再 `git add`，没过滤非白名单产物 | `7170918`：workflow 加「清理构建残留」步骤 + `.gitignore` 忽略 + 解除追踪 |
| 4 | **workflow 的 `if:` 里用 `secrets.X`** | 工作流报错 / 不生效 | GitHub Actions 不允许在 `if:` 表达式里直接引用 `secrets` | `28b0cf0`：改为在 `env:` 里引用 |
| 5 | **发布链路的坑（更早，已修）** | 见提交历史 | provenance 需要 `repository` 字段 + `id-token: write`；`.npmrc` token 要双引号；打包路径要 `npm pack`；harness 默认分支是 **`master`** 不是 `main`；tsc 拖入 harness 源码导致 rootDir 冲突 | `908d1de` / `7184e86` / `688bce8` / `bf69ed0` / `1d84975` / `1a3d92e` |

---

## 4. 当前状态（截至 2026-09-09 02:10 UTC）

**结论：尚未被 DSH-Store 收录。**

已完成：

- ✅ 提交 issue [AI-Scarlett/DSH-Store#641](https://github.com/AI-Scarlett/DSH-Store/issues/641)（OPEN），含插件路径与说明
- ✅ 仓库 public + topic `dsh-plugin`，LICENSE = MIT（GitHub API 已识别）
- ✅ `package.json` 补齐 `engines.node` + `dsh.compatibility`
- ✅ npm 已发布 `0.1.3`
- ✅ `lib/` 已提交（可 git 安装）+ 自动重建流水线
- ✅ `marketplace-freshness.yml` 每 10 分钟刷新 `updated_at`（用户选择保留）

未完成：

- ❌ `registry/catalog-index.json` 里**没有** `dsh-prompt-star`
- ❌ `registry/candidates.json` 里**没有** `MncStudio`

---

## 5. ⚠️ 当前卡点与排查（重要）

**实测发现：靠 `updated_at` 抢榜这条路竞争极其激烈。**

- `topic:dsh-plugin` 共有 **14,038** 个仓库。
- 按 `updated_at` 倒序的**前 20 名，全部在最近 ~3 分钟内更新过**（实测 02:04–02:07）。
- 我们的保鲜工作流**每 10 分钟**才刷新一次 → 雷达在某个瞬间扫描时，我们**大概率不在前 20** → 扫不到。

**所以「加保鲜工作流」只是必要条件，不是充分条件。**

### 自查命令

```bash
# 1) 是否已被收录
curl -sf https://raw.githubusercontent.com/AI-Scarlett/DSH-Store/main/registry/catalog-index.json | grep -o dsh-prompt-star
curl -sf https://raw.githubusercontent.com/AI-Scarlett/DSH-Store/main/registry/candidates.json   | grep -o MncStudio

# 2) 雷达眼里我们现在排第几
gh api -X GET search/repositories -f q='topic:dsh-plugin' -f sort=updated -f per_page=20 \
  --jq '.items[] | "\(.updated_at)  \(.full_name)"'

# 3) 仓库自身元数据
gh api repos/MncStudio/dsh-prompt-star \
  --jq '"updated=\(.updated_at) license=\(.license.spdx_id) topics=\(.topics|join(","))"'
```

### 下一步可考虑的方向（未做，供下个会话判断）

1. **提高刷新频率**：GitHub Actions `cron` 最小间隔是 **5 分钟**，可把 `*/10` 改成 `*/5`，提升进入前 20 的概率。
2. **读 DSH-Store 雷达源码确认真实发现逻辑**：不要只凭推断。`AI-Scarlett/DSH-Store` 里 catalog-automation 的实现可能有其他发现通道（手动白名单 / PR / label）。
3. **确认是否有人工 / 推荐通道**：提交 issue 的模板或 README 里可能写了「如何被收录」。
4. **可选**：给本仓库配 `DSH_STORE_TOKEN`（对 DSH-Store 有 `issues:write` 的 PAT），让 `rebuild-lib.yml` 能主动触发重固定；不配也能用，只是慢。

**动手前先跑 §5 的自查命令，确认卡在哪一步，不要盲目重试。**

---

## 6. 速查

### 工作流

| 文件 | 作用 | 触发 |
|---|---|---|
| `.github/workflows/build.yml` | CI 构建 +（可选）发布 npm | push main / tag、手动 |
| `.github/workflows/rebuild-lib.yml` | 改源码 → 重建 `lib/` → 清残留 → 有变化才提交 →（可选）重固定 DSH-Store | push 改到 `src/**`、`package.json`、`tsconfig.json`、`tsdown.config.ts`、`cordis.patch.yml`、`templates/**`；手动 |
| `.github/workflows/marketplace-freshness.yml` | 未被收录期间周期性刷新 `updated_at`；收录后自动停 | 每 10 分钟、手动 |

### 常用命令

```bash
# 手动触发重建（改了 src 后一般会自动触发，这是备用）
gh workflow run rebuild-lib.yml --repo MncStudio/dsh-prompt-star --ref main

# 看最近运行
gh run list --repo MncStudio/dsh-prompt-star --limit 5

# npm
npm view dsh-prompt-star version
```

### 关键链接

- 商城站点：https://dsh.store
- 商城仓库：`AI-Scarlett/DSH-Store`（`registry/catalog-index.json`、`registry/candidates.json`）
- 我们的提交：issue #641
- 设计文档：本仓库 `设计说明.md`

---

## 7. 待办

- [ ] 让 `dsh-prompt-star` 真正进入 DSH-Store 目录（见 §5）
- [ ] （功能）按 `设计说明.md` 继续迭代：模板库、意图精确匹配、无说明文件时引导生成 `CLAUDE.md`
