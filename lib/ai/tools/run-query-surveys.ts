import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { sql } from "@/lib/neon";
import { querySurveysSqlPrompt } from "../prompts/query-surveys-sql";

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
    // Check for keyword as a separate word (not part of column names)
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalized)) {
      return { valid: false, error: `Forbidden keyword: ${keyword}` };
    }
  }

  return { valid: true };
}

export const runQuerySurveys = tool({
  description:
    "Query the Poverty Stoplight SURVEYS database using natural language. Use this tool when the user wants to know about survey counts, dates, locations, baseline vs follow-up surveys, time between surveys, or survey-level statistics. NOT for indicator status or dimensions - use runQueryIndicators for those.",
  inputSchema: z.object({
    question: z
      .string()
      .describe(
        "The natural language question about surveys, e.g., 'How many surveys do we have?' or 'Show surveys by country'"
      ),
  }),
  execute: async (input) => {
    const { question } = input;
    try {
      // Step 1: Generate SQL from natural language
      const { object: sqlResult } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: querySurveysSqlPrompt,
        prompt: question,
        schema: z.object({
          sql: z.string().describe("The SQL SELECT query to execute"),
        }),
      });

      const generatedSql = sqlResult.sql;

      // Step 2: Validate the SQL
      const validation = validateSQL(generatedSql);
      if (!validation.valid) {
        return {
          error: validation.error,
          question,
        };
      }

      // Step 3: Execute the query
      const results = await sql.query(generatedSql);

      // Step 4: Return results with metadata
      return {
        question,
        sql: generatedSql,
        results,
        rowCount: Array.isArray(results) ? results.length : 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        error: errorMessage,
        question,
      };
    }
  },
});
