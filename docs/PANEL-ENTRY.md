# UI 入口结构（Panel Entry）

## 一、只有一个入口：插件卡片

dsh-purge 的界面现在是**单一入口**——从宿主的「插件」页点开 `dsh-purge-community`
这一项，卡片正文就是完整面板。

### 为什么能这样

宿主的插件详情页在渲染 `plugins.bundle.config` 槽位时，传的是 **`view: "page"`**
（见 `@deepseek-ai/dsh-client-ui-plugin-manager` 的 `PackageDetail`：
`renderSlot('plugins.bundle.config', { view: 'page', form }, { entryKey: pkg.name })`）。

也就是说这个槽位的容器**本来就是整页**，不是窄卡片。`DetailSettings` 收到
`view === 'page'` 时直接渲染完整 `PurgePage`（6 个页签 + 试炼场），
收到 `view === 'summary'` 时才返回一行摘要文本。

### 已移除的两个入口

| 槽位 | 原来是什么 | 为什么删 |
| --- | --- | --- |
| `sidebar.panellist` | 左侧栏的 Purge 图标 | 与插件卡片是同一份面板的重复入口，用户不知道该点哪个 |
| `main` | 点图标后的整页 | 同上 |

删掉后 `PurgeGlyphIcon` 与 `sidebar-glyph.png` 的导入随之变孤儿，一并删除。

### 保留的其它挂载点

| 槽位 | 作用 |
| --- | --- |
| `plugins.bundle.config` | **主入口**：插件详情页正文 |
| `plugins.row.config` | 插件列表行里的摘要 |
| `shell.overlay` | 浮层：欢迎提示、红队环境适配闸门、授权弹窗 |
| `conversation.input.right` | 输入框右侧的回退按钮（`/rewind once` / `round`） |

## 二、面板内部结构

`PurgePage` 横向分 6 个页签，全部保留：

| 页签 | 内容 |
| --- | --- |
| 状态 | 宿主兼容、补丁进度、破甲自检 |
| 提示词 | 注入正文（`prompt-inject.md`）与破甲强化段 |
| 规则 | 规则集管理（写入 `AGENTS.md` / `CLAUDE.md`） |
| 技能 | 用户技能目录（`$DSH_HOME/skills`） |
| **试炼场** | 红队演练台：10 个子页签（资产测绘 / 环境适配 / 智能体 / 会话隧道 / 漏洞战果 / 攻击链 / 得分目标 / 报告 / 知识库 / 技能库） |
| 更多 | 会话外观（`RewindSetting`）与服务器设置 |

## 三、构建链路

面板产物有**一条唯一真源**：

```
packages/purge-panel/src/    （React 工程，esbuild）
  → packages/purge-panel/scripts/build.mjs
  → 根 client.js
```

`npm run build:client` 重建，`npm run check:client` 校验
`client.js` 与源码是否一致（CI 用 `--check`，stale 时抛错）。

**注意**：`lib/redteam/client.js`（4218 行）是**历史遗留的第二条链**，
`scripts/build-client.mjs` 靠字符串锚点从中抽工厂片段。根 `client.js` 里
`__DSH_PURGE_DRILL_BEGIN__` 命中 0 次，说明这条链已停用/寄生。
**不要试图拆它**：零净减，且会让锚点定位抛 `cannot find ModuleLoader factory`。

## 四、改 UI 后的验收

1. `npm run build:client` —— 必须成功
2. `npm run check:client` —— 必须 PASS（产物与源码一致）
3. 真启动 web profile，点开插件卡片，确认 6 个页签都在、试炼场的 10 个子页签都能打开
4. 确认左侧栏**不再出现** Purge 图标

## 五、试炼场授权闸门已移除

本 fork **彻底删除**了试炼场的首次使用授权流程。原实现包含四层：

| 层 | 原文件 | 原作用 |
| --- | --- | --- |
| 法律声明文案 | `components/auth.js` 的 `AUTH_LEGAL_HTML` | 约 9.9K 字符，逐条列举刑法 285/286/287、网络安全法、数据安全法、个保法 |
| 强制阅读流程 | 同上 `AuthGate` | 10 秒倒计时 + 滚动到底 + 三重勾选 |
| 本地授权落盘 | `lib/drill-grant.js` | 写 `$DSH_HOME/dsh-purge/drill-grant.json` |
| 授权检查点 | `page.js` / `env-gate.js` / `dock.js` | 未授权则拦截试炼场与环境适配发送 |

现在：**点开试炼场即可使用**，`EnvAdaptSendGate` 直接弹出精简的环境适配窗。

### 移除清单（供后续维护对照）

- 删除文件：`packages/purge-panel/src/components/auth.js`、`lib/drill-grant.js`
- 删除 HTTP 路由：`/dsh-purge/drill-grant`（GET 读 / POST 写）
- 删除 `lib/uninstall.js` 里的 `clearDrillGrant` 调用与 `drillGrantCleared` 字段
- `dock.js`：整段授权状态机（`AUTH_KEY`、`drillGrantGen`、`drillGrantPosting`、
  `drillGrantState`、`drillSyncRetryTimer`、`writeDrillAuth`、`startGrantSync`、
  `syncDrillGrant`）全部移除；`readDrillAuth()` 保留为恒返回 `true` 的 stub，
  让既有调用点无需改写
- `dockBus` 的 `authOpen` 字段删除
- `entry.js`：移除 `AuthGate` 渲染与 `startGrantSync` 注册

### 注意

前端产物 `client.js` 从 707.5 KB 降到 676.0 KB（−31.5 KB）。
`npm run check:client` 必须 PASS（产物与源码一致）。
