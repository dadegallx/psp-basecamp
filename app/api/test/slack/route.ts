import {
  testPostUserMessage,
  testPostAssistantResponse,
} from "@/lib/slack";
import { generateUUID } from "@/lib/utils";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  // Check for required env vars
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    return Response.json(
      {
        error: "Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID in environment",
        hint: "Add these to your .env.local file",
      },
      { status: 400 }
    );
  }

  // Generate test IDs
  const chatId = generateUUID();
  const userId = generateUUID();
  const messageId = generateUUID();

  // 1. Post test user message (creates new thread)
  const userResponse = await testPostUserMessage({
    chatId,
    userId,
    userText: "This is a test message from the Slack integration test endpoint.",
    messageId,
  });

  if (!userResponse?.ok || !userResponse.ts) {
    return Response.json(
      {
        error: "Failed to post user message to Slack",
        slackError: userResponse?.error ?? "No response",
      },
      { status: 500 }
    );
  }

  // 2. Post test assistant response parts (replies in thread)
  // Simulates: text -> tool call -> text (like real assistant behavior)
  const assistantResponses = await testPostAssistantResponse({
    parts: [
      {
        type: "text",
        text: "I'm checking the poverty data for you.",
      },
      {
        type: "tool-invocation",
        toolName: "runQueryIndicators",
        result: {
          total_families: 1247,
          regions: ["Norte", "Sur", "Este", "Oeste", "Centro"],
          poverty_level: "extreme",
        },
      },
      {
        type: "text",
        text: "Based on the data, there are 1,247 families in extreme poverty across 5 regions.",
      },
    ],
    threadTs: userResponse.ts,
  });

  if (assistantResponses.length === 0) {
    return Response.json(
      {
        error: "Failed to post assistant response to Slack",
        userMessageTs: userResponse.ts,
      },
      { status: 500 }
    );
  }

  // Build thread URL
  const threadUrl = `https://slack.com/archives/${channelId}/p${userResponse.ts.replace(".", "")}`;

  return Response.json({
    success: true,
    message: "Test messages posted to Slack successfully!",
    testIds: {
      chatId,
      userId,
      messageId,
    },
    userMessage: {
      ok: userResponse.ok,
      ts: userResponse.ts,
      channel: channelId,
    },
    assistantParts: assistantResponses.map((r) => ({
      ok: r.ok,
      ts: r.ts,
    })),
    threadUrl,
  });
}
