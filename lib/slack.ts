import "server-only";

import { isProductionEnvironment } from "./constants";
import { getSlackThreadByChatId, saveSlackThread } from "./db/queries";
import { sanitizeText } from "./utils";

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
    isProductionEnvironment &&
    Boolean(process.env.SLACK_BOT_TOKEN) &&
    Boolean(process.env.SLACK_CHANNEL_ID)
  );
}

// Build Slack Block Kit message for user message
function buildUserMessageBlocks(
  userText: string,
  chatId: string,
  userId: string
): SlackBlock[] {
  const text = userText.length > 2900
    ? `${userText.slice(0, 2900)}... _(truncated)_`
    : userText || "_Empty message_";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🧑 ${text}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `\`${chatId.slice(0, 8)}\` · \`${userId.slice(0, 8)}\``,
        },
      ],
    },
  ];
}

// Build blocks for a single text part
function buildTextBlocks(text: string, isFirst: boolean): SlackBlock[] {
  const sanitized = sanitizeText(text);
  const truncated = sanitized.length > 2900
    ? `${sanitized.slice(0, 2900)}... _(truncated)_`
    : sanitized;

  // Only first text part gets the robot emoji
  const prefix = isFirst ? "🤖 " : "";

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

// Build blocks for a tool result
function buildToolBlocks(toolName: string, result: string): SlackBlock[] {
  const truncated = result.length > 500 ? `${result.slice(0, 500)}...` : result;

  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🔧 *${toolName}*`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\`${truncated}\`\`\``,
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
      console.warn("Slack API error:", data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Failed to post to Slack:", error);
    return null;
  }
}

// Main export: Log user message to Slack
export async function logUserMessageToSlack({
  chatId,
  userId,
  userText,
}: {
  chatId: string;
  userId: string;
  userText: string;
}): Promise<void> {
  if (!isSlackEnabled()) {
    return;
  }

  try {
    const channelId = process.env.SLACK_CHANNEL_ID!;

    // Check if thread already exists for this chat
    const existingThread = await getSlackThreadByChatId({ chatId });

    const blocks = buildUserMessageBlocks(userText, chatId, userId);
    const response = await postToSlack(blocks, existingThread?.threadTs);

    // If this is the first message (no existing thread), save the thread mapping
    if (!existingThread && response?.ts) {
      await saveSlackThread({
        chatId,
        threadTs: response.ts,
        channelId,
      });
    }
  } catch (error) {
    // Fail silently
    console.warn("Slack user message logging failed:", error);
  }
}

// Main export: Log assistant response to Slack
// Posts each part (text, tool result) as a separate message in order
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
    // Get the thread for this chat
    const existingThread = await getSlackThreadByChatId({ chatId });

    if (!existingThread) {
      console.warn("No Slack thread found for chat:", chatId);
      return;
    }

    let isFirstText = true;

    // Iterate through parts in order and post each separately
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
        await postToSlack(blocks, existingThread.threadTs);
        isFirstText = false;
      } else if (typedPart.type === "tool-invocation" && typedPart.toolName && typedPart.result !== undefined) {
        // Format result as string
        const resultStr = typeof typedPart.result === "string"
          ? typedPart.result
          : JSON.stringify(typedPart.result, null, 2);
        const blocks = buildToolBlocks(typedPart.toolName, resultStr);
        await postToSlack(blocks, existingThread.threadTs);
      }
    }
  } catch (error) {
    console.warn("Slack assistant response logging failed:", error);
  }
}

// ============================================
// Test-only exports (bypass production check)
// ============================================

export interface SlackTestResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

// Test helper: Post user message directly (returns response)
export async function testPostUserMessage({
  chatId,
  userId,
  userText,
}: {
  chatId: string;
  userId: string;
  userText: string;
}): Promise<SlackTestResponse | null> {
  const blocks = buildUserMessageBlocks(userText, chatId, userId);
  return postToSlack(blocks);
}

// Test helper: Post assistant response parts directly (returns responses)
export async function testPostAssistantResponse({
  parts,
  threadTs,
}: {
  parts: Array<
    | { type: "text"; text: string }
    | { type: "tool-invocation"; toolName: string; result: unknown }
  >;
  threadTs: string;
}): Promise<SlackTestResponse[]> {
  const responses: SlackTestResponse[] = [];
  let isFirstText = true;

  for (const part of parts) {
    if (part.type === "text") {
      const blocks = buildTextBlocks(part.text, isFirstText);
      const response = await postToSlack(blocks, threadTs);
      if (response) responses.push(response);
      isFirstText = false;
    } else if (part.type === "tool-invocation") {
      const resultStr = typeof part.result === "string"
        ? part.result
        : JSON.stringify(part.result, null, 2);
      const blocks = buildToolBlocks(part.toolName, resultStr);
      const response = await postToSlack(blocks, threadTs);
      if (response) responses.push(response);
    }
  }

  return responses;
}
