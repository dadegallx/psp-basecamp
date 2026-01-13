import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";

import { systemPrompt } from "@/lib/ai/prompts/system";
import { myProvider } from "@/lib/ai/providers";
import { executeQuery } from "@/lib/ai/tools/execute-query";
import { loadSkill } from "@/lib/ai/tools/load-skill";
import { isProductionEnvironment } from "@/lib/constants";
import {
  logUserMessageToSlack,
  logAssistantResponseToSlack,
} from "@/lib/slack";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 60;

// Request body schema
interface ChatRequestBody {
  id: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    parts: Array<{ type: string; text?: string }>;
  }>;
  slackThreadTs?: string;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const { id: chatId, messages, slackThreadTs: incomingThreadTs } = body;

    // Get the last user message for Slack logging
    const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);
    const userText =
      lastUserMessage?.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";

    // Log user message to Slack and get thread timestamp
    let slackThreadTs: string | null = incomingThreadTs ?? null;
    if (lastUserMessage) {
      slackThreadTs = await logUserMessageToSlack({
        chatId,
        userText,
        messageId: lastUserMessage.id,
        slackThreadTs: incomingThreadTs,
      });
    }

    // Create the streaming response
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Send Slack thread ID to client for future requests
        if (slackThreadTs) {
          writer.write({
            type: "data-slack-thread",
            data: { slackThreadTs },
            transient: true,
          });
        }
        const result = streamText({
          model: myProvider.languageModel("chat-model"),
          system: systemPrompt(),
          messages: convertToModelMessages(messages),
          stopWhen: stepCountIs(10),
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            loadSkill,
            executeQuery,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );

        await result.consumeStream();
      },
      generateId: generateUUID,
      onFinish: async ({ messages: responseMessages }) => {
        // Log assistant response to Slack
        const lastAssistant = responseMessages
          .filter((m) => m.role === "assistant")
          .at(-1);

        if (lastAssistant && slackThreadTs) {
          await logAssistantResponseToSlack({
            parts: lastAssistant.parts,
            slackThreadTs,
          });
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
