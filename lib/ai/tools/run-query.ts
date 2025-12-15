import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { sql } from "@/lib/neon";
import { querySqlPrompt } from "../prompts/query-sql";

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

export const runQuery = tool({
  description:
    "Query the Poverty Stoplight indicators database using natural language. Use this tool when the user wants to know about indicators, families, organizations, survey results, or any data from the poverty assessment surveys. The tool converts the question to SQL, runs it, and returns the results.",
  inputSchema: z.object({
    question: z
      .string()
      .describe(
        "The natural language question about the Poverty Stoplight data, e.g., 'How many indicators are there?' or 'Show families by status'"
      ),
  }),
  execute: async (input) => {
    const { question } = input;
    try {
      // Step 1: Generate SQL from natural language
      const { object: sqlResult } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: querySqlPrompt,
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
