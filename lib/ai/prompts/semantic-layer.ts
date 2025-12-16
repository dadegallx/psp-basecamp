/**
 * Semantic Layer Definitions for Poverty Stoplight
 *
 * Single source of truth for available data. Epistemic boundaries are INFERRED from this.
 * When data is added to Superset, update this file to expand agent capabilities.
 *
 * Future: This could be auto-generated from Superset's semantic layer export.
 */

// ============================================================================
// INDICATORS DATASET
// ============================================================================

export const indicatorsDataset = {
  name: "Indicators",
  table: 'superset."Indicators"',
  description:
    "One row per Family-Indicator assessment. Use for analyzing poverty status, tracking progress, and monitoring priorities.",
  grain: "Family × Indicator × Survey Snapshot",

  dimensions: [
    {
      name: "Snapshot Sequence",
      column: "snapshot_number",
      description:
        "Survey sequence (1=Baseline, 2+=Follow-ups) for time-series analysis",
    },
    {
      name: "Organization",
      column: "organization_name",
      description: "The organization or partner managing the family",
    },
    {
      name: "Indicator",
      column: "indicator_name",
      description:
        'The specific poverty indicator (e.g., "Income", "Housing", "Health")',
    },
    {
      name: "Dimension",
      column: "dimension_name",
      description:
        "Category grouping indicators (Income & Employment, Health & Environment, etc.)",
    },
    {
      name: "Current Status",
      column: "current_label",
      description:
        "Indicator status in current snapshot (Red, Yellow, Green, Skipped)",
    },
    {
      name: "Baseline Status",
      column: "baseline_label",
      description:
        'Status at baseline for "distance traveled" and Sankey flows',
    },
    {
      name: "Is Latest?",
      column: "is_last",
      description:
        "TRUE = most recent snapshot per family (Active Portfolio filter)",
    },
    {
      name: "Hub",
      column: "hub_name",
      description: "Regional hub name",
    },
    {
      name: "Project",
      column: "project_name",
      description: "Project name (can be NULL)",
    },
  ],

  metrics: [
    {
      name: "# Families",
      description: "Count of unique families",
      sql: "SUM(family_count)",
      note: "Always use SUM(family_count), not COUNT(*)",
    },
    {
      name: "% Green",
      description: "Percentage of families at Green (adequate) status",
      sql: "SUM(CASE WHEN current_label = 'Green' THEN family_count ELSE 0 END) * 100.0 / NULLIF(SUM(family_count), 0)",
    },
    {
      name: "% Yellow",
      description: "Percentage of families at Yellow (vulnerable) status",
      sql: "SUM(CASE WHEN current_label = 'Yellow' THEN family_count ELSE 0 END) * 100.0 / NULLIF(SUM(family_count), 0)",
    },
    {
      name: "% Red",
      description: "Percentage of families at Red (extreme poverty) status",
      sql: "SUM(CASE WHEN current_label = 'Red' THEN family_count ELSE 0 END) * 100.0 / NULLIF(SUM(family_count), 0)",
    },
    {
      name: "# Priorities",
      description: "Count of indicators marked as priority by families",
      sql: "SUM(CASE WHEN is_priority THEN family_count ELSE 0 END)",
    },
    {
      name: "Priority Success Rate",
      description:
        "Percentage of prioritized indicators that improved to Green",
      sql: "SUM(CASE WHEN is_priority AND has_achievement THEN family_count ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN is_priority THEN family_count ELSE 0 END), 0)",
    },
    {
      name: "Avg. Improvement Steps",
      description: "Average numeric improvement since baseline (-2 to +2)",
      sql: "AVG(net_change_numeric)",
      note: "Only meaningful when comparing baseline to current",
    },
  ],
};

// ============================================================================
// SURVEYS DATASET
// ============================================================================

export const surveysDataset = {
  name: "Surveys",
  table: 'superset."Surveys"',
  description:
    "One row per Survey submission. Use for operational metrics, survey volumes, and tracking family engagement.",
  grain: "Survey Snapshot (one per family survey)",

  dimensions: [
    {
      name: "Snapshot Date",
      column: "snapshot_date",
      description: "When the survey was completed",
    },
    {
      name: "Organization",
      column: "organization_name",
      description: "The organization conducting the survey",
    },
    {
      name: "Country",
      column: "country_name",
      description: "Country where the family is located",
    },
    {
      name: "Project",
      column: "project_name",
      description: "Funding project associated with the survey",
    },
    {
      name: "Hub",
      column: "hub_name",
      description: "Regional hub name",
    },
    {
      name: "Is Latest?",
      column: "is_last",
      description:
        "TRUE = most recent survey per family (Active Portfolio filter)",
    },
    {
      name: "Survey Sequence",
      column: "snapshot_number",
      description: "Numeric sequence (1=Baseline, 2+=Follow-ups)",
    },
    {
      name: "Survey Type",
      column: "is_baseline",
      description: "TRUE=Baseline, FALSE=Follow-up",
    },
  ],

  metrics: [
    {
      name: "# Surveys",
      description: "Total survey submissions",
      sql: "SUM(survey_count)",
      note: "Always use SUM(survey_count), not COUNT(*)",
    },
    {
      name: "# Families (Active)",
      description: "Families currently in program",
      sql: "SUM(CASE WHEN is_last THEN survey_count ELSE 0 END)",
      note: "Filter with WHERE is_last = TRUE for active portfolio",
    },
    {
      name: "# Baselines",
      description: "Initial surveys (new families)",
      sql: "SUM(CASE WHEN is_baseline THEN survey_count ELSE 0 END)",
    },
    {
      name: "# Follow-ups",
      description: "Follow-up surveys (retained families)",
      sql: "SUM(CASE WHEN NOT is_baseline THEN survey_count ELSE 0 END)",
    },
    {
      name: "Avg. Days Since Last Survey",
      description: "Average days between surveys",
      sql: "AVG(days_since_previous)",
      note: "NULL for baseline surveys",
    },
    {
      name: "Avg. Days Since Baseline",
      description: "Average days since family joined program",
      sql: "AVG(days_since_baseline)",
    },
  ],
};

// ============================================================================
// FORMATTED PROMPTS FOR SYSTEM AND SQL GENERATION
// ============================================================================

/**
 * Business-friendly summary for the main system prompt.
 * Includes epistemic boundary guidance.
 */
export const semanticLayerPrompt = `## Available Data in Superset

You have access to TWO datasets. You can ONLY answer questions using the dimensions and metrics listed below.

### Dataset 1: Indicators
${indicatorsDataset.description}

**Dimensions** (group/filter by):
${indicatorsDataset.dimensions.map((d) => `- **${d.name}**: ${d.description}`).join("\n")}

**Metrics** (measure):
${indicatorsDataset.metrics.map((m) => `- **${m.name}**: ${m.description}`).join("\n")}

### Dataset 2: Surveys
${surveysDataset.description}

**Dimensions** (group/filter by):
${surveysDataset.dimensions.map((d) => `- **${d.name}**: ${d.description}`).join("\n")}

**Metrics** (measure):
${surveysDataset.metrics.map((m) => `- **${m.name}**: ${m.description}`).join("\n")}

### Data Boundaries

**IMPORTANT**: If a user asks about something NOT listed above, you cannot answer it from the current Superset data. Common examples of unavailable data:
- Intervention details (what actions were taken to help families)
- Causation (why indicators changed - only correlation is available)
- Individual family names or addresses (privacy)
- Financial data (budgets, costs per family)
- Field worker/mentor details
- Real-time data (these are periodic snapshots)

When asked about unavailable data:
1. Acknowledge it's not in the current Superset datasets
2. Note that this data might exist elsewhere in Poverty Stoplight systems
3. Suggest what you CAN answer that might help their underlying question
`;

/**
 * Technical format for SQL generation prompts.
 * Includes column names and SQL formulas.
 */
export const formatDatasetForSQL = (
  dataset: typeof indicatorsDataset
): string => {
  return `
## Semantic Layer: ${dataset.name}

**Table**: ${dataset.table}
**Grain**: ${dataset.grain}

### Dimensions (columns for GROUP BY / WHERE):
${dataset.dimensions.map((d) => `- ${d.column} → "${d.name}": ${d.description}`).join("\n")}

### Standard Metrics (use these SQL formulas):
${dataset.metrics.map((m) => `- **${m.name}**: \`${m.sql}\`${m.note ? ` (${m.note})` : ""}`).join("\n")}
`;
};

export const indicatorsSemanticLayerForSQL = formatDatasetForSQL(indicatorsDataset);
export const surveysSemanticLayerForSQL = formatDatasetForSQL(surveysDataset);
