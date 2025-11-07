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

  const rowCount = Math.min(totalRows, 50);
  const columnCount = Math.min(totalColumns, 26);

  const lookup = buildCelldataLookup(targetSheet);

  // Task 5.3: Count cells with formulas and errors
  let formulaCount = 0;
  let errorCount = 0;

  for (const [, cell] of lookup.entries()) {
    if (cell) {
      if (cell.f !== undefined && cell.f !== null) {
        formulaCount++;
      }
      // Check for error values (FortuneSheet stores errors in cell.v or cell.m)
      const cellValue = cell.v || cell.m;
      if (cellValue && typeof cellValue === "string") {
        if (cellValue.startsWith("#") &&
            (cellValue.includes("ERROR") || cellValue.includes("REF") ||
             cellValue.includes("DIV") || cellValue.includes("VALUE") ||
             cellValue.includes("NAME") || cellValue.includes("NULL") ||
             cellValue.includes("NUM") || cellValue === "#N/A")) {
          errorCount++;
        }
      }
    }
  }

  const headers = Array.from({ length: columnCount }, (_, idx) =>
    columnIndexToLetter(idx)
  );

  let markdown = "";

  // Task 5.3: Add metadata section at top
  markdown += `# Spreadsheet: ${targetSheet.name}\n\n`;
  markdown += `**Dimensions:** ${totalRows} rows × ${totalColumns} columns\n`;
  markdown += `**Cells with formulas:** ${formulaCount}\n`;
  if (errorCount > 0) {
    markdown += `**Cells with errors:** ${errorCount} (use getSpreadsheetErrors() for details)\n`;
  }
  markdown += `\n`;

  // Task 5.2: Header with dimensions showing truncation
  markdown += `**Sheet: ${targetSheet.name} (${rowCount}/${totalRows} rows × ${columnCount}/${totalColumns} columns)**\n\n`;

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

  // Task 5.2: Add footer when truncated
  const rowsTruncated = totalRows > rowCount;
  const columnsTruncated = totalColumns > columnCount;

  if (rowsTruncated || columnsTruncated) {
    markdown += `\n`;
    const moreRows = totalRows - rowCount;
    const moreColumns = totalColumns - columnCount;

    if (rowsTruncated && columnsTruncated) {
      markdown += `_... ${moreRows} more rows and ${moreColumns} more columns not shown_\n`;
    } else if (rowsTruncated) {
      markdown += `_... ${moreRows} more rows not shown_\n`;
    } else if (columnsTruncated) {
      markdown += `_... ${moreColumns} more columns not shown_\n`;
    }
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
