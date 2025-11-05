import { useMemo } from "react";
import type { CellWithRowAndCol } from "@fortune-sheet/core";
import { useFortuneSheet } from "@/lib/fortune-sheet-store";
import {
  buildCelldataLookup,
  getCellFromLookup,
  getSheetColumnCount,
  getSheetRowCount,
  parseRangeReference,
  toCellWithRowAndCol,
} from "@/lib/fortune-sheet-utils";

/**
 * useSpreadsheetData Hook
 *
 * Fetches cells from the FortuneSheet in-memory store and returns values
 * using FortuneSheet's native sheet schema.
 *
 * @param tabId - The ID of the spreadsheet tab to read from
 * @param range - The A1 notation range (e.g., "A1:C5")
 * @returns Object containing cells array, loading state, error, and staleness indicator
 */
export function useSpreadsheetData({
  tabId,
  range,
}: {
  tabId: string;
  range: string;
}): {
  cells: CellWithRowAndCol[] | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  resolvedSheetId: string | null;
} {
  const { sheets, activeSheetId } = useFortuneSheet();

  const { cells, error, resolvedSheetId } = useMemo(() => {
    if (!tabId || !range) {
      return {
        cells: null,
        error: null,
        resolvedSheetId: null,
      };
    }

    const sheet =
      sheets.find((candidate) => candidate.id === tabId) ??
      sheets.find((candidate) => candidate.name === tabId);
    if (!sheet) {
      return {
        cells: null,
        error: `Sheet with id or name "${tabId}" was not found.`,
        resolvedSheetId: null,
      };
    }

    try {
      const parsedRange = parseRangeReference(range);
      const rowCount = getSheetRowCount(sheet);
      const columnCount = getSheetColumnCount(sheet);

      if (rowCount === 0 || columnCount === 0) {
        return {
          cells: [],
          error: null,
          resolvedSheetId: sheet.id ?? null,
        };
      }

      if (parsedRange.end.row >= rowCount || parsedRange.end.col >= columnCount) {
        return {
          cells: null,
          error: `Range ${range} exceeds sheet bounds (${rowCount} rows x ${columnCount} columns).`,
          resolvedSheetId: sheet.id ?? null,
        };
      }

      const lookup = buildCelldataLookup(sheet);
      const extracted: CellWithRowAndCol[] = [];

      for (let rowIdx = parsedRange.start.row; rowIdx <= parsedRange.end.row; rowIdx++) {
        for (let colIdx = parsedRange.start.col; colIdx <= parsedRange.end.col; colIdx++) {
          const cell = getCellFromLookup(lookup, rowIdx, colIdx);
          extracted.push(toCellWithRowAndCol(rowIdx, colIdx, cell));
        }
      }

      return {
        cells: extracted,
        error: null,
        resolvedSheetId: sheet.id ?? null,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse spreadsheet range.";
      return {
        cells: null,
        error: message,
        resolvedSheetId: sheet.id ?? null,
      };
    }
  }, [sheets, tabId, range]);

  const isStale = Boolean(
    activeSheetId &&
      resolvedSheetId &&
      activeSheetId !== resolvedSheetId,
  );

  return {
    cells,
    loading: false,
    error,
    isStale,
    resolvedSheetId,
  };
}
