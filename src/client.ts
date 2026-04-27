import { homedir } from "node:os";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".openclaw-zotero-channel", "config.json");
const DEFAULT_SERVER_URL = "http://localhost:8080";

interface Config {
  ZOTERO_SERVER_URL?: string;
}

let cachedServerUrl: string | null = null;

function getServerUrl(): string {
  if (cachedServerUrl) {
    return cachedServerUrl;
  }

  // 优先从环境变量读取
  if (process.env.ZOTERO_SERVER_URL) {
    cachedServerUrl = process.env.ZOTERO_SERVER_URL;
    return cachedServerUrl;
  }

  // 从配置文件读取
  if (existsSync(CONFIG_PATH)) {
    try {
      const content = readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(content) as Config;
      if (config.ZOTERO_SERVER_URL) {
        cachedServerUrl = config.ZOTERO_SERVER_URL;
        console.log("[zotero] 从配置文件加载服务器URL:", cachedServerUrl);
        return cachedServerUrl;
      }
    } catch (err) {
      console.error("[zotero] 读取配置文件失败:", err);
    }
  }

  cachedServerUrl = DEFAULT_SERVER_URL;
  console.log("[zotero] 使用默认服务器URL:", cachedServerUrl);
  return cachedServerUrl;
}

export interface ZoteroApi {
  sendDm(conversationId: string, content: string): Promise<void>;
  sendMessage(to: string, text: string): Promise<{ id: string }>;
  sendFile(to: string, filePath: string): Promise<void>;
}

interface SendResponse {
  success: boolean;
  message_id: string;
  timestamp: number;
}

class ZoteroClient implements ZoteroApi {
  async sendDm(conversationId: string, content: string): Promise<void> {
    await this.sendMessage(conversationId, content);
  }

  async sendMessage(to: string, text: string): Promise<{ id: string }> {
    console.log("[zotero] 发送消息 to:", to, "text:", text.slice(0, 100));

    const serverUrl = getServerUrl();
    console.log("[zotero] 服务器URL:", serverUrl);

    try {
      const response = await fetch(`${serverUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          text,
          channel: "claw-zotero",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[zotero] 发送Zotero失败:", response.status, error);
        return { id: "" };
      }

      const data = (await response.json()) as SendResponse;
      console.log("[zotero] 发送成功 message_id:", data.message_id);
      return { id: data.message_id };
    } catch (err) {
      console.error("[zotero] 发送Zotero异常:", err);
      return { id: "" };
    }
  }

  async sendFile(to: string, filePath: string): Promise<void> {
    console.log("[zotero] 发送文件 to:", to, "file:", filePath);

    // TODO: 实现文件上传
    // 可以通过multipart/form-data上传到 /send-file 端点
  }
}

export const zoteroApi = new ZoteroClient();
