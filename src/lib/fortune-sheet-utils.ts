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
