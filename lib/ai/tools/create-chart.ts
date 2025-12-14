import { tool, type UIMessageStreamWriter } from "ai";

import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateChartProps = {
  userId: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createChart = ({ userId, dataStream }: CreateChartProps) =>
  tool({
    description:
      "Create a chart visualization from a natural language query. Use this when the user wants to visualize data, see trends, compare categories, or create graphs. The chart will be generated based on sample data.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The natural language query describing what data to visualize, e.g., 'Show sales by category' or 'Compare values over time'"
        ),
    }),
    execute: async ({ query }) => {
      const id = generateUUID();
      const kind = "chart";

      // Stream artifact metadata
      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      // Use truncated query as title
      const title = query.length > 50 ? query.substring(0, 47) + "..." : query;

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (handler) => handler.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title: query, // Pass full query for processing
        dataStream,
        userId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: "A chart has been created and is now visible to the user.",
      };
    },
  });
