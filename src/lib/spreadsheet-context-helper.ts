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

  if (cell.m !== undefined && cell.m !== null) {
    return String(cell.m);
  }

  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === "object") {
      return cell.m !== undefined && cell.m !== null ? String(cell.m) : "";
    }
    return String(cell.v);
  }

  return "";
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

  const rowCount = Math.min(getSheetRowCount(targetSheet), 50);
  const columnCount = Math.min(getSheetColumnCount(targetSheet), 26);

  const lookup = buildCelldataLookup(targetSheet);

  const headers = Array.from({ length: columnCount }, (_, idx) =>
    columnIndexToLetter(idx)
  );

  let markdown = `# Spreadsheet: ${targetSheet.name}\n\n`;
  markdown += `|   | ${headers.join(" | ")} |\n`;
  markdown += `|---|${headers.map(() => "---").join("|")}|\n`;

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const cells = [];
    for (let colIdx = 0; colIdx < columnCount; colIdx++) {
      const cell = getCellFromLookup(lookup, rowIdx, colIdx);
      cells.push(resolveCellDisplay(cell));
    }
    markdown += `| ${rowIdx + 1} | ${cells.join(" | ")} |\n`;
  }

  if (rowCount === 0 || columnCount === 0) {
    markdown += "\n_(Sheet is currently empty)_\n";
  }

  return markdown;
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
