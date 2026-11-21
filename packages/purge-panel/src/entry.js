// UI derived from YuJunZhiXue/dsh-purge 1.1.71 (MIT). See LICENSE.
import { h, react } from "./shared/react.js";
import { PURGE_CSS } from "./styles/index.js";
import { useDock } from "./state/dock.js";
import { NS, setTranslate, zh, en } from "./shared/locale.js";
import { PurgePage } from "./components/page.js";
// Sidebar rows are single-colour icons that follow the label colour, so the row
// gets the package artwork's outline as a mask over currentColor: same shield and
// bolt, no colour of its own, nothing redrawn. esbuild inlines the 64x64 alpha
// because the client bundle has no file server to point at.
import { bindSessionContext } from "./state/session-context.js";
import { bindPresetMenu } from "./state/preset-menu.js";
import { installLegacyVisibility } from "./state/legacy-visibility.js";
import { installRewindUi } from "./components/rewind.js";
import { WelcomeNotice } from "./components/welcome.js";
import { EnvAdaptSendGate } from "./components/env-gate.js";

export const name = __COMMUNITY__ ? "dsh-purge-community" : "dsh-purge-panel";

export const inject = ["slots", "locale"];

export function PurgeIcon({ size = 20 } = {}) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      "aria-hidden": true,
    },
    h("path", { d: "M4 7h16M4 17h16" }),
    h("circle", { cx: 9, cy: 7, r: 3, fill: "none" }),
    h("circle", { cx: 15, cy: 17, r: 3, fill: "none" }),
  );
}

// The host also renders the row contribution as a compact list item.
function DetailSettings({ view } = {}) {
  if (view === "summary")
    return h("span", null, "Purge · " + __PANEL_VERSION__);
  return h("div", { className: "dshpp-detail-settings" }, h(PurgePage));
}

export function PanelOverlays() {
  const st = useDock();
  return h(
    react.Fragment,
    null,
    h("style", null, PURGE_CSS),
    // Restored from 1.1.71 apply(): shell.overlay carried the welcome notice
    // and the red-team environment gate next to the dock.
    h(WelcomeNotice, {
      repo: __COMMUNITY__
        ? "https://github.com/kingcharleslzy-ai/dsh-purge"
        : undefined,
    }),
    h(EnvAdaptSendGate),
  );
}

export function apply(ctx) {
  ctx.effect(() => installLegacyVisibility(), "panel legacy visibility");
  ctx.inject(["sessions", "uiWorkspace"], (host) => {
    host.effect(() => bindSessionContext(host), "panel session context");
  });
  ctx.inject(["remote", "remote.agentPresets"], (host) =>
    host.effect(
      () => bindPresetMenu(document, () => host.remote.agentPresets.list()),
      "preset menu aliases",
    ),
  );
  // Restored from 1.1.71 apply(): conversation.input.right rewind button.
  ctx.inject(["sessions", "uiWorkspace", "conversation"], (host) =>
    installRewindUi(host),
  );
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "panel locale");
  const t = ctx.locale.bind(NS);
  setTranslate(t);
  ctx.slots.inject("shell.overlay", () =>
    ctx.slots.register(
      {
        name: "shell.overlay",
        id: "dsh-purge-panel-overlays",
        order: 60,
      },
      PanelOverlays,
    ),
  );
  // 只保留插件卡片入口：宿主的插件详情页本就以 view:"page" 渲染
  // plugins.bundle.config，DetailSettings 在那里直接渲染完整 PurgePage。
  // 左侧栏图标（sidebar.panellist）与 main 整页因此不再注册——两处入口会让
  // 同一份面板既出现在侧栏又出现在插件页，用户不知道该点哪个。
  ctx.slots.inject("plugins.bundle.config", () =>
    ctx.slots.register(
      {
        name: "plugins.bundle.config",
        key: __COMMUNITY__ ? "dsh-purge-community" : "dsh-purge-panel",
        inject: () => ({ t }),
      },
      DetailSettings,
    ),
  );
  ctx.slots.inject("plugins.row.config", () =>
    ctx.slots.register(
      {
        name: "plugins.row.config",
        key: name + "#" + (__COMMUNITY__ ? "dsh-purge" : "dsh-purge-panel"),
        inject: () => ({ t }),
      },
      DetailSettings,
    ),
  );
}
