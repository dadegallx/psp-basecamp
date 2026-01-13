import "server-only";

import { sanitizeText } from "./utils";

// In-memory storage for Slack thread mappings
// This persists for the lifetime of the serverless function
const slackThreads = new Map<string, string>();

// Types
interface SlackPostMessageResponse {
  ok: boolean;
  ts?: string;
  error?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string }>;
  fields?: Array<{ type: string; text: string }>;
}

// Environment check
function isSlackEnabled(): boolean {
  return (
    process.env.SLACK_ENABLED === "true" &&
    Boolean(process.env.SLACK_BOT_TOKEN) &&
    Boolean(process.env.SLACK_CHANNEL_ID)
  );
}

// Build Slack Block Kit message for user message
function buildUserMessageBlocks(
  userText: string,
  chatId: string,
  messageId: string
): SlackBlock[] {
  const text =
    userText.length > 2900
      ? `${userText.slice(0, 2900)}... _(truncated)_`
      : userText || "_Empty message_";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*User:* ${text}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Chat: \`${chatId.slice(0, 8)}\` | Msg: \`${messageId.slice(0, 8)}\``,
        },
      ],
    },
  ];
}

// Build blocks for a single text part
function buildTextBlocks(text: string, isFirst: boolean): SlackBlock[] {
  const sanitized = sanitizeText(text);
  const truncated =
    sanitized.length > 2900
      ? `${sanitized.slice(0, 2900)}... _(truncated)_`
      : sanitized;

  const prefix = isFirst ? "*Assistant:* " : "";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${prefix}${truncated}`,
      },
    },
  ];
}

// Build blocks for a tool call
function buildToolCallBlocks(
  toolName: string,
  toolCallPart: Record<string, unknown>
): SlackBlock[] {
  const fullJson = JSON.stringify(toolCallPart, null, 2);
  const truncated =
    fullJson.length > 1000
      ? `${fullJson.slice(0, 1000)}...\n_(truncated)_`
      : fullJson;

  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Tool:* \`${toolName}\``,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\`json\n${truncated}\n\`\`\``,
      },
    },
  ];
}

// Post message to Slack
async function postToSlack(
  blocks: SlackBlock[],
  threadTs?: string
): Promise<SlackPostMessageResponse | null> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    return null;
  }

  try {
    const body: Record<string, unknown> = {
      channel: channelId,
      blocks,
      unfurl_links: false,
      unfurl_media: false,
    };

    if (threadTs) {
      body.thread_ts = threadTs;
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as SlackPostMessageResponse;

    if (!data.ok) {
      console.warn("[Slack] API error:", data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("[Slack] Failed to post:", error);
    return null;
  }
}

// Main export: Log user message to Slack
export async function logUserMessageToSlack({
  chatId,
  userText,
  messageId,
}: {
  chatId: string;
  userText: string;
  messageId: string;
}): Promise<void> {
  if (!isSlackEnabled()) {
    return;
  }

  try {
    const existingThreadTs = slackThreads.get(chatId);
    const blocks = buildUserMessageBlocks(userText, chatId, messageId);
    const response = await postToSlack(blocks, existingThreadTs);

    // If this is the first message (no existing thread), save the thread mapping
    if (!existingThreadTs && response?.ts) {
      slackThreads.set(chatId, response.ts);
    }
  } catch (error) {
    console.warn("[Slack] User message logging failed:", error);
  }
}

// Main export: Log assistant response to Slack
export async function logAssistantResponseToSlack({
  chatId,
  parts,
}: {
  chatId: string;
  parts: unknown[];
}): Promise<void> {
  if (!isSlackEnabled()) {
    return;
  }

  try {
    const threadTs = slackThreads.get(chatId);

    if (!threadTs) {
      return;
    }

    let isFirstText = true;

    for (const part of parts) {
      if (typeof part !== "object" || part === null || !("type" in part)) {
        continue;
      }

      const typedPart = part as {
        type: string;
        text?: string;
        toolName?: string;
        result?: unknown;
      };

      if (typedPart.type === "text" && typedPart.text) {
        const blocks = buildTextBlocks(typedPart.text, isFirstText);
        await postToSlack(blocks, threadTs);
        isFirstText = false;
      } else if (
        typedPart.type.startsWith("tool-") &&
        typedPart.type !== "tool-invocation"
      ) {
        const toolName = typedPart.type.replace("tool-", "");
        const blocks = buildToolCallBlocks(
          toolName,
          part as Record<string, unknown>
        );
        await postToSlack(blocks, threadTs);
      }
    }
  } catch (error) {
    console.warn("[Slack] Assistant response logging failed:", error);
  }
}


