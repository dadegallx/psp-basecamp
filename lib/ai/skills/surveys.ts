/**
 * Surveys Skill
 *
 * Database schema and business logic for survey volumes and operational metrics.
 * Loaded on-demand when the agent needs to query survey data.
 */

export const surveysSkill = {
  name: "surveys",
  description:
    "Database schema for survey volumes, dates, locations, and operational metrics",
  content: `# Surveys Dataset

## Table: superset."Surveys"

A denormalized table containing survey-level data (one row per family survey snapshot).
Use this for questions about survey counts, dates, locations, and baseline/follow-up tracking.

**Grain**: Survey Snapshot (one per family survey)

## Columns

| Column | Type | Description |
|--------|------|-------------|
| snapshot_id | bigint | Unique survey snapshot identifier |
| country_name | varchar | Country name (see Country Names below) |
| is_last | boolean | TRUE if this is the family's most recent survey |
| days_since_previous | int | Days since the previous survey (NULL for baseline) |
| days_since_baseline | int | Days since the first survey (0 for baseline) |
| snapshot_number | bigint | Survey sequence number (1=baseline, 2+=follow-ups) |
| is_baseline | boolean | TRUE if this is the first survey for the family |
| snapshot_date | timestamp | When the survey was taken |
| application_id | bigint | Hub/application identifier |
| hub_name | varchar | Regional hub name (e.g., "Signal", "Paraguay", "South Africa") |
| organization_name | varchar | Implementing organization name |
| project_name | varchar | Project name (can be NULL) |
| latitude | numeric | GPS latitude coordinate |
| longitude | numeric | GPS longitude coordinate |
| is_anonymous | boolean | Whether the family data is anonymized |
| survey_title | varchar | Survey definition title |
| survey_count | int | Count aggregation field (use SUM for totals) |

## Country Names (use exact names)

Countries use full official names as stored in the database:
- "United States of America" (NOT "US", "USA", "United States", "America")
- "United Kingdom" (NOT "UK", "Britain", "England")
- "Viet Nam" (NOT "Vietnam")
- Other countries use full official names (e.g., "Paraguay", "South Africa", "Colombia")

## Business Rules

1. **Baseline vs Follow-up**: is_baseline=TRUE for first surveys, snapshot_number>1 for follow-ups
2. **Current data**: Use WHERE is_last = TRUE for most recent surveys per family (active portfolio)
3. **Time analysis**: Use days_since_baseline for longitudinal tracking
4. **Aggregation**: Always use SUM(survey_count) for counting surveys, NOT COUNT(*)

## SQL Rules

1. **Table reference**: Always use superset."Surveys" (with double quotes)
2. **SELECT only**: Only generate SELECT queries, never INSERT/UPDATE/DELETE
3. **Limit results**: Add LIMIT 100 for queries that might return many rows
4. **Date functions**: Use DATE_TRUNC('month', snapshot_date) for time grouping

## Data NOT Available

This dataset does NOT contain:
- Indicator details (status colors, dimensions, achievements - use Indicators dataset)
- Intervention details (what actions were taken to help families)
- Individual PII (family names, addresses, contact info)
- Financial data (budgets, costs, transactions)
- Field worker details (mentor names, workloads)

If asked about unavailable data, acknowledge the limitation and suggest what CAN be queried.
`,
} as const;
