import { generateObject } from "ai";
import { z } from "zod";
import { chartConfigPrompt } from "@/lib/ai/prompts/chart-config";
import { chartSqlPrompt } from "@/lib/ai/prompts/chart-sql";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { configSchema, type Config, type Result } from "@/lib/chart-types";
import { sql } from "@/lib/neon";

/**
 * Validates that a SQL query is safe to execute (SELECT only, no destructive operations)
 */
function validateSQL(query: string): { valid: boolean; error?: string } {
  const normalized = query.trim().toLowerCase();

  if (!normalized.startsWith("select")) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  const forbidden = [
    "drop",
    "delete",
    "insert",
    "update",
    "alter",
    "truncate",
    "create",
    "grant",
    "revoke",
  ];

  for (const keyword of forbidden) {
    if (normalized.includes(keyword)) {
      return { valid: false, error: `Forbidden keyword: ${keyword}` };
    }
  }

  return { valid: true };
}

export type ChartContent = {
  query: string;
  sql: string;
  results: Result[];
  config: Config;
};

export const chartDocumentHandler = createDocumentHandler<"chart">({
  kind: "chart",
  onCreateDocument: async ({ title: query, dataStream }) => {
    // Generate SQL using the real Poverty Stoplight schema
    const { object: sqlResult } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      system: chartSqlPrompt,
      prompt: `Generate a SQL query for: ${query}`,
      schema: z.object({
        sql: z.string().describe("The SQL SELECT query"),
      }),
    });

    const generatedSql = sqlResult.sql;

    // Validate SQL
    const validation = validateSQL(generatedSql);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Execute SQL against Neon database
    // Use array syntax to call the tagged template function with a dynamic string
    const results = (await sql(
      [generatedSql] as unknown as TemplateStringsArray
    )) as Result[];

    // Generate chart config using AI
    const { object: config } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      system: chartConfigPrompt,
      prompt: `Generate a chart configuration for the user query: "${query}"\n\nData:\n${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    // Add colors to config
    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });
    const finalConfig: Config = { ...config, colors };

    // Build final content
    const chartContent: ChartContent = {
      query,
      sql: generatedSql,
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
