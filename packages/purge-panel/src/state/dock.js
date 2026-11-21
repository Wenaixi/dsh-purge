import { apiUrl } from "../api/client.js";
// UI derived from YuJunZhiXue/dsh-purge 1.1.71 (MIT). See LICENSE.
import { useState, useEffect } from "../shared/react.js";
import { __dshPurgeDrill } from "../vendor/drill.js";

/**
 * 试炼场不再有首次使用授权闸门：本 fork 已移除免责声明页、三重勾选与
 * 本地授权落盘。保留同名函数只是为了让既有调用点无需改写。
 */
export function readDrillAuth() {
  return true;
}

export let dockBus = {
  open: false,
  tab: "clean",
  pending: "tab",
  listeners: new Set(),
};

export function setDock(patch) {
  dockBus = Object.assign({}, dockBus, patch);
  if (patch.open && nativeSidebar) {
    try {
      nativeSidebar.openTab("dsh-purge");
    } catch {}
  }
  dockBus.listeners.forEach((fn) => {
    try {
      fn(dockBus);
    } catch {
      /* ignore */
    }
  });
}

export function useDock() {
  const [st, setSt] = useState(dockBus);
  useEffect(() => {
    const fn = (next) => setSt(next);
    dockBus.listeners.add(fn);
    return () => {
      dockBus.listeners.delete(fn);
    };
  }, []);
  return st;
}

export function requestDrill(kind) {
  const pending = kind || "tab";
  const openEnv = () => {
    try {
      if (__dshPurgeDrill && __dshPurgeDrill.setUI) {
        __dshPurgeDrill.setUI({ open: true, tab: "env" });
      }
    } catch {
      /* ignore */
    }
  };
  {
    setDock({ open: true, tab: "drill", pending: "tab" });
    try {
      if (__dshPurgeDrill && __dshPurgeDrill.setUI)
        __dshPurgeDrill.setUI({ open: true });
    } catch {
      /* ignore */
    }
    if (pending === "env") openEnv();
    if (pending === "full") {
      try {
        window.open(
          window.location.href.split("#")[0] + "#redteam-full",
          "_blank",
          "noopener",
        );
      } catch {
        /* ignore */
      }
    }
    return;
  }
}

/* Original requestDrillEnv(): open the drill console straight on the Env tab. */
export function requestDrillEnv() {
  requestDrill("env");
}

export let nativeSidebar = null;

export function setNativeSidebar(sidebar) {
  nativeSidebar = sidebar;
}

export function clearNativeSidebar(sidebar) {
  if (nativeSidebar === sidebar) nativeSidebar = null;
}
