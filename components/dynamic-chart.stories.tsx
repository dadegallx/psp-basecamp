import type { Meta, StoryObj } from "@storybook/react";
import { DynamicChart } from "./dynamic-chart";
import type { Config, Result } from "@/lib/chart-types";

const meta: Meta<typeof DynamicChart> = {
  title: "Charts/DynamicChart",
  component: DynamicChart,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DynamicChart>;

// Sample data for different chart types
const barChartData: Result[] = [
  { company: "Acme Corp", valuation: 150 },
  { company: "Beta Inc", valuation: 230 },
  { company: "Gamma Ltd", valuation: 180 },
  { company: "Delta Co", valuation: 290 },
  { company: "Epsilon LLC", valuation: 120 },
];

const barChartConfig: Config = {
  type: "bar",
  title: "Company Valuations",
  description: "A comparison of company valuations in billions of dollars.",
  takeaway: "Delta Co leads with the highest valuation at $290B.",
  xKey: "company",
  yKeys: ["valuation"],
  legend: true,
};

export const BarChart: Story = {
  args: {
    chartData: barChartData,
    chartConfig: barChartConfig,
  },
};

// Line chart data
const lineChartData: Result[] = [
  { year: "2019", revenue: 45, profit: 12 },
  { year: "2020", revenue: 52, profit: 15 },
  { year: "2021", revenue: 61, profit: 22 },
  { year: "2022", revenue: 78, profit: 28 },
  { year: "2023", revenue: 95, profit: 35 },
];

const lineChartConfig: Config = {
  type: "line",
  title: "Revenue & Profit Growth",
  description: "Yearly revenue and profit trends from 2019 to 2023.",
  takeaway: "Both revenue and profit show consistent year-over-year growth.",
  xKey: "year",
  yKeys: ["revenue", "profit"],
  legend: true,
};

export const LineChart: Story = {
  args: {
    chartData: lineChartData,
    chartConfig: lineChartConfig,
  },
};

// Area chart data
const areaChartData: Result[] = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1800 },
  { month: "Mar", users: 2400 },
  { month: "Apr", users: 3100 },
  { month: "May", users: 4200 },
  { month: "Jun", users: 5500 },
];

const areaChartConfig: Config = {
  type: "area",
  title: "Monthly Active Users",
  description: "Growth in monthly active users over the first half of the year.",
  takeaway: "User growth accelerated significantly in May and June.",
  xKey: "month",
  yKeys: ["users"],
  legend: false,
};

export const AreaChart: Story = {
  args: {
    chartData: areaChartData,
    chartConfig: areaChartConfig,
  },
};

// Pie chart data
const pieChartData: Result[] = [
  { category: "Technology", count: 45 },
  { category: "Finance", count: 28 },
  { category: "Healthcare", count: 18 },
  { category: "Retail", count: 9 },
];

const pieChartConfig: Config = {
  type: "pie",
  title: "Industry Distribution",
  description: "Distribution of companies by industry sector.",
  takeaway: "Technology sector dominates with 45% of the portfolio.",
  xKey: "category",
  yKeys: ["count"],
  legend: true,
};

export const PieChart: Story = {
  args: {
    chartData: pieChartData,
    chartConfig: pieChartConfig,
  },
};

// Multi-line chart with categories
const multiLineData: Result[] = [
  { year: "2020", region: "North", sales: 120 },
  { year: "2020", region: "South", sales: 95 },
  { year: "2020", region: "East", sales: 80 },
  { year: "2021", region: "North", sales: 150 },
  { year: "2021", region: "South", sales: 110 },
  { year: "2021", region: "East", sales: 105 },
  { year: "2022", region: "North", sales: 180 },
  { year: "2022", region: "South", sales: 135 },
  { year: "2022", region: "East", sales: 125 },
];

const multiLineConfig: Config = {
  type: "line",
  title: "Regional Sales Comparison",
  description: "Sales performance across different regions over time.",
  takeaway: "North region consistently outperforms other regions.",
  xKey: "year",
  yKeys: ["sales"],
  multipleLines: true,
  measurementColumn: "sales",
  lineCategories: ["North", "South", "East"],
  legend: true,
};

export const MultiLineChart: Story = {
  args: {
    chartData: multiLineData,
    chartConfig: multiLineConfig,
  },
};

// Stacked bar chart with multiple y-keys
const stackedBarData: Result[] = [
  { quarter: "Q1", desktop: 450, mobile: 230, tablet: 120 },
  { quarter: "Q2", desktop: 480, mobile: 290, tablet: 150 },
  { quarter: "Q3", desktop: 520, mobile: 350, tablet: 180 },
  { quarter: "Q4", desktop: 590, mobile: 420, tablet: 210 },
];

const stackedBarConfig: Config = {
  type: "bar",
  title: "Device Usage by Quarter",
  description: "Breakdown of user sessions by device type across quarters.",
  takeaway: "Mobile usage is growing faster than desktop and tablet combined.",
  xKey: "quarter",
  yKeys: ["desktop", "mobile", "tablet"],
  legend: true,
};

export const StackedBarChart: Story = {
  args: {
    chartData: stackedBarData,
    chartConfig: stackedBarConfig,
  },
};
