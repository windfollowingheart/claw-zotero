import type { PluginRuntime } from "openclaw/plugin-sdk/core";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

const { setRuntime: setZoteroRuntime, getRuntime: getZoteroRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "zotero",
    errorMessage: "Zotero runtime not initialized",
  });

export { getZoteroRuntime, setZoteroRuntime };
