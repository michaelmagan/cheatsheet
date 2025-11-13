"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useMemo } from "react";
import * as RechartsCore from "recharts";
import { z } from "zod";
import { useSpreadsheetData } from "@/hooks/useSpreadsheetData";
import { useMultipleSpreadsheetData } from "@/hooks/useMultipleSpreadsheetData";
import {
  extractNumericValues,
  extractLabels,
  transformToRechartsData,
  getHeaderCellReference,
} from "@/lib/graph-data-utils";
import { useFortuneSheet } from "@/lib/fortune-sheet-store";
import { useTamboStreamStatus } from "@tambo-ai/react";

/**
 * Represents a graph with spreadsheet data source
 * @property {string} type - Type of graph to render
 * @property {object} spreadsheetData - Configuration for fetching data from spreadsheet
 */

export const graphSchema = z.object({
  type: z.enum(["bar", "line", "pie", "stacked-bar", "stacked-area", "combo"]).describe("Type of graph to render"),
  spreadsheetData: z
    .object({
      tabId: z.string().describe("ID of the spreadsheet tab to read from"),
      labelsRange: z
        .string()
        .describe("A1 notation range for labels (e.g., 'A1:A5')"),
      dataSets: z
        .array(
          z.object({
            range: z
              .string()
              .describe("A1 notation range for data (e.g., 'B2:B10'). Label will be read from the header cell (row 1) of this column"),
            color: z.string().optional().describe("Optional color for the dataset"),
            chartType: z.enum(["bar", "line"]).optional().describe("For combo charts: specify 'bar' or 'line' for this dataset (default: bar)"),
            yAxisId: z.enum(["left", "right"]).optional().describe("For multi-axis charts: specify 'left' or 'right' axis (default: left)"),
          }),
        )
        .describe("Array of datasets to display (max 10)"),
    })
    .describe("Configuration for fetching data from spreadsheet"),
  title: z.string().describe("Title for the chart"),
  showLegend: z
    .boolean()
    .optional()
    .describe("Whether to show the legend (default: true)"),
  variant: z
    .enum(["default", "solid", "bordered"])
    .optional()
    .describe("Visual style variant of the graph"),
  size: z
    .enum(["default", "sm", "lg"])
    .optional()
    .describe("Size of the graph"),
});

// Extend the GraphProps with additional tambo properties
export interface GraphProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "size">,
    Omit<VariantProps<typeof graphVariants>, "size" | "variant"> {
  /** Type of graph to render */
  type: "bar" | "line" | "pie" | "stacked-bar" | "stacked-area" | "combo";
  /** Configuration for fetching data from spreadsheet */
  spreadsheetData: {
    tabId: string;
    labelsRange: string;
    dataSets: Array<{
      range: string;
      color?: string;
      chartType?: "bar" | "line";
      yAxisId?: "left" | "right";
    }>;
  };
  /** Optional title for the chart */
  title?: string;
  /** Whether to show the legend (default: true) */
  showLegend?: boolean;
  /** Visual style variant of the graph */
  variant?: "default" | "solid" | "bordered";
  /** Size of the graph */
  size?: "default" | "sm" | "lg";
}

const graphVariants = cva(
  "w-full rounded-lg overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-background",
        solid: [
          "shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/20",
          "bg-muted",
        ].join(" "),
        bordered: ["border-2", "border-border"].join(" "),
      },
      size: {
        default: "h-80",
        sm: "h-64",
        lg: "h-[500px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const defaultColors = [
  "hsl(220, 100%, 62%)", // Blue
  "hsl(160, 82%, 47%)", // Green
  "hsl(32, 100%, 62%)", // Orange
  "hsl(340, 82%, 66%)", // Pink
];

/**
 * A component that renders various types of charts using Recharts
 * Fetches data from spreadsheet tabs using the useSpreadsheetData hook
 * @component
 * @example
 * ```tsx
 * <Graph
 *   type="bar"
 *   spreadsheetData={{
 *     tabId: "tab-123",
 *     labelsRange: "A2:A6",
 *     dataSets: [
 *       { range: "B2:B6" },  // Label from B1
 *       { range: "C2:C6", color: "#4f46e5" }  // Label from C1
 *     ]
 *   }}
 *   title="Monthly Sales"
 *   variant="solid"
 *   size="lg"
 *   className="custom-styles"
 * />
 * ```
 */
export const Graph = React.forwardRef<HTMLDivElement, GraphProps>(
  (
    {
      className,
      variant,
      size,
      type,
      spreadsheetData,
      title,
      showLegend = true,
      ...props
    },
    ref,
  ) => {
    // Component-specific streaming status - tracks this component's props
    const { streamStatus } = useTamboStreamStatus<GraphProps>();

    const isStreaming = streamStatus.isPending || streamStatus.isStreaming;

    // Safe destructuring with defaults for streaming props
    const {
      tabId = "",
      labelsRange = "A1",
      dataSets = []
    } = spreadsheetData || {};

    const { sheets, activeSheetId: activeTabId } = useFortuneSheet();

    // Fetch labels using single hook
    const labelsData = useSpreadsheetData({ tabId, range: labelsRange });

    // Fetch all datasets with a single hook call (supports up to 10 datasets)
    const { data: dataSetResults } = useMultipleSpreadsheetData(
      tabId,
      dataSets.map(ds => ds.range)
    );

    // Fetch header cells for ALL datasets (labels always come from headers)
    const headerRanges = dataSets.map(ds => {
      try {
        return getHeaderCellReference(ds.range);
      } catch {
        return null; // Invalid range format
      }
    });

    // Fetch headers for all datasets
    const { data: headerResults } = useMultipleSpreadsheetData(
      tabId,
      headerRanges.filter((h): h is string => h !== null)
    );

    // Process data using useMemo to avoid cascading renders from useEffect
    // This MUST come before any conditional returns to comply with Rules of Hooks
    const { processedData, processedLabels, processingError, isLoading } = useMemo(() => {
      // Check if any data is still loading
      const loading = labelsData.loading || dataSetResults.some((ds) => ds.loading) || headerResults.some((hr) => hr.loading);
      if (loading) {
        return { processedData: null, processedLabels: [], processingError: null, isLoading: true };
      }

      // Check for errors
      const errors: string[] = [];
      if (labelsData.error) {
        errors.push(`Labels (${labelsRange}): ${labelsData.error}`);
      }
      dataSetResults.forEach((ds, idx) => {
        if (ds.error) {
          errors.push(`Dataset ${idx + 1} (${dataSets[idx].range}): ${ds.error}`);
        }
      });
      headerResults.forEach((hr, idx) => {
        if (hr.error) {
          // Find which dataset this header corresponds to
          const headerIdx = headerRanges.findIndex((h, i) => h !== null && headerRanges.slice(0, i).filter(x => x !== null).length === idx);
          if (headerIdx !== -1) {
            errors.push(`Header for dataset ${headerIdx + 1}: ${hr.error}`);
          }
        }
      });

      if (errors.length > 0) {
        return {
          processedData: null,
          processedLabels: [],
          processingError: errors.join("\n"),
          isLoading: false
        };
      }

      // Check if we have valid data
      if (!labelsData.cells || labelsData.cells.length === 0) {
        return {
          processedData: null,
          processedLabels: [],
          processingError: "No label data available",
          isLoading: false
        };
      }

      try {
        // Extract labels
        const labels = extractLabels(labelsData.cells);

        // Map header results back to their original dataset indices
        let headerResultIdx = 0;
        const datasetLabels = dataSets.map((_ds, idx) => {
          // If no header range was generated (invalid range), use fallback
          if (!headerRanges[idx]) {
            return `Dataset ${idx + 1}`;
          }

          // Extract label from header cell
          const headerResult = headerResults[headerResultIdx++];
          if (headerResult && headerResult.cells && headerResult.cells.length > 0) {
            const headerLabels = extractLabels(headerResult.cells);
            return headerLabels[0] || `Dataset ${idx + 1}`;
          }

          // Fallback if header cell is empty or missing
          return `Dataset ${idx + 1}`;
        });

        // Extract numeric values for each dataset
        const processedDataSets = dataSetResults.map((ds, idx) => {
          const cells = ds.cells || [];
          const numericValues = extractNumericValues(cells);
          return {
            label: datasetLabels[idx],
            data: numericValues,
            color: dataSets[idx].color,
          };
        });

        // Transform to Recharts format
        const chartData = transformToRechartsData(labels, processedDataSets);

        if (chartData.length === 0) {
          return {
            processedData: null,
            processedLabels: [],
            processingError: "No data available to display",
            isLoading: false
          };
        }

        return {
          processedData: chartData,
          processedLabels: datasetLabels,
          processingError: null,
          isLoading: false
        };
      } catch (error) {
        return {
          processedData: null,
          processedLabels: [],
          processingError: error instanceof Error ? error.message : "Unknown error processing data",
          isLoading: false
        };
      }
    }, [
      labelsData.loading,
      labelsData.error,
      labelsData.cells,
      labelsRange,
      dataSets,
      dataSetResults,
      headerResults,
      headerRanges,
    ]);

    // Validate minimum required data
    const hasMinimumData = tabId && labelsRange && dataSets?.length > 0;

    // Show loading during component streaming if minimum data hasn't arrived yet
    if (!hasMinimumData && isStreaming) {
      return (
        <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="text-center">
            <div className="mb-2 text-sm text-gray-600">
              Configuring chart...
            </div>
          </div>
        </div>
      );
    }

    // If minimum data is still missing after generation completes, show awaiting state
    if (!hasMinimumData) {
      return (
        <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="text-center">
            <div className="mb-2 text-sm text-gray-600">
              Awaiting chart data...
            </div>
          </div>
        </div>
      );
    }

    // Show loading state FIRST - before any validation errors
    // This prevents error flashes during initial data processing
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
          {...props}
        >
          <div className="p-4 h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-1 h-4">
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.1s]"></span>
              </div>
              <span className="text-sm">Awaiting data...</span>
            </div>
          </div>
        </div>
      );
    }

    // Check for too many datasets AFTER loading check
    // useMultipleSpreadsheetData supports up to 10 datasets
    if (dataSets.length > 10) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
          {...props}
        >
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-destructive text-center">
              <p className="font-medium">Too many datasets</p>
              <p className="text-sm mt-1">
                Maximum 10 datasets supported. You provided {dataSets.length}.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Show error state
    if (processingError) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
          {...props}
        >
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-destructive text-center">
              <p className="font-medium">Error loading chart</p>
              <p className="text-sm mt-1 whitespace-pre-line">{processingError}</p>
            </div>
          </div>
        </div>
      );
    }

    // Show empty state
    if (!processedData || processedData.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
          {...props}
        >
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">No data available</p>
            </div>
          </div>
        </div>
      );
    }

    // Check if data is stale (chart references a different tab than the active one)
    const resolvedTabCandidates = [
      labelsData.resolvedSheetId,
      ...dataSetResults.map((ds) => ds.resolvedSheetId),
      ...headerResults.map((hr) => hr.resolvedSheetId),
    ].filter((candidate): candidate is string => Boolean(candidate));

    const resolvedTabId = resolvedTabCandidates[0] ?? null;

    const activeSheet = sheets.find((sheet) => sheet.id === activeTabId);
    const tabMatchesActiveName = Boolean(
      activeSheet && tabId && activeSheet.name === tabId,
    );

    const isStale = Boolean(
      activeTabId &&
        ((resolvedTabId && activeTabId !== resolvedTabId) ||
          (!resolvedTabId && tabId && !tabMatchesActiveName && activeTabId !== tabId)),
    );

    // Chart rendering logic
    const renderChart = () => {
      if (!["bar", "line", "pie", "stacked-bar", "stacked-area", "combo"].includes(type)) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">Unsupported chart type: {type}</p>
            </div>
          </div>
        );
      }

      switch (type) {
        case "bar":
          return (
            <RechartsCore.BarChart data={processedData}>
              <RechartsCore.CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <RechartsCore.XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.Tooltip
                cursor={{
                  fill: "hsl(var(--muted-foreground))",
                  fillOpacity: 0.1,
                  radius: 4,
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
              {processedLabels.map((label, index) => (
                <RechartsCore.Bar
                  key={label}
                  dataKey={label}
                  fill={
                    dataSets[index].color ??
                    defaultColors[index % defaultColors.length]
                  }
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </RechartsCore.BarChart>
          );

        case "stacked-bar":
          return (
            <RechartsCore.BarChart data={processedData}>
              <RechartsCore.CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <RechartsCore.XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.Tooltip
                cursor={{
                  fill: "hsl(var(--muted-foreground))",
                  fillOpacity: 0.1,
                  radius: 4,
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
              {processedLabels.map((label, index) => (
                <RechartsCore.Bar
                  key={label}
                  dataKey={label}
                  stackId="stack"
                  fill={
                    dataSets[index].color ??
                    defaultColors[index % defaultColors.length]
                  }
                  radius={index === processedLabels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </RechartsCore.BarChart>
          );

        case "line":
          return (
            <RechartsCore.LineChart data={processedData}>
              <RechartsCore.CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <RechartsCore.XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.Tooltip
                cursor={{
                  stroke: "hsl(var(--muted))",
                  strokeWidth: 2,
                  strokeOpacity: 0.3,
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
              {processedLabels.map((label, index) => (
                <RechartsCore.Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={
                    dataSets[index].color ??
                    defaultColors[index % defaultColors.length]
                  }
                  dot={false}
                />
              ))}
            </RechartsCore.LineChart>
          );

        case "stacked-area":
          return (
            <RechartsCore.AreaChart data={processedData}>
              <RechartsCore.CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <RechartsCore.XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.Tooltip
                cursor={{
                  stroke: "hsl(var(--muted))",
                  strokeWidth: 2,
                  strokeOpacity: 0.3,
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
              {processedLabels.map((label, index) => (
                <RechartsCore.Area
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stackId="stack"
                  stroke={
                    dataSets[index].color ??
                    defaultColors[index % defaultColors.length]
                  }
                  fill={
                    dataSets[index].color ??
                    defaultColors[index % defaultColors.length]
                  }
                  fillOpacity={0.6}
                />
              ))}
            </RechartsCore.AreaChart>
          );

        case "pie": {
          // For pie charts, transform processedData into pie format
          // Use the first dataset's values with the labels
          if (dataSets.length === 0) {
            return (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground text-center">
                  <p className="text-sm">No dataset for pie chart</p>
                </div>
              </div>
            );
          }

          const pieData = processedData.map((item, index) => ({
            name: item.name as string,
            value: item[processedLabels[0]] as number,
            fill: defaultColors[index % defaultColors.length],
          }));

          return (
            <RechartsCore.PieChart>
              <RechartsCore.Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
              />
              <RechartsCore.Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
            </RechartsCore.PieChart>
          );
        }

        case "combo": {
          // Combo chart with bars and lines on the same chart
          // Supports multi-axis with left and right Y-axes
          const hasRightAxis = dataSets.some(ds => ds.yAxisId === "right");

          return (
            <RechartsCore.ComposedChart data={processedData}>
              <RechartsCore.CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <RechartsCore.XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <RechartsCore.YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              {hasRightAxis && (
                <RechartsCore.YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
              )}
              <RechartsCore.Tooltip
                cursor={{
                  fill: "hsl(var(--muted-foreground))",
                  fillOpacity: 0.1,
                  radius: 4,
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "hsl(var(--foreground))",
                  }}
                />
              )}
              {processedLabels.map((label, index) => {
                const dataset = dataSets[index];
                const chartType = dataset?.chartType || "bar";
                const yAxisId = dataset?.yAxisId || "left";
                const color = dataset?.color ?? defaultColors[index % defaultColors.length];

                if (chartType === "line") {
                  return (
                    <RechartsCore.Line
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={color}
                      yAxisId={yAxisId}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                } else {
                  return (
                    <RechartsCore.Bar
                      key={label}
                      dataKey={label}
                      fill={color}
                      yAxisId={yAxisId}
                      radius={[4, 4, 0, 0]}
                    />
                  );
                }
              })}
            </RechartsCore.ComposedChart>
          );
        }
      }
    };

    // Render JSX based on processed data
    return (
      <div
        ref={ref}
        className={cn(graphVariants({ variant, size }), className)}
        {...props}
      >
        <div className="p-4 h-full">
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 className="text-lg font-medium text-foreground">{title}</h3>
            )}
            {isStale && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                Data from inactive tab
              </span>
            )}
          </div>
          <div className="w-full h-[calc(100%-3rem)]">
            <RechartsCore.ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </RechartsCore.ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  },
);
Graph.displayName = "Graph";
