# AGENTS.md — 交接说明（给下一个 AI 会话 / 协作者）

> **读这份再动手。** 它讲清三件事：**这个项目是什么**、**用户到底要什么**、**已经踩过哪些坑**。
> 目的：下一轮工作不跑偏、不重复犯错。
>
> 文件名用 `AGENTS.md` 是刻意的——DSH 新会话会自动读取项目根目录的这类文件。
> 最后更新：2026-09-09 06:15 UTC

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

- 用户会**自己看**商城状态 → 不要替他盯、不要轮询。
- **不要创建任何自动 / 定时任务。** 2026-09-09 用户选择「全停」：脉冲作业已停止、`cron` 已删除、自我续期已移除。`marketplace-freshness.yml` 现在**只有手动 `workflow_dispatch`**。**不要擅自恢复自动触发、cron 或自我续期。**

---

## 3. 已经踩过的坑（别再犯）

| # | 坑 | 现象 | 根因 | 修法 |
|---|---|---|---|---|
| 1 | **以为「提交 issue = 上架」** | 提交了 issue，商城目录里却一直没有 | 提交 issue 只触发**预检**；真正收录靠 DSH-Store 的**定时雷达**（catalog-automation），它用 GitHub 搜索 `topic:dsh-plugin` 等**按 updated_at 倒序取前 20**，每轮最多新增 8 个 | 曾加 `marketplace-freshness.yml` 周期性刷新 `updated_at`。⚠️ 既不可靠，也已按用户要求停用，见 §5 |
| 2 | **上架门槛缺失** | 即使被扫到也会被自动批准拦下 | 自动批准要求：仓库 LICENSE 与清单一致、显式 `dsh.compatibility.dsh`、显式 `engines.node`。当时**没有 LICENSE**、缺这两个字段 | `1f69cd6`：加 MIT `LICENSE`；`package.json` 补 `engines.node: ">=20"` + `dsh.compatibility` |
| 3 | **构建残留被提交进仓库** | 自动重建流水线把 `.js.map` / `.d.ts.map` / `tsconfig.tsbuildinfo` 也提交了（`d3339e3`） | 流水线直接 `cp` 整个 `lib/` 再 `git add`，没过滤非白名单产物 | `7170918`：workflow 加「清理构建残留」步骤 + `.gitignore` 忽略 + 解除追踪 |
| 4 | **workflow 的 `if:` 里用 `secrets.X`** | 工作流报错 / 不生效 | GitHub Actions 不允许在 `if:` 表达式里直接引用 `secrets` | `28b0cf0`：改为在 `env:` 里引用 |
| 5 | **发布链路的坑（更早，已修）** | 见提交历史 | provenance 需要 `repository` 字段 + `id-token: write`；`.npmrc` token 要双引号；打包路径要 `npm pack`；harness 默认分支是 **`master`** 不是 `main`；tsc 拖入 harness 源码导致 rootDir 冲突 | `908d1de` / `7184e86` / `688bce8` / `bf69ed0` / `1d84975` / `1a3d92e` |
| 6 | **以为「刷新 `updated_at` 就能抢榜」** | 改 topics / 推非默认分支 / 推 tag 后 `updated_at` 确实变了，但搜索排名毫无变化 | 搜索 `sort=updated` 的排名信号只跟**默认分支的提交**走。实测：推 `pulse` 分支、推 tag 只更新 `pushed_at`，**不**更新 `updated_at`，排名也不动 | 只能往 **main** 提交（脉冲作业写 `pulse/timestamp.txt`） |
| 7 | **以为 cron 能驱动保鲜** | 保鲜工作流创建后 2 小时 `schedule` 事件 **0 次**；`*/5` 探针 25 分钟同样 0 次 | 本仓库的 GitHub Actions `schedule` 实测**根本不触发**；DSH-Store 自己的 cron 也实测延迟 3–4.5 小时 | 脉冲作业改为**自我续期**（用 `gh workflow run` 触发自身，需 `actions: write`），不依赖 cron |
| 8 | **以为能自己开 PR 上架** | registry/README 写「新增插件必须通过 PR 修改条目」，一度想直接开 PR | DSH-Store 近 50 个 PR **只有仓库主人和自动化机器人**，外部 PR 从无先例 | 放弃 PR 路径，回到雷达发现 |
| 9 | **脉冲提交会触发全量构建** | 每次脉冲都跑一次 build-publish（pnpm install 108M harness，很重） | build-publish 的 `push` 没有 `paths` 过滤 | `build.yml` 加 `paths-ignore: ['pulse/**']`；脉冲只改 `pulse/timestamp.txt`（tag 推送不评估路径过滤，发布不受影响） |
| 10 | **`git reset --hard` 冲掉未提交改动** | 写好的 workflow 改动被 reset 掉，提交时报 "nothing to commit" | 在推送前对含未提交改动的工作树执行了 `git reset --hard origin/main` | 推送前用 `git pull --rebase`；**不要**在有未提交改动时 `reset --hard` |
| 11 | **取消脉冲作业反而拉起一个新作业** | `gh run cancel 34308880689` 后 20 秒，立刻出现新的 `34317891151`（in_progress） | 旧的「续期」步骤带 `if: always()`，**作业被取消时也会执行**，于是又 `gh workflow run` 了一次 | 先 `gh workflow disable marketplace-freshness.yml` 掐断触发，再 `gh run cancel`；续期步骤现已删除 |

---

## 4. 当前状态（截至 2026-09-09 06:15 UTC）

**结论：尚未被 DSH-Store 收录。自动脉冲已按用户要求全部停止，现在仓库里没有任何自动 / 定时任务。**

已完成：

- ✅ 提交 issue [AI-Scarlett/DSH-Store#641](https://github.com/AI-Scarlett/DSH-Store/issues/641)（OPEN，0 评论、无标签；DSH-Store 对作者联系有严格门禁，**不要催**）
- ✅ 仓库 public + topics `dsh-plugin` **+ `deepseek-harness`**，LICENSE = MIT（GitHub API 已识别）
- ✅ `package.json` 补齐 `engines.node` + `dsh.compatibility`（`0.1.2-rc.1: compatible`，即 npm `latest`）
- ✅ npm 已发布 `0.1.3`
- ✅ `lib/` 已提交（可 git 安装）+ 自动重建流水线
- ⛔ 自动脉冲**已按用户要求停止**（2026-09-09 06:10 UTC）：正在跑的 run 已取消、`cron` 已删除、自我续期步骤已移除。`marketplace-freshness.yml` 现在**只能手动跑**（`workflow_dispatch`，输入 `minutes` 控制时长），跑完即止、不会续期

未完成：

- ❌ `registry/catalog-index.json` 里**没有** `dsh-prompt-star`
- ❌ `registry/candidates.json` 里**没有** `MncStudio/dsh-prompt-star`

---

## 5. ⚠️ 收录机制：已查清的完整真相（重要，别再重新推断）

**DSH-Store 只有一个收录通道：它的 `catalog-automation` 雷达。**

`registry/automation-policy.json` 里硬编码了 4 个 GitHub 搜索，每个都
`sort=updated&order=desc&per_page=20`（按更新时间倒序取前 20），每轮最多新增 8 个：

| 查询 | 竞争度 | 实测窗口（前 20 的时间跨度） |
|---|---|---|
| `topic:deepseek-harness` | 最低 | **~8–10 分钟** ← 我们已加此 topic |
| `topic:dsh-plugin` | 中 | ~4–5 分钟 |
| `dsh-plugin in:name,description,readme` | 高 | ~2–3 分钟 |
| `"deepseek harness" plugin in:name,description,readme` | 高 | ~2–3 分钟 |

- **没有**「提交 issue 就上架」的通道：issue 只触发**只读预检**（`plugin-submission.yml`）。
- **没有**外部 PR 通道：近 50 个 PR 全部来自仓库主人 `AI-Scarlett` 和 `app/github-actions` 机器人。
- `marketplace-watchdog.yml` 只是重试/修复雷达，不提供别的入口。
- **排名信号只跟默认分支的提交走**：改 topics / 推分支 / 推 tag 都无效（见 §3 坑 6）。

### 曾经用过、现已停用的解法（长期脉冲作业）—— 不要重新启用

**2026-09-09 用户明确选择「全停」。下面这套已经拆掉：`cron` 删除、自我续期删除、正在跑的 run 取消。**

曾经的做法（`.github/workflows/marketplace-freshness.yml`）：

- 每 **6 分钟**往 main 写一次 `pulse/timestamp.txt` 并推送 → 刷新排名信号；
- 作业跑约 **3h50m**，结束后**用 `gh workflow run` 触发自身续期**（因为本仓库 `schedule` 根本不触发，见 §3 坑 7）；
- 发现 `candidates.json` / `catalog-index.json` 出现本仓库就**立即停止**。

为什么停：代价是每天约 **180–240 个脉冲提交**，仓库历史极吵，用户不接受。

**当前状态**：工作流只剩手动 `workflow_dispatch`（输入 `minutes`，默认 60、上限 235），跑完即止。
`pulse/timestamp.txt` 和 `build.yml` 里的 `paths-ignore: ['pulse/**']` 保留（无害）。

⚠️ 取消正在跑的脉冲时要小心：旧续期步骤带 `if: always()`，**取消也会触发它重新 dispatch**
（实测发生过，见 §3 坑 11）。正确做法是先 `gh workflow disable`，再 `gh run cancel`。

### 自查命令

```bash
# 1) 是否已被收录
curl -sf https://raw.githubusercontent.com/AI-Scarlett/DSH-Store/main/registry/catalog-index.json | grep -o dsh-prompt-star
curl -sf https://raw.githubusercontent.com/AI-Scarlett/DSH-Store/main/registry/candidates.json   | grep -o 'MncStudio/dsh-prompt-star'

# 2) 雷达眼里我们现在排第几（4 个查询都要看）
for q in 'topic:deepseek-harness' 'topic:dsh-plugin'; do
  echo -n "$q → "
  gh api -X GET "search/repositories?q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")&sort=updated&order=desc&per_page=20" \
    --jq '[.items[].full_name] | index("MncStudio/dsh-prompt-star") // "不在前20"'
done

# 3) 确认没有任何作业在跑（应为空；脉冲已停用）
gh run list --repo MncStudio/dsh-prompt-star --limit 10 --json databaseId,name,status,event \
  --jq '.[] | select(.status != "completed") | "\(.databaseId) \(.name) [\(.event)]"'

# 3b) 确认工作流没有任何自动触发器（不应出现 cron / schedule）
grep -rn 'cron\|schedule:' .github/workflows/ || echo "无 cron，OK"

# 4) 雷达上次/下次运行
gh run list --repo AI-Scarlett/DSH-Store --workflow catalog-automation.yml --limit 5
```

### 如果长时间仍未被收录

1. 确认我们是否在某个查询的前 20（上面第 2 条）。**脉冲已停用，所以大概率不在前 20 —— 这是预期结果，不是故障。**
2. 雷达本身可能很久不跑（实测延迟 3–4.5 小时，甚至更久），**不要在雷达没跑的情况下就判定失败**。
3. **不要擅自重启脉冲、加回 cron 或恢复自我续期。** 想换方案先问用户。可选方向：
   - 用**一次性、少量**的推送代替持续脉冲；
   - 再去 DSH-Store 仓库 / issue 里确认是否存在**人工收录通道**（目前结论是没有，但可复核）。
4. 只有用户明确同意后，才参考上面「曾经用过、现已停用的解法」重建（并提醒它每 6 分钟一次提交）。

---

## 6. 速查

### 工作流

| 文件 | 作用 | 触发 |
|---|---|---|
| `.github/workflows/build.yml` | CI 构建 +（可选）发布 npm | push main / tag、手动 |
| `.github/workflows/rebuild-lib.yml` | 改源码 → 重建 `lib/` → 清残留 → 有变化才提交 →（可选）重固定 DSH-Store | push 改到 `src/**`、`package.json`、`tsconfig.json`、`tsdown.config.ts`、`cordis.patch.yml`、`templates/**`；手动 |
| `.github/workflows/marketplace-freshness.yml` | **手动**脉冲工具，**无任何自动触发**：跑 `minutes` 分钟（默认 60、上限 235），每 6 分钟往 main 推一次 `pulse/timestamp.txt`；跑完即止、不续期 | 仅手动 `workflow_dispatch` |

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
