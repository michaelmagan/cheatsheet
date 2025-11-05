"use client";

import { fortuneSheetStore } from "@/lib/fortune-sheet-store";
import { columnIndexToLetter } from "@/lib/fortune-sheet-utils";
import type { Selection } from "@fortune-sheet/core";

function selectionToRange(selection: Selection): string | null {
  const rowStart = selection.row?.[0];
  const rowEnd = selection.row?.[1] ?? rowStart;
  const colStart = selection.column?.[0];
  const colEnd = selection.column?.[1] ?? colStart;

  if (
    rowStart === undefined ||
    colStart === undefined ||
    rowStart === null ||
    colStart === null
  ) {
    return null;
  }

  const startRow = Math.min(rowStart, rowEnd ?? rowStart);
  const endRow = Math.max(rowStart, rowEnd ?? rowStart);
  const startCol = Math.min(colStart, colEnd ?? colStart);
  const endCol = Math.max(colStart, colEnd ?? colStart);

  const startRef = `${columnIndexToLetter(startCol)}${startRow + 1}`;
  const endRef = `${columnIndexToLetter(endCol)}${endRow + 1}`;

  return startRef === endRef ? startRef : `${startRef}:${endRef}`;
}

export const spreadsheetSelectionContextHelper = () => {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const workbook = fortuneSheetStore.getWorkbook();
    if (!workbook) {
      return null;
    }

    const selections = workbook.getSelection();
    if (!selections || selections.length === 0) {
      return null;
    }

    const formatted = selections
      .map((selection) => selectionToRange(selection))
      .filter((range): range is string => Boolean(range));

    if (formatted.length === 0) {
      return null;
    }

    const { sheets, activeSheetId } = fortuneSheetStore.getState();
    const activeSheet =
      sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0];

    const sheetLabel = activeSheet ? ` on sheet "${activeSheet.name}"` : "";
    return `User currently has selected: ${formatted.join(
      ", "
    )}${sheetLabel}.`;
  } catch (error) {
    console.error("Error in spreadsheetSelectionContextHelper:", error);
    return null;
  }
};
