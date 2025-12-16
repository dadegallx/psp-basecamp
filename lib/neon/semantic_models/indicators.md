# **Dataset: Indicators**

Description: This dataset contains one row per **Family-Indicator** submission (**Assessment**). Use this to analyze **multidimensional poverty flows**, monitor **priorities and achievements** by **Indicator and Organization**, and track the frequency of **family** interactions over time.

## **Dimensions**

Use these to group, slice, or filter the data.

| Dimension Name | Description |
| :---- | :---- |
| **Snapshot Sequence** | The numeric sequence of the survey (Baseline, 1st Follow-up, etc.) used for time-series. |
| **Organization** | The name of the organization or partner managing the family. |
| **Indicator** | The specific poverty indicator being measured (e.g., "Housing", "Income"). |
| **Current Status** | The color of the indicator in the current snapshot (Red, Yellow, Green). |
| **Baseline Status** | The color of the indicator at the start (Baseline), used for Sankey flows and "Distance Traveled". |
| **Is Latest?** | Boolean flag to filter for the most recent snapshot per family (Active Portfolio). |

## Metrics

Use these to calculate numbers and measure operational effort.

| Metric Name | Description |
| :---- | :---- |
| **# Families** | The number of unique families who received an assessment in the selected period. |
| **% Green / Yellow / Red** | The percentage of families at each status level for a given indicator. |
| **# Priorities** | The number of indicators marked as a priority by families. |
| **Priority Success Rate** | The percentage of prioritized indicators that have improved to Green. |
| **Avg. Improvement Steps** | The average numeric improvement (steps from Red->Yellow->Green) since baseline. |
