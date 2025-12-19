import { tool } from "ai";
import { z } from "zod";
import { sql } from "@/lib/neon";

/**
 * Execute Query Tool
 *
 * Executes a SQL SELECT query against the database and returns raw results.
 * The main chat model interprets the results for the user.
 */
const executeQueryParameters = z.object({
  query: z
    .string()
    .describe("The SQL SELECT query to execute. Must be a valid PostgreSQL query."),
});

export const executeQuery = tool({
  description:
    "Execute a SQL SELECT query against the database. Returns raw results for you to interpret.",
  inputSchema: executeQueryParameters,
  execute: async ({ query }) => {
    // Validate SELECT only
    const normalized = query.trim().toLowerCase();
    if (!normalized.startsWith("select")) {
      return {
        error: "Only SELECT queries are allowed",
        query,
      };
    }

    // Check for forbidden keywords
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
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(normalized)) {
        return {
          error: `Forbidden keyword: ${keyword}`,
          query,
        };
      }
    }

    try {
      // Execute the query using neon's tagged template function
      // For dynamic queries, we call sql as a function
      const results = await sql.query(query);
      const rowCount = Array.isArray(results) ? results.length : 0;

      return {
        query,
        results,
        rowCount,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Query execution failed",
        query,
      };
    }
  },
});
