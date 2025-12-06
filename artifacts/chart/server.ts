import { generateObject } from "ai";
import { z } from "zod";
import { chartConfigPrompt, chartSQLPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { configSchema, type Config, type Result } from "@/lib/chart-types";
import { executeMockSQL, getMockConfig, validateSQL } from "@/lib/mock-sql";

// Set to true to use AI-generated config, false to use mock config for testing
const USE_AI_CONFIG = false;

export type ChartContent = {
  query: string;
  sql: string;
  results: Result[];
  config: Config;
};

export const chartDocumentHandler = createDocumentHandler<"chart">({
  kind: "chart",
  onCreateDocument: async ({ title: query, dataStream }) => {
    // Generate SQL
    const { object: sqlResult } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      system: chartSQLPrompt,
      prompt: `Generate a SQL query for: ${query}`,
      schema: z.object({
        sql: z.string().describe("The SQL SELECT query"),
      }),
    });

    const sql = sqlResult.sql;

    // Validate SQL
    const validation = validateSQL(sql);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Execute SQL (mock)
    const results = executeMockSQL(sql);

    // Generate chart config
    let config: Config;
    if (USE_AI_CONFIG) {
      const { object: aiConfig } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: chartConfigPrompt,
        prompt: `Generate a chart configuration for the user query: "${query}"\n\nData:\n${JSON.stringify(results, null, 2)}`,
        schema: configSchema,
      });
      config = aiConfig;
    } else {
      config = getMockConfig(sql, query);
    }

    // Add colors to config
    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });
    const finalConfig: Config = { ...config, colors };

    // Build final content
    const chartContent: ChartContent = {
      query,
      sql,
      results,
      config: finalConfig,
    };

    const contentString = JSON.stringify(chartContent);

    // Stream final result
    dataStream.write({
      type: "data-chartDelta",
      data: contentString,
      transient: true,
    });

    return contentString;
  },
  onUpdateDocument: async () => {
    throw new Error("Chart updates are not supported. Create a new chart instead.");
  },
});
