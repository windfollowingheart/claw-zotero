import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { zoteroPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(zoteroPlugin);
