import type { TamboComponent } from "@tambo-ai/react";
import { Graph, graphSchema } from "./graph";

/**
 * Graph Component Configuration for Tambo
 *
 * This component allows the AI to create charts and graphs from spreadsheet data.
 * The AI can render bar charts, line charts, and pie charts by reading data from
 * spreadsheet tabs.
 */
export const graphComponent: TamboComponent = {
  name: "graph",
  description: `
Creates interactive charts from spreadsheet data. Use this when a user requests a chart, graph, or data visualization.

## How to Analyze Spreadsheet Structure

Before creating a chart, analyze the spreadsheet structure:

1. **Identify Label Column**: Look for the column containing text labels (categories, dates, names)
   - Typically the leftmost column (Column A)
   - Contains non-numeric data that describes each row

2. **Identify Data Columns**: Look for columns containing numeric values to visualize
   - These are the values you'll plot on the chart
   - Can have multiple data columns for multi-series charts

3. **Choose Chart Type** based on the data characteristics:
   - **Bar Chart**: Best for comparing values across different categories
     Example: Sales by region, scores by student, revenue by month
   - **Line Chart**: Best for showing trends over time or continuous data
     Example: Stock prices over time, temperature changes, growth metrics
   - **Pie Chart**: Best for showing proportions of a whole (requires single dataset only)
     Example: Market share distribution, budget allocation, demographic breakdown

## Configuration Requirements

Always use the \`spreadsheetData\` property with these fields:

- **tabId** (required): The ID of the active spreadsheet tab
  - Get this from the current context (typically provided as \`activeTabId\`)

- **labelsRange** (required): A1 notation for the labels column
  - Must be an explicit range (e.g., "A2:A10")
  - Cannot use open-ended ranges (e.g., "A2:A" is invalid)
  - Usually excludes the header row (start from row 2)

- **dataSets** (required): Array of data series to plot
  - Each dataset object contains:
    * \`label\`: Name for this data series (e.g., "Sales", "Revenue")
    * \`range\`: A1 notation for the data values (e.g., "B2:B10")
    * \`color\`: (optional) Custom color for this series
  - Maximum 5 datasets per chart
  - For pie charts, use exactly 1 dataset

## Example Workflow

**Scenario**: User has selected cells A1:C10 with headers in row 1, categories in column A, sales data in column B, and costs in column C.

**Analysis**:
- Column A (A2:A10): Contains category labels (text)
- Column B (B2:B10): Contains numeric sales data
- Column C (C2:C10): Contains numeric cost data
- User wants to compare sales and costs → Bar chart is appropriate

**Generated Component**:
\`\`\`tsx
<Graph
  type="bar"
  title="Sales vs Costs by Category"
  spreadsheetData={{
    tabId: activeTabId,
    labelsRange: "A2:A10",
    dataSets: [
      { label: "Sales", range: "B2:B10", color: "#4f46e5" },
      { label: "Costs", range: "C2:C10", color: "#ef4444" }
    ]
  }}
  showLegend={true}
  variant="default"
  size="default"
/>
\`\`\`

## Important Constraints

1. **Range Specification**: All ranges must be explicit with both start and end cells
   - Valid: "A2:A10", "B1:B20"
   - Invalid: "A2:A", "B:B"

2. **Dataset Limits**: Maximum 5 datasets per chart
   - Charts with more than 5 datasets will show an error
   - For pie charts, use exactly 1 dataset

3. **Single Tab Reference**: Each chart can only reference data from one tab
   - The tabId must match the tab containing all specified ranges

4. **Header Handling**: Typically exclude header rows from ranges
   - If row 1 contains headers, start data ranges from row 2
   - Example: If data is in rows 1-10 with headers, use "A2:A10" not "A1:A10"

## Chart Type Guidelines

**Bar Chart** - Use for categorical comparisons
- Best when comparing discrete categories
- Good for multiple data series
- Example use cases: Comparing performance across teams, sales by product, scores by category

**Line Chart** - Use for trends and continuous data
- Best for time-series data
- Shows progression and patterns
- Example use cases: Revenue over months, temperature over time, user growth

**Pie Chart** - Use for part-to-whole relationships
- Requires exactly 1 dataset
- Best with 2-7 slices (too many becomes unreadable)
- Example use cases: Market share, budget breakdown, demographic distribution

## Additional Properties

- **title** (optional): Display title for the chart
- **showLegend** (optional, default: true): Whether to show the legend
- **variant** (optional): Visual style - "default", "solid", or "bordered"
- **size** (optional): Chart height - "sm", "default", or "lg"
`.trim(),
  component: Graph,
  propsSchema: graphSchema,
};
