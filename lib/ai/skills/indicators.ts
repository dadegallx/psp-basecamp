/**
 * Indicators Skill
 *
 * Database schema and business logic for poverty indicator assessments.
 * Loaded on-demand when the agent needs to query indicator data.
 */

export const indicatorsSkill = {
  name: "indicators",
  description:
    "Database schema for poverty indicator assessments (Red/Yellow/Green status, dimensions, priorities)",
  content: `# Indicators Dataset

## Table: superset."Indicators"

A denormalized table containing poverty indicator responses from family surveys.
Each row represents a combination of indicator status for a group of families.

**Grain**: Family x Indicator x Survey Snapshot

## Columns

| Column | Type | Description |
|--------|------|-------------|
| application_id | bigint | Application/hub identifier |
| hub_name | varchar | Regional hub name (e.g., "Signal", "Paraguay", "South Africa") |
| organization_name | varchar | Implementing organization name |
| project_name | varchar | Project name (can be NULL) |
| indicator_name | varchar | Name of the poverty indicator (e.g., "Income", "Education", "Health") |
| dimension_name | varchar | Category grouping indicators (see Dimensions below) |
| survey_title | varchar | Survey definition title |
| snapshot_type | text | "Baseline" (first survey) or "Follow-up" (subsequent surveys) |
| snapshot_number | bigint | Survey sequence (1=baseline, 2+=follow-ups) |
| is_last | boolean | TRUE if this is the family's most recent survey |
| max_snapshot_number | bigint | Highest snapshot number for this family |
| baseline_label | text | Status at baseline ("Red", "Yellow", "Green", "Skipped", "N/A") |
| previous_label | text | Status at previous snapshot |
| current_label | text | Current status ("Red", "Yellow", "Green", "Skipped") |
| is_priority | boolean | Whether the indicator was marked as a priority |
| has_achievement | boolean | Whether the indicator improved from previous snapshot |
| was_priority_in_previous | boolean | Whether it was a priority in previous snapshot |
| net_change_numeric | bigint | Numeric change in status (-2 to +2) |
| family_count | bigint | Number of families with this exact combination |

## Dimensions (dimension_name values)

- "Income and Employment"
- "Health and Environment"
- "Housing and Infrastructure"
- "Education and Culture"
- "Organization and Participation"
- "Interiority and Motivation"

## Stoplight Colors

- **Red** = Extreme poverty (critical need requiring immediate attention)
- **Yellow** = Vulnerable (needs improvement)
- **Green** = Adequate (non-poor on this indicator)
- **Skipped** = Indicator was not assessed

## Business Rules

1. **Family counts**: Always aggregate using SUM(family_count), NOT COUNT(*)
2. **Current status queries**: Use WHERE is_last = TRUE to get most recent data
3. **Progress tracking**: Compare baseline_label to current_label, or use has_achievement
4. **Priority success**: is_priority AND has_achievement = priority that improved
5. **Distinct indicators**: Use COUNT(DISTINCT indicator_name) to count unique indicators

## SQL Rules

1. **Table reference**: Always use superset."Indicators" (with double quotes)
2. **SELECT only**: Only generate SELECT queries, never INSERT/UPDATE/DELETE
3. **Limit results**: Add LIMIT 100 for queries that might return many rows
4. **Aggregation**: When counting families, use SUM(family_count)

## Data NOT Available

This dataset does NOT contain:
- Intervention details (what actions were taken to help families)
- Causation (why indicators changed - only status changes are recorded)
- Individual PII (family names, addresses, contact info)
- Financial data (budgets, costs, transactions)
- Field worker details (mentor names, workloads)
- Survey dates (use the Surveys dataset for temporal data)

If asked about unavailable data, acknowledge the limitation and suggest what CAN be queried.
`,
} as const;
