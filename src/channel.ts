import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  setAccountEnabledInConfigSection,
  deleteAccountFromConfigSection,
  formatPairingApproveHint,
  normalizeAccountId,
  type ChannelPlugin,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/core";
import { describeAccountSnapshot } from "openclaw/plugin-sdk/account-core";
import type {
  ChannelStatusIssue,
  ChannelAccountSnapshot,
} from "openclaw/plugin-sdk/channel-contract";
import { zoteroApi } from "./client.js"; // your platform API client

type ResolvedAccount = {
  accountId: string | null;
  token: string;
  allowFrom: string[];
  dmPolicy: string | undefined;
  tokenSource: "config" | "none";
};

function resolveAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedAccount {
  const section = (cfg.channels as Record<string, any>)?.["zotero"];
  const token = section?.token?.trim() ?? "";
  return {
    accountId: accountId ?? null,
    token,
    allowFrom: section?.allowFrom ?? [],
    dmPolicy: section?.dmSecurity,
    tokenSource: token ? "config" : "none",
  };
}

const meta = {
  id: "zotero",
  label: "Zotero Chat",
  selectionLabel: "Zotero Chat",
  detailLabel: "Zotero Chat",
  docsPath: `/channels/zotero`,
  docsLabel: "zotero",
  blurb: "Zotero Chat",
  systemImage: "message.fill",
  aliases: ["zotero"],
};

export const zoteroPlugin: ChannelPlugin<ResolvedAccount> = {
  id: "zotero",
  meta,
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: false,
    blockStreaming: true, // 钉钉不支持流式消息
  },
  commands: {
    enforceOwnerForCommands: true,
  },

  reload: { configPrefixes: ["channels.zotero"] },
  config: {
    listAccountIds: (cfg) => {
      return [DEFAULT_ACCOUNT_ID];
    },
    resolveAccount: (cfg, accountId) => resolveAccount(cfg, accountId),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "zotero",
        accountId: accountId ?? DEFAULT_ACCOUNT_ID,
        enabled,
        allowTopLevel: true,
      }),
    isConfigured: (account) => Boolean(account.token?.trim()),
    describeAccount: (account) =>
      describeAccountSnapshot({
        account,
        configured: Boolean(account.token?.trim()),
        extra: {
          tokenSource: account.tokenSource,
        },
      }),
  },

  outbound: {
    deliveryMode: "direct",
    sendText: async (params) => {
      const result = await zoteroApi.sendMessage(params.to, params.text);
      return { channel: meta.id, messageId: "" };
    },
  },
};
