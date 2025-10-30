import { Cell } from "@/types/spreadsheet";

/**
 * Parses a range reference and extracts the column letter and starting row.
 * Examples:
 * - "B2:B10" -> { column: "B", startRow: 2 }
 * - "C5:C20" -> { column: "C", startRow: 5 }
 */
export function parseRangeForColumn(range: string): {
  column: string;
  startRow: number;
} {
  const match = range.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid range format: ${range}`);
  }

  return {
    column: match[1],
    startRow: parseInt(match[2], 10),
  };
}

/**
 * Generates a cell reference for the header cell of a given range.
 * For a range like "B2:B10", returns "B1:B1" (assumes row 1 is the header).
 * For a range like "C5:C20", returns "C1:C1".
 *
 * @param range - A1 notation range (e.g., "B2:B10")
 * @returns Header cell reference as range format (e.g., "B1:B1")
 */
export function getHeaderCellReference(range: string): string {
  const { column } = parseRangeForColumn(range);
  const headerCell = `${column}1`;
  return `${headerCell}:${headerCell}`; // Return as range format
}

/**
 * Extracts numeric values from an array of Cell objects.
 * - For "number" cell type: uses cell.value
 * - For "text" cell type: attempts to coerce to number using parseFloat
 * - For "header" cell type: defaults to 0
 * - Defaults to 0 if coercion fails
 */
export function extractNumericValues(cells: Cell[]): number[] {
  return cells.map((cell) => {
    if (cell.type === "number") {
      return typeof cell.value === "number" ? cell.value : 0;
    }

    if (cell.type === "text") {
      const parsed = parseFloat(cell.text);
      return isNaN(parsed) ? 0 : parsed;
    }

    // For "header" or any other cell type, default to 0
    return 0;
  });
}

/**
 * Extracts string labels from an array of Cell objects.
 * - For "text" cell type: uses cell.text
 * - For "number" cell type: converts to string using String(cell.value)
 * - For "header" cell type: uses cell.text
 * - Defaults to empty string if undefined
 */
export function extractLabels(cells: Cell[]): string[] {
  const labels = cells.map((cell) => {
    if (cell.type === "text") {
      return cell.text ?? "";
    }

    if (cell.type === "number") {
      return cell.value !== undefined ? String(cell.value) : "";
    }

    if (cell.type === "header") {
      return cell.text ?? "";
    }

    // Default to empty string for any other cell type
    return "";
  });

  // Debug logging to help diagnose label issues
  if (process.env.NODE_ENV === "development") {
    console.log("[extractLabels] Input cells:", cells);
    console.log("[extractLabels] Output labels:", labels);
  }

  return labels;
}

/**
 * Transforms labels and datasets into Recharts-compatible format.
 * Creates an array of objects where each object represents one data point.
 * Structure: [{ name: label[0], dataKey1: datasets[0].data[0], dataKey2: datasets[1].data[0] }, ...]
 *
 * @param labels - Array of labels for the x-axis
 * @param datasets - Array of dataset objects containing label, data, and optional color
 * @returns Array of objects in Recharts format
 */
export function transformToRechartsData(
  labels: string[],
  datasets: { label: string; data: number[]; color?: string }[]
): Record<string, string | number>[] {
  if (labels.length === 0) {
    return [];
  }

  // Find the minimum length to avoid index out of bounds
  const minLength = Math.min(
    labels.length,
    ...datasets.map((dataset) => dataset.data.length)
  );

  // Create array of objects in Recharts format
  const result: Record<string, string | number>[] = [];

  for (let i = 0; i < minLength; i++) {
    const dataPoint: Record<string, string | number> = {
      name: labels[i],
    };

    // Add each dataset's value at index i with the dataset label as the key
    datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[i];
    });

    result.push(dataPoint);
  }

  return result;
}
