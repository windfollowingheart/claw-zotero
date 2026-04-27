import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { zoteroPlugin } from "./src/channel.js";
import { setZoteroRuntime } from "./src/runtime.js";
import {
  handleZoteroWebhookMessage,
  type ZoteroWebhookEvent,
} from "./src/handler.js";

console.log("[DEBUG] 加载Zotero插件");

export default defineChannelPluginEntry({
  id: "claw-zotero",
  name: "Claw Zotero",
  description: "Zotero channel plugin",
  plugin: zoteroPlugin,
  setRuntime: setZoteroRuntime,
  registerFull(api) {
    api.registerHttpRoute({
      path: "/zotero/webhook",
      auth: "plugin",
      handler: async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return true;
        }

        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        console.log("[zotero] webhook received:", body);
        try {
          const data = JSON.parse(body) as ZoteroWebhookEvent;

          // 处理webhook消息，发送给openclaw agent
          const cfg = api.runtime.config.loadConfig();
          await handleZoteroWebhookMessage({
            cfg,
            event: data,
            runtime: {
              log: (...args) => console.log("[zotero]", ...args),
              error: (...args) => console.error("[zotero]", ...args),
            },
          });

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true }));
          return true;
        } catch (err) {
          console.error("[zotero] webhook error:", err);
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Invalid JSON or processing error" }),
          );
          return true;
        }
      },
    });
  },
});
