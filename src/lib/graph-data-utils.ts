import type { Cell, CellWithRowAndCol } from "@fortune-sheet/core";
import { parseRangeReference } from "./fortune-sheet-utils";

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
  const parsed = parseRangeReference(range);
  if (parsed.start.col !== parsed.end.col) {
    throw new Error(`Range ${range} must reference a single column.`);
  }
  return {
    column: columnIndexToLabel(parsed.start.col),
    startRow: parsed.start.row + 1,
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

function columnIndexToLabel(index: number): string {
  if (index < 0) {
    throw new Error(`Column index must be non-negative. Received: ${index}`);
  }
  let label = "";
  let current = index;
  while (current >= 0) {
    label = String.fromCharCode((current % 26) + 65) + label;
    current = Math.floor(current / 26) - 1;
  }
  return label;
}

function resolveCellPrimitive(cell: Cell | null): string | number | boolean | null {
  if (!cell) {
    return null;
  }

  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === "object") {
      return cell.m ?? null;
    }
    return cell.v as unknown as string | number | boolean;
  }

  if (cell.m !== undefined && cell.m !== null) {
    return cell.m as unknown as string | number | boolean;
  }

  return null;
}

/**
 * Extracts numeric values from an array of Cell objects.
 * Coerces values to numbers where possible.
 */
export function extractNumericValues(cells: CellWithRowAndCol[]): number[] {
  return cells.map(({ v }) => {
    const value = resolveCellPrimitive(v ?? null);
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }
    return 0;
  });
}

/**
 * Extracts string labels from an array of Cell objects.
 */
export function extractLabels(cells: CellWithRowAndCol[]): string[] {
  return cells.map(({ v }) => {
    const value = resolveCellPrimitive(v ?? null);
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  });
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
