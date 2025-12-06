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

// TODO: Remove this flag and hardcoded query after testing
const USE_HARDCODED_SQL = true;
const HARDCODED_SQL = `
SELECT
    i.indicator_name,
    COUNT(*) FILTER (WHERE f.indicator_status_value = 1) AS red_count,
    COUNT(*) FILTER (WHERE f.indicator_status_value = 2) AS yellow_count,
    COUNT(*) FILTER (WHERE f.indicator_status_value = 3) AS green_count
  FROM analytics_marts.fact_family_indicator_snapshot f
  JOIN analytics_marts.dim_indicator_questions i
    ON f.survey_indicator_id = i.survey_indicator_id
  WHERE f.survey_definition_id = 93
    AND f.is_last = TRUE
    AND f.indicator_status_value IS NOT NULL
  GROUP BY i.indicator_name
  ORDER BY i.indicator_name;
`.trim();

export const chartDocumentHandler = createDocumentHandler<"chart">({
  kind: "chart",
  onCreateDocument: async ({ title: query, dataStream }) => {
    let generatedSql: string;

    if (USE_HARDCODED_SQL) {
      // Bypass LLM for testing
      generatedSql = HARDCODED_SQL;
    } else {
      // Generate SQL using the real Poverty Stoplight schema
      const { object: sqlResult } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: chartSqlPrompt,
        prompt: `Generate a SQL query for: ${query}`,
        schema: z.object({
          sql: z.string().describe("The SQL SELECT query"),
        }),
      });
      generatedSql = sqlResult.sql;
    }

    // Validate SQL
    const validation = validateSQL(generatedSql);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Execute SQL against Neon database
    // Use sql.query() for dynamic SQL strings (not template literals)
    const results = (await sql.query(generatedSql)) as Result[];

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
