"use client";

import type { Cell, CellWithRowAndCol, Sheet } from "@fortune-sheet/core";

export type ParsedCellReference = { row: number; col: number };
export type ParsedRange = {
  start: ParsedCellReference;
  end: ParsedCellReference;
};

export function columnIndexToLetter(index: number): string {
  if (index < 0) {
    throw new Error(`Column index must be non-negative. Received: ${index}`);
  }
  let letter = "";
  let current = index;
  while (current >= 0) {
    letter = String.fromCharCode((current % 26) + 65) + letter;
    current = Math.floor(current / 26) - 1;
  }
  return letter;
}

export function letterToColumnIndex(letter: string): number {
  if (!/^[A-Z]+$/.test(letter)) {
    throw new Error(`Invalid column label: ${letter}`);
  }
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function parseCellReference(ref: string): ParsedCellReference {
  const trimmed = ref.trim().toUpperCase();
  const match = trimmed.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }
  const [, columnLetters, rowDigits] = match;
  const rowNumber = Number(rowDigits);
  if (!Number.isFinite(rowNumber) || rowNumber < 1) {
    throw new Error(
      `Invalid row number in cell reference: ${ref}. Row numbers must be >= 1`
    );
  }
  return {
    col: letterToColumnIndex(columnLetters),
    row: rowNumber - 1,
  };
}

export function parseRangeReference(range: string): ParsedRange {
  const trimmed = range.trim();
  if (!trimmed) {
    throw new Error("Range cannot be empty");
  }
  const parts = trimmed.split(":");
  if (parts.length > 2) {
    throw new Error(`Invalid range format: ${range}`);
  }
  const startRef = parseCellReference(parts[0]);
  const endRef = parts[1]
    ? parseCellReference(parts[1])
    : parseCellReference(parts[0]);

  const startRow = Math.min(startRef.row, endRef.row);
  const endRow = Math.max(startRef.row, endRef.row);
  const startCol = Math.min(startRef.col, endRef.col);
  const endCol = Math.max(startRef.col, endRef.col);

  return {
    start: { row: startRow, col: startCol },
    end: { row: endRow, col: endCol },
  };
}

export function getSheetRowCount(sheet: Sheet): number {
  if (typeof sheet.row === "number" && sheet.row > 0) {
    return sheet.row;
  }
  if (Array.isArray(sheet.data)) {
    return sheet.data.length;
  }
  if (Array.isArray(sheet.celldata) && sheet.celldata.length > 0) {
    const maxRow = Math.max(
      ...sheet.celldata.map((cell) => cell.r ?? 0),
      0
    );
    return maxRow + 1;
  }
  return 0;
}

export function getSheetColumnCount(sheet: Sheet): number {
  if (typeof sheet.column === "number" && sheet.column > 0) {
    return sheet.column;
  }
  if (Array.isArray(sheet.data) && sheet.data.length > 0) {
    const rowWithValues = sheet.data.find((row) => Array.isArray(row));
    return rowWithValues ? rowWithValues.length : 0;
  }
  if (Array.isArray(sheet.celldata) && sheet.celldata.length > 0) {
    const maxCol = Math.max(
      ...sheet.celldata.map((cell) => cell.c ?? 0),
      0
    );
    return maxCol + 1;
  }
  return 0;
}

export function buildCelldataLookup(sheet: Sheet): Map<string, Cell | null> {
  const lookup = new Map<string, Cell | null>();

  if (Array.isArray(sheet.data)) {
    sheet.data.forEach((row, rowIdx) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, colIdx) => {
        lookup.set(`${rowIdx}:${colIdx}`, cell ?? null);
      });
    });
  }

  if (Array.isArray(sheet.celldata)) {
    sheet.celldata.forEach((cell) => {
      const key = `${cell.r}:${cell.c}`;
      lookup.set(key, cell.v ?? null);
    });
  }

  return lookup;
}

export function getCellFromLookup(
  lookup: Map<string, Cell | null>,
  row: number,
  col: number
): Cell | null {
  return lookup.get(`${row}:${col}`) ?? null;
}

export function toCellWithRowAndCol(
  row: number,
  col: number,
  cell: Cell | null
): CellWithRowAndCol {
  return {
    r: row,
    c: col,
    v: cell,
  };
}

export type CelldataLookup = Map<string, Cell | null>;

/**
 * Extract function names from a formula string.
 * Matches function names that are followed by an opening parenthesis.
 * @param formula - The formula string to parse (e.g., "=SUM(A1:A10)+AVERAGE(B1:B10)")
 * @returns Array of function names found in the formula (e.g., ["SUM", "AVERAGE"])
 */
export function extractFunctions(formula: string): string[] {
  if (!formula || typeof formula !== "string") {
    return [];
  }

  // Match function names: word characters followed by opening parenthesis
  // Regex pattern: one or more word characters followed by (
  const functionPattern = /\b([A-Z_][A-Z0-9_]*)\s*\(/gi;
  const matches = formula.matchAll(functionPattern);
  const functions: string[] = [];

  for (const match of matches) {
    if (match[1]) {
      functions.push(match[1].toUpperCase());
    }
  }

  return functions;
}

/**
 * Check a formula for basic syntax issues.
 * Validates:
 * - Balanced parentheses
 * - Valid cell references (basic format check)
 * - Formula starts with =
 * @param formula - The formula string to check
 * @returns Array of error messages (empty array if no issues found)
 */
export function checkSyntax(formula: string): string[] {
  const errors: string[] = [];

  if (!formula || typeof formula !== "string") {
    errors.push("Formula is empty or not a string");
    return errors;
  }

  const trimmed = formula.trim();

  // Check if formula starts with =
  if (!trimmed.startsWith("=")) {
    errors.push("Formula must start with '='");
  }

  // Check for balanced parentheses
  let parenthesesCount = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "(") {
      parenthesesCount++;
    } else if (trimmed[i] === ")") {
      parenthesesCount--;
      if (parenthesesCount < 0) {
        errors.push("Unmatched closing parenthesis");
        break;
      }
    }
  }

  if (parenthesesCount > 0) {
    errors.push("Unmatched opening parenthesis");
  }

  // Check for invalid cell references
  // Look for patterns that might be cell references but are malformed
  const invalidReferencePattern = /\b([A-Z]+\d*[A-Z]+|\d+[A-Z]+)\b/g;
  const invalidMatches = trimmed.matchAll(invalidReferencePattern);

  for (const match of invalidMatches) {
    // Only flag as error if it looks like it was meant to be a cell reference
    if (match[1] && !/^[A-Z]+\d+$/.test(match[1])) {
      const possibleRef = match[1];
      // Check if it has mixed letters and numbers in wrong order
      if (/\d.*[A-Z]/.test(possibleRef)) {
        errors.push(`Invalid cell reference format: ${possibleRef}`);
      }
    }
  }

  return errors;
}

/**
 * Find the actual extent of data in a spreadsheet by examining all cells.
 * Returns the top-left and bottom-right corners of the data region.
 * @param lookup - Map of cell coordinates to cell data
 * @returns Object with start and end cell references (e.g., {start: "A1", end: "C10"}), or null if no data
 */
export function findDataExtent(
  lookup: CelldataLookup
): { start: string; end: string } | null {
  if (lookup.size === 0) {
    return null;
  }

  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  let hasData = false;

  // Iterate through all cells in the lookup
  for (const [key, cell] of lookup.entries()) {
    // Skip empty cells
    if (!cell) continue;

    // Parse the key format "row:col"
    const [rowStr, colStr] = key.split(":");
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    if (isNaN(row) || isNaN(col)) continue;

    // Update bounds
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
    hasData = true;
  }

  if (!hasData || minRow === Infinity || minCol === Infinity) {
    return null;
  }

  // Convert to A1 notation
  const startCol = columnIndexToLetter(minCol);
  const endCol = columnIndexToLetter(maxCol);
  const startRow = minRow + 1; // Convert 0-indexed to 1-indexed
  const endRow = maxRow + 1;

  return {
    start: `${startCol}${startRow}`,
    end: `${endCol}${endRow}`,
  };
}
