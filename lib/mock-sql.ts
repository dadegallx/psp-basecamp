import type { Config, Result } from "@/lib/chart-types";

/**
 * Mock SQL schema for chart artifact demonstrations.
 * This is a minimal schema with just category and value columns.
 */
export const MOCK_SCHEMA = `
Table: items
Columns:
  - category: VARCHAR (values: "Electronics", "Clothing", "Food", "Home")
  - value: INTEGER (sales amount)
  - month: VARCHAR (values: "Jan", "Feb", "Mar", "Apr")

Only SELECT queries are allowed. Return data suitable for charting.
`;

/**
 * Mock data for the items table
 */
const MOCK_DATA: Result[] = [
  { category: "Electronics", value: 1200, month: "Jan" },
  { category: "Clothing", value: 800, month: "Jan" },
  { category: "Food", value: 450, month: "Jan" },
  { category: "Home", value: 650, month: "Jan" },
  { category: "Electronics", value: 1400, month: "Feb" },
  { category: "Clothing", value: 750, month: "Feb" },
  { category: "Food", value: 500, month: "Feb" },
  { category: "Home", value: 700, month: "Feb" },
  { category: "Electronics", value: 1100, month: "Mar" },
  { category: "Clothing", value: 900, month: "Mar" },
  { category: "Food", value: 550, month: "Mar" },
  { category: "Home", value: 600, month: "Mar" },
  { category: "Electronics", value: 1300, month: "Apr" },
  { category: "Clothing", value: 850, month: "Apr" },
  { category: "Food", value: 480, month: "Apr" },
  { category: "Home", value: 720, month: "Apr" },
];

/**
 * Validates that a SQL query is safe to execute (SELECT only, no destructive operations)
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const normalized = sql.trim().toLowerCase();

  // Must start with SELECT
  if (!normalized.startsWith("select")) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Check for destructive operations
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

/**
 * Executes a mock SQL query and returns results.
 * Uses simple pattern matching to determine what aggregation to perform.
 */
export function executeMockSQL(sql: string): Result[] {
  const normalized = sql.toLowerCase();

  // Pattern: GROUP BY category (aggregate by category)
  if (normalized.includes("group by") && normalized.includes("category")) {
    const grouped: Record<string, number> = {};
    for (const row of MOCK_DATA) {
      const cat = row.category as string;
      grouped[cat] = (grouped[cat] || 0) + (row.value as number);
    }
    return Object.entries(grouped).map(([category, total_value]) => ({
      category,
      total_value,
    }));
  }

  // Pattern: GROUP BY month (aggregate by month - time series)
  if (normalized.includes("group by") && normalized.includes("month")) {
    const grouped: Record<string, number> = {};
    const monthOrder = ["Jan", "Feb", "Mar", "Apr"];
    for (const row of MOCK_DATA) {
      const month = row.month as string;
      grouped[month] = (grouped[month] || 0) + (row.value as number);
    }
    return monthOrder.map((month) => ({
      month,
      total_value: grouped[month] || 0,
    }));
  }

  // Pattern: category and month together (for multi-line charts)
  if (
    normalized.includes("category") &&
    normalized.includes("month") &&
    !normalized.includes("group by")
  ) {
    return MOCK_DATA;
  }

  // Default: return aggregated by category
  const grouped: Record<string, number> = {};
  for (const row of MOCK_DATA) {
    const cat = row.category as string;
    grouped[cat] = (grouped[cat] || 0) + (row.value as number);
  }
  return Object.entries(grouped).map(([category, total_value]) => ({
    category,
    total_value,
  }));
}

/**
 * Returns a mock chart config that matches the data returned by executeMockSQL.
 * Use this for testing to ensure data and config are aligned.
 */
export function getMockConfig(sql: string, query: string): Config {
  const normalized = sql.toLowerCase();

  // Pattern: GROUP BY month → line chart
  if (normalized.includes("group by") && normalized.includes("month")) {
    return {
      type: "line",
      title: query,
      description: "Monthly sales trend over time",
      takeaway: "Sales show variation across months",
      xKey: "month",
      yKeys: ["total_value"],
      labels: { total_value: "Total Sales" },
      legend: false,
    };
  }

  // Pattern: raw data with category + month → multi-line chart
  if (
    normalized.includes("category") &&
    normalized.includes("month") &&
    !normalized.includes("group by")
  ) {
    return {
      type: "line",
      title: query,
      description: "Sales by category over time",
      takeaway: "Different categories show different trends",
      xKey: "month",
      yKeys: ["value"],
      labels: { value: "Sales Value" },
      multipleLines: true,
      measurementColumn: "value",
      lineCategories: ["Electronics", "Clothing", "Food", "Home"],
      legend: true,
    };
  }

  // Default: GROUP BY category → bar chart
  return {
    type: "bar",
    title: query,
    description: "Total sales by product category",
    takeaway: "Electronics leads in total sales value",
    xKey: "category",
    yKeys: ["total_value"],
    labels: { total_value: "Total Sales" },
    legend: false,
  };
}
