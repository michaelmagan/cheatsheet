"use client";

import { fortuneSheetStore } from "@/lib/fortune-sheet-store";
import {
  buildCelldataLookup,
  columnIndexToLetter,
  getCellFromLookup,
  getSheetColumnCount,
  getSheetRowCount,
} from "@/lib/fortune-sheet-utils";
import type { Cell } from "@fortune-sheet/core";

function resolveCellDisplay(cell: Cell | null): string {
  if (!cell) {
    return "";
  }

  // Task 5.1: Show formula indicators in cells
  // Format: "150 (=SUM...)" for formulas, just "150" for values
  let displayValue = "";

  if (cell.m !== undefined && cell.m !== null) {
    displayValue = String(cell.m);
  } else if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === "object") {
      displayValue = cell.m !== undefined && cell.m !== null ? String(cell.m) : "";
    } else {
      displayValue = String(cell.v);
    }
  }

  // If cell has a formula, append truncated formula indicator
  if (cell.f !== undefined && cell.f !== null) {
    const formula = String(cell.f);
    // Truncate long formulas to first 20 chars
    const truncatedFormula = formula.length > 20
      ? formula.substring(0, 20) + "..."
      : formula;
    displayValue = displayValue
      ? `${displayValue} (${truncatedFormula})`
      : `(${truncatedFormula})`;
  }

  return displayValue;
}

function formatSheetAsMarkdown(): string | null {
  const { sheets, activeSheetId } = fortuneSheetStore.getState();
  if (!sheets || sheets.length === 0) {
    return null;
  }

  const targetSheet =
    sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0];
  if (!targetSheet) {
    return null;
  }

  const totalRows = getSheetRowCount(targetSheet);
  const totalColumns = getSheetColumnCount(targetSheet);
  const lookup = buildCelldataLookup(targetSheet);

  // === Single-pass analysis ===
  const occupiedRows = new Set<number>();
  const occupiedCols = new Set<number>();
  const formulaPatterns = new Map<string, number>();
  const errors: Array<{ address: string; error: string }> = [];
  const cellsByRegion = new Map<string, number>(); // Track cell density

  let nonEmptyCount = 0;
  let formulaCount = 0;

  for (const [key, cell] of lookup.entries()) {
    if (!cell) continue;

    const isEmpty =
      (cell.v === undefined || cell.v === null || cell.v === "") &&
      (cell.f === undefined || cell.f === null);

    if (isEmpty) continue;

    // Parse coordinates from lookup key (format: "row:col")
    const parts = key.split(":");
    const row = parseInt(parts[0]);
    const col = parseInt(parts[1]);

    nonEmptyCount++;
    occupiedRows.add(row);
    occupiedCols.add(col);

    // Track formulas
    if (cell.f !== undefined && cell.f !== null) {
      formulaCount++;
      const simplified = simplifyFormula(String(cell.f));
      formulaPatterns.set(
        simplified,
        (formulaPatterns.get(simplified) || 0) + 1
      );
    }

    // Track errors
    const cellValue = cell.v || cell.m;
    if (cellValue && typeof cellValue === "string") {
      if (
        cellValue.startsWith("#") &&
        (cellValue.includes("ERROR") ||
          cellValue.includes("REF") ||
          cellValue.includes("DIV") ||
          cellValue.includes("VALUE") ||
          cellValue.includes("NAME") ||
          cellValue.includes("NULL") ||
          cellValue.includes("NUM") ||
          cellValue === "#N/A")
      ) {
        const address = `${columnIndexToLetter(col)}${row + 1}`;
        errors.push({ address, error: String(cellValue) });
      }
    }

    // Track density by 10x10 regions for clustering
    const regionKey = `${Math.floor(row / 10)}_${Math.floor(col / 10)}`;
    cellsByRegion.set(regionKey, (cellsByRegion.get(regionKey) || 0) + 1);
  }

  // === Find dense regions (20+ cells in close proximity) ===
  const denseRegions = findDenseRegions(lookup, cellsByRegion);

  // === Format output ===
  const parts: string[] = [];

  parts.push(`Spreadsheet: ${targetSheet.name}`);
  parts.push(`Dimensions: ${totalRows} rows × ${totalColumns} cols`);
  parts.push(`Occupied rows: ${compressRanges(Array.from(occupiedRows).sort((a, b) => a - b))}`);
  parts.push(`Occupied columns: ${compressColumns(Array.from(occupiedCols).sort((a, b) => a - b))}`);
  parts.push(`Non-empty cells: ${nonEmptyCount} (${((nonEmptyCount / (totalRows * totalColumns)) * 100).toFixed(1)}%)`);

  if (formulaCount > 0) {
    parts.push(`Formulas: ${formulaCount}`);
  }

  if (errors.length > 0) {
    parts.push(`Errors: ${errors.map(e => `${e.address} (${e.error})`).join(", ")}`);
  }

  if (formulaPatterns.size > 0) {
    const topPatterns = Array.from(formulaPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => `${pattern} (${count}×)`)
      .join(", ");
    parts.push(`Formula patterns: ${topPatterns}`);
  }

  if (denseRegions.length > 0) {
    parts.push(`Dense regions: ${denseRegions.map(r => r.range).join(", ")}`);
  }

  const sparseCells = findSparseCells(lookup, denseRegions, 3);
  if (sparseCells.length > 0) {
    parts.push(`Sparse cells: ${sparseCells.map(s => s.address).join(", ")}`);
  }

  parts.push(""); // blank line
  parts.push("Before updating: readSpreadsheetRange() the region first, then only update cells that need changes.");

  return parts.join("\n");
}

// === Helper functions ===

function simplifyFormula(formula: string): string {
  // Simplify formulas to show pattern, not specific cells
  // =SUM(E2:E50) -> =SUM(E:E)
  // =C2*D2 -> =C*D
  let simplified = formula.replace(/([A-Z]+)\d+/g, "$1");

  // Truncate long formulas
  if (simplified.length > 40) {
    simplified = simplified.substring(0, 37) + "...";
  }

  return simplified;
}

function compressRanges(rows: number[]): string {
  if (rows.length === 0) return "none";

  const ranges: string[] = [];
  let start = rows[0];
  let end = rows[0];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i] === end + 1) {
      end = rows[i];
    } else {
      ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
      start = end = rows[i];
    }
  }
  ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);

  return ranges.join(", ");
}

function compressColumns(cols: number[]): string {
  if (cols.length === 0) return "none";

  const ranges: string[] = [];
  let start = cols[0];
  let end = cols[0];

  for (let i = 1; i < cols.length; i++) {
    if (cols[i] === end + 1) {
      end = cols[i];
    } else {
      const startLetter = columnIndexToLetter(start);
      const endLetter = columnIndexToLetter(end);
      ranges.push(start === end ? startLetter : `${startLetter}-${endLetter}`);
      start = end = cols[i];
    }
  }
  const startLetter = columnIndexToLetter(start);
  const endLetter = columnIndexToLetter(end);
  ranges.push(start === end ? startLetter : `${startLetter}-${endLetter}`);

  return ranges.join(", ");
}

function findDenseRegions(
  lookup: Map<string, Cell | null>,
  regionDensity: Map<string, number>
): Array<{
  range: string;
  totalCells: number;
  nonEmptyCells: number;
}> {
  const denseRegions: Array<{
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    count: number;
  }> = [];

  // Find 10x10 regions with >20 cells, then expand to exact bounds
  for (const [regionKey, count] of regionDensity.entries()) {
    if (count < 20) continue;

    const [regionRow, regionCol] = regionKey.split("_").map(Number);
    const baseRow = regionRow * 10;
    const baseCol = regionCol * 10;

    // Find exact bounds of cells in this region
    let minRow = Infinity,
      maxRow = -Infinity;
    let minCol = Infinity,
      maxCol = -Infinity;
    let cellCount = 0;

    for (let r = baseRow; r < baseRow + 10; r++) {
      for (let c = baseCol; c < baseCol + 10; c++) {
        const cell = getCellFromLookup(lookup, r, c);
        if (cell && !isCellEmpty(cell)) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
          cellCount++;
        }
      }
    }

    if (cellCount >= 20) {
      denseRegions.push({ minRow, maxRow, minCol, maxCol, count: cellCount });
    }
  }

  // Format regions
  return denseRegions.map((region) => {
    const range = `${columnIndexToLetter(region.minCol)}${region.minRow + 1}:${columnIndexToLetter(region.maxCol)}${region.maxRow + 1}`;
    const totalCells =
      (region.maxRow - region.minRow + 1) * (region.maxCol - region.minCol + 1);

    return {
      range,
      totalCells,
      nonEmptyCells: region.count,
    };
  });
}

function findSparseCells(
  lookup: Map<string, Cell | null>,
  denseRegions: Array<{ range: string }>,
  limit: number
): Array<{ address: string; preview: string }> {
  const sparse: Array<{ address: string; preview: string }> = [];

  for (const [key, cell] of lookup.entries()) {
    if (!cell || isCellEmpty(cell)) continue;

    const parts = key.split(":");
    const row = parseInt(parts[0]);
    const col = parseInt(parts[1]);

    // Check if cell is in any dense region
    const inDenseRegion = denseRegions.some((region) => {
      const [startPart, endPart] = region.range.split(":");
      const [startCol, startRow] = parseA1Notation(startPart);
      const [endCol, endRow] = parseA1Notation(endPart);
      return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
    });

    if (!inDenseRegion) {
      const address = `${columnIndexToLetter(col)}${row + 1}`;
      const preview = truncateValue(resolveCellDisplay(cell), 30);
      sparse.push({ address, preview });

      if (sparse.length >= limit) break;
    }
  }

  return sparse;
}

function findEmptyRanges(occupiedRows: number[], totalRows: number): string[] {
  const emptyRanges: string[] = [];
  let gapStart: number | null = null;

  for (let i = 0; i < totalRows; i++) {
    if (!occupiedRows.includes(i)) {
      if (gapStart === null) gapStart = i;
    } else {
      if (gapStart !== null) {
        const gapSize = i - gapStart;
        if (gapSize >= 10) {
          // Only show gaps of 10+ rows
          emptyRanges.push(
            gapStart === i - 1 ? `${gapStart + 1}` : `${gapStart + 1}-${i}`
          );
        }
        gapStart = null;
      }
    }
  }

  return emptyRanges.slice(0, 3); // Limit to 3 ranges
}

function findEmptyColumns(
  occupiedCols: number[],
  totalColumns: number
): string[] {
  const emptyRanges: string[] = [];
  let gapStart: number | null = null;

  for (let i = 0; i < totalColumns; i++) {
    if (!occupiedCols.includes(i)) {
      if (gapStart === null) gapStart = i;
    } else {
      if (gapStart !== null) {
        const gapSize = i - gapStart;
        if (gapSize >= 3) {
          // Show gaps of 3+ columns
          const start = columnIndexToLetter(gapStart);
          const end = columnIndexToLetter(i - 1);
          emptyRanges.push(gapStart === i - 1 ? start : `${start}-${end}`);
        }
        gapStart = null;
      }
    }
  }

  return emptyRanges.slice(0, 3);
}

function isCellEmpty(cell: Cell): boolean {
  return (
    (cell.v === undefined || cell.v === null || cell.v === "") &&
    (cell.f === undefined || cell.f === null)
  );
}

function truncateValue(value: string | null, maxLen: number): string {
  if (!value) return "(empty)";
  if (value.length <= maxLen) return JSON.stringify(value);
  return JSON.stringify(value.substring(0, maxLen - 3)) + '..."';
}

function parseA1Notation(a1: string): [col: number, row: number] {
  const match = a1.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid A1 notation: ${a1}`);

  const colStr = match[1];
  const rowNum = parseInt(match[2]) - 1;

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1; // Convert to 0-indexed

  return [col, rowNum];
}

export const spreadsheetContextHelper = () => {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return formatSheetAsMarkdown();
  } catch (error) {
    console.error("Error in spreadsheetContextHelper:", error);
    return null;
  }
};
