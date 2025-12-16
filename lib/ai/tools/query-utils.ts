/**
 * Shared utilities for Poverty Stoplight query tools.
 *
 * - SQL validation (security)
 * - Result interpretation (single prompt for both datasets)
 */

import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";

// ============================================================================
// SQL VALIDATION
// ============================================================================

/**
 * Validates that a SQL query is safe to execute (SELECT only, no destructive operations)
 */
export function validateSQL(query: string): { valid: boolean; error?: string } {
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

// ============================================================================
// RESULT INTERPRETATION
// ============================================================================

/**
 * Single interpretation prompt that handles both Indicators and Surveys datasets.
 * Context is provided dynamically based on which table was queried.
 */
export const interpretResultsPrompt = `You are a data analyst interpreting query results from the Poverty Stoplight platform.

## Your Task
Translate raw SQL results into a clear, insightful answer for non-technical users.

## Context by Dataset
- **INDICATORS**: Family poverty assessments across indicators
  - Red = Extreme poverty (critical need)
  - Yellow = Vulnerable (needs improvement)
  - Green = Adequate (non-poor on this indicator)
  - family_count represents actual families, not rows

- **SURVEYS**: Survey submission volumes and operational metrics
  - Baseline = First survey for a family (joining the program)
  - Follow-up = Subsequent surveys (showing continued engagement)
  - survey_count represents actual surveys, not rows

## Guidelines
1. **Answer directly**: Start with the answer, not methodology
2. **Be concise**: 2-4 sentences for simple queries, more for complex analysis
3. **Highlight significance**: What does this mean for poverty reduction?
4. **Note limitations**: If data seems incomplete or surprising, mention it
5. **Use domain language**: "families in extreme poverty" not "Red status count"
6. **Suggest next steps**: If relevant, mention what related questions could be explored

## Do NOT
- Include raw SQL in your response
- Use technical jargon (column names, table names)
- Speculate beyond what the data shows
- Make causal claims (correlation only)
`;

/**
 * Interprets query results using AI, returning a plain-language explanation.
 *
 * @param question - The original user question
 * @param tableName - Which table was queried ("Indicators" or "Surveys")
 * @param sql - The SQL query that was executed
 * @param results - The raw query results
 * @returns Interpreted explanation
 */
export async function interpretResults({
  question,
  tableName,
  sql,
  results,
}: {
  question: string;
  tableName: "Indicators" | "Surveys";
  sql: string;
  results: unknown[];
}): Promise<string> {
  // Limit results sent to interpretation to avoid token overflow
  const maxResults = 50;
  const truncatedResults = results.slice(0, maxResults);
  const wasTriuncated = results.length > maxResults;

  const prompt = `
## User Question
${question}

## Dataset Queried
${tableName}

## SQL Executed
\`\`\`sql
${sql}
\`\`\`

## Results (${results.length} rows${wasTriuncated ? `, showing first ${maxResults}` : ""})
\`\`\`json
${JSON.stringify(truncatedResults, null, 2)}
\`\`\`
${wasTriuncated ? `\n(${results.length - maxResults} additional rows not shown)` : ""}

## Your Interpretation
Provide a clear, concise answer to the user's question based on these results.
`;

  try {
    const { text } = await generateText({
      model: myProvider.languageModel("artifact-model"),
      system: interpretResultsPrompt,
      prompt,
    });

    return text;
  } catch (error) {
    // Fallback if interpretation fails - return a basic summary
    console.warn("Result interpretation failed:", error);
    return `Query returned ${results.length} results. The data shows: ${JSON.stringify(results.slice(0, 3))}...`;
  }
}
