import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { sql } from "@/lib/neon";
import { querySurveysSqlPrompt } from "../prompts/query-surveys-sql";
import { validateSQL, interpretResults } from "./query-utils";

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
      const rowCount = Array.isArray(results) ? results.length : 0;

      // Step 4: Interpret results using AI
      const interpretation = await interpretResults({
        question,
        tableName: "Surveys",
        sql: generatedSql,
        results: Array.isArray(results) ? results : [],
      });

      // Step 5: Return interpreted results + raw data for follow-up
      return {
        question,
        interpretation, // Plain language explanation for the user
        sql: generatedSql,
        results, // Keep raw results for potential follow-up or verification
        rowCount,
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
