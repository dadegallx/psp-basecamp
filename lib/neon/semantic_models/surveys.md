# **Dataset: Surveys**

Description: This dataset contains one row per **Survey Submission** (Snapshot). Use this to analyze **operational efficiency**, track **survey volume** by **Country and Organization**, and monitor the **active family portfolio**.

## **Dimensions**

Use these to group, slice, or filter the data.

| Dimension Name | Description |
| :---- | :---- |
| **Snapshot Date** | The specific date the survey was completed. |
| **Organization** | The name of the organization conducting the survey. |
| **Country** | The country where the family is located. |
| **Project** | The funding project associated with the survey. |
| **Is Latest?** | Filter for the most recent snapshot per family (Active Portfolio). |
| **Survey Sequence** | Numeric sequence (1=Baseline, 2=Follow-up, etc.). |
| **Survey Type** | 'Baseline' or 'Follow-up' (derived from sequence). |

## Metrics

Use these to calculate numbers and measure operational effort.

| Metric Name | Description |
| :---- | :---- |
| **# Surveys Recorded** | The total number of surveys submitted (operational volume). |
| **# Families (Active)** | The count of unique families currently in the program (Filter: Is Latest = True). |
| **# Baselines** | The number of initial surveys conducted (New families). |
| **# Follow-ups** | The number of follow-up surveys conducted (Retained families). |
| **Avg. Days Since Last** | Average days elapsed between the current and previous survey. |
| **Avg. Days Since Baseline** | Average days elapsed since the family joined the program. |
