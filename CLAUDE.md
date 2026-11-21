# dsh-purge 本机维护记忆库

> 这是本机 fork 的维护记录。上游文档以 `AGENTS.md` 与 `docs/` 为准；
> **本文件记录的是本机特有的验证结论与操作约定，不要写回上游文档**。
> `AGENTS.md` 受 `npm run check:docs` 版本一致性校验，改动需与 `package.json` 同步。

## 一、版本基线

- 当前源码：`1.7.20`
- 上游仓库：`kingcharleslzy-ai/dsh-purge`（**不走 npm 发布**，`dsh-purge-community` 在 registry 上是 404）
- 发布通道：GitHub Release 的 tgz + 完整 SHA 校验

### 升级方式（本机实际路径）

profile 是 `file:` 指向本地打包的 tgz，**不会自动跟随源码**。改完源码必须三步：

```
npm run build:client        # 面板源码改动后必须重建（packages/purge-panel → client.js）
npm pack --ignore-scripts   # 生成 dsh-purge-community-<version>.tgz
dsh plugin --profile web add file:<绝对路径>/dsh-purge-community-<version>.tgz
```

`npm run check:client` 会校验 `client.js` 与面板源码是否一致，提交前应通过。

## 二、本机额外的兼容声明

上游 manifest 只有 `engines: {node: ">=18"}`，且 `dsh.compatibility.dshReleases` 只列到 rc.3。
本机补了两处（合并上游时需确认仍存活）：

- `engines.dsh: ">=0.2.2-rc.1 <0.3.0-0"` —— 让宿主闸门有显式契约
- `lib/community.js` 的 `QUALIFIED_HOST_VERSIONS` 追加 rc.4 / rc.5

> 注意：`dsh.compatibility` / `dshReleases` **不参与运行时判定**。宿主只读
> `engines.dsh` 或 `@deepseek-ai/dsh*` 前缀的 peer，该块纯属文档性质。

## 三、补丁体系的正确判读方式

它不是运行时猴补，而是**磁盘源码文本改写**：替换官方包 `lib/index.js` 里的字面文本。
所以可用性完全取决于锚点是否匹配当前宿主版本。

**用插件自己的函数判定，不要自己写匹配脚本**：

```js
import { patchStatusDetail } from './lib/core.js';
const r = await patchStatusDetail(aiBase, undefined, { dshHome, surface: 'web' });
```

状态语义：

| 状态 | 含义 | 是否健康 |
| --- | --- | --- |
| `pending` | 锚点仍在、等待应用 | ✅ 健康 |
| `applied` | 已写入磁盘 | ✅ |
| `drifted` | **锚点失效** | ⚠️ 需处理 |
| `na` | 当前 surface/布局不适用 | ✅ 正确跳过 |
| `skipped` | 找不到属于正确状态 | ✅ |

**易误判点**：`pending` 不是失败。`filePatchOutcome` 的顺序是
`applied → pending(还有活没干完) → drifted(锚点全不中)`，所以 62 条 pending
恰恰证明锚点还活着。

## 四、本机实测结论

rc.5 宿主上跑 `patchStatusDetail`（88 条补丁）：

```
pending 62 | applied 7 | disabled 2 | na 13 | not_needed 1 | skipped 2 | drifted 1
```

- **唯一 drifted 是 #88**：`optional: true` + `chainedAfter: 87`，依赖 #87 先落地，
  属级联设计内，不是失效
- 测试套件：752 项 / 719 通过 / 2 失败 / 31 跳过
- 那 2 个失败是**环境缺 `openssl.exe`**（`bootstrap-curl` 需要它生成证书），与代码无关

## 五、升级后必查

1. `npm run check:client` 必须 PASS（防止 client.js 与面板源码脱节）
2. `patchStatusDetail` 的 drifted 数量不应上升
3. 真实启动：stderr 不应出现 `skipping profile bundle` / `disabling profile plugin`
4. 面板左侧栏 `Purge` 可点开、6 个 Tab 都在

## 六、踩过的坑

- **`packages/purge-panel` 有独立的 `package.json`**：构建面板前需先在该目录
  `npm install`（缺 `esbuild` 会报 `ERR_MODULE_NOT_FOUND`）。
- **`npm ci` 在该目录失败**：没有提交 lockfile 时只能 `npm install`。
- **只改 `lib/` 不重建 `client.js`** → 面板仍跑旧逻辑且 `check:client` 会失败。
