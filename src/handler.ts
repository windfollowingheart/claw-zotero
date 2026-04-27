import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
import { getZoteroRuntime } from "./runtime.js";
import { zoteroApi } from "./client.js";

export type ZoteroWebhookEvent = {
  type: "message";
  data: {
    senderId: string;
    senderName?: string;
    chatId: string;
    chatType: "direct" | "group";
    messageId: string;
    content: string;
    timestamp?: number;
  };
};

export async function handleZoteroWebhookMessage(params: {
  cfg: OpenClawConfig;
  event: ZoteroWebhookEvent;
  runtime?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}): Promise<void> {
  const { cfg, event, runtime } = params;

  const log = runtime?.log ?? console.log;
  const error = runtime?.error ?? console.error;

  if (event.type !== "message") {
    log(`zotero: ignoring non-message event type=${event.type}`);
    return;
  }

  const {
    senderId,
    senderName,
    chatId,
    chatType,
    messageId,
    content,
    timestamp,
  } = event.data;

  if (!senderId || !chatId || !messageId || !content) {
    error(`zotero: missing required fields in webhook event`);
    return;
  }

  const core = getZoteroRuntime();

  // Resolve agent route
  const route = core.channel.routing.resolveAgentRoute({
    cfg,
    channel: "zotero",
    accountId: null,
    peer: {
      kind: chatType === "group" ? "group" : "direct",
      id: chatType === "group" ? chatId : senderId,
    },
    parentPeer: null,
  });

  log(
    `zotero: route resolved sessionKey=${route.sessionKey} agentId=${route.agentId}`,
  );

  // Build message body envelope
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(cfg);
  const from = chatType === "group" ? `${chatId}:${senderId}` : senderId;
  const to = chatType === "group" ? `chat:${chatId}` : `user:${senderId}`;

  const body = core.channel.reply.formatAgentEnvelope({
    channel: "zotero",
    from,
    timestamp: new Date(timestamp ?? Date.now()),
    body: content,
    envelope: envelopeOptions,
  });

  // Create inbound context
  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    RawBody: content,
    CommandBody: content,
    BodyForAgent: content,
    From: `zotero:${senderId}`,
    To: to,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: chatType,
    SenderName: senderName ?? senderId,
    SenderId: senderId,
    Provider: "zotero",
    Surface: "zotero",
    MessageSid: messageId,
    Timestamp: timestamp ?? Date.now(),
    WasMentioned: false,
    OriginatingChannel: "zotero",
    OriginatingTo: to,
  });

  // Create reply dispatcher
  const dispatcher = {
    sendToolResult: () => false,
    sendBlockReply: (payload: { text?: string }) => {
      log(`zotero: block reply: ${payload.text?.slice(0, 100)}`);
      return false;
    },
    sendFinalReply: async (payload: { text?: string }) => {
      log(`zotero: final reply: ${payload.text?.slice(0, 100)}`);
      // 发送消息到Zotero平台
      if (payload.text) {
        try {
          const result = await zoteroApi.sendMessage(to, payload.text);
          log(`zotero: message sent id=${result.id}`);
        } catch (err) {
          error(`zotero: failed to send message: ${err}`);
        }
      }
      return true;
    },
    waitForIdle: async () => {},
    getQueuedCounts: () => ({ tool: 0, block: 0, final: 0 }),
    getFailedCounts: () => ({ tool: 0, block: 0, final: 0 }),
    markComplete: () => {},
  };

  log(`zotero: dispatching to agent session=${route.sessionKey}`);

  await core.channel.reply.withReplyDispatcher({
    dispatcher,
    run: () =>
      core.channel.reply.dispatchReplyFromConfig({
        ctx: ctxPayload,
        cfg,
        dispatcher,
      }),
  });

  log(`zotero: dispatch complete for message ${messageId}`);
}
