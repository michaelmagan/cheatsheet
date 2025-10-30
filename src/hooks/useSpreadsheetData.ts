import { useState, useEffect, useCallback } from "react";
import type { Cell } from "@/types/spreadsheet";
import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import { parseRangeReference } from "@/lib/spreadsheet-utils";

/**
 * useSpreadsheetData Hook
 *
 * Fetches cells from the spreadsheet Zustand store and subscribes to changes
 * for reactive updates.
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
  cells: Cell[] | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
} {
  // Don't fetch if we have empty/placeholder values (during streaming)
  // Return empty state immediately to prevent error flashes
  const hasValidInput = tabId && tabId !== "" && range && range !== "A1";

  const [cells, setCells] = useState<Cell[] | null>(null);
  const [loading, setLoading] = useState<boolean>(!hasValidInput ? false : true);
  const [error, setError] = useState<string | null>(null);

  // Get store state and subscribe to changes
  const tabs = useSpreadsheetTabsStore((state) => state.tabs);
  const activeTabId = useSpreadsheetTabsStore((state) => state.activeTabId);

  // Determine if data is stale (tab is not active)
  const isStale = activeTabId !== tabId;

  // Fetch cells from the store
  const fetchCells = useCallback(() => {
    // Skip fetching if we don't have valid input (placeholder values during streaming)
    if (!hasValidInput) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse the range reference
      let parsedRange;
      try {
        parsedRange = parseRangeReference(range);
      } catch {
        throw new Error(
          `Invalid range format: ${range}. Expected format: "A1:B5" or "A1"`
        );
      }

      const { start, end } = parsedRange;

      // Find the tab by ID
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) {
        throw new Error(`Tab with ID "${tabId}" not found`);
      }

      // Extract cells based on the parsed range
      // Note: Spreadsheet rows include a header row at index 0
      // Note: Spreadsheet columns include a ROW_HEADER column at index 0
      // Coordinates from parseRangeReference are 0-indexed for data cells
      // So we need to add 1 to row indices and 1 to column indices to account for headers

      const extractedCells: Cell[] = [];

      // Iterate through the range
      for (let rowIdx = start.row; rowIdx <= end.row; rowIdx++) {
        // Add 1 to skip header row (header is at index 0, data starts at index 1)
        const actualRowIdx = rowIdx + 1;

        if (actualRowIdx >= tab.rows.length) {
          throw new Error(
            `Row ${rowIdx + 1} is out of bounds. Tab has ${tab.rows.length - 1} data rows.`
          );
        }

        const row = tab.rows[actualRowIdx];

        for (let colIdx = start.col; colIdx <= end.col; colIdx++) {
          // Add 1 to skip ROW_HEADER column (ROW_HEADER is at index 0, data starts at index 1)
          const actualColIdx = colIdx + 1;

          if (actualColIdx >= row.cells.length) {
            throw new Error(
              `Column ${colIdx} is out of bounds. Row has ${row.cells.length - 1} data columns.`
            );
          }

          const cell = row.cells[actualColIdx];
          extractedCells.push(cell);
        }
      }

      setCells(extractedCells);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setCells(null);
    } finally {
      setLoading(false);
    }
  }, [tabId, range, tabs, hasValidInput]);

  // Fetch cells on mount and when dependencies change
  useEffect(() => {
    fetchCells();
  }, [fetchCells]);

  // Subscribe to store changes for reactive updates
  useEffect(() => {
    const unsubscribe = useSpreadsheetTabsStore.subscribe(() => {
      fetchCells();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchCells]);

  return {
    cells,
    loading,
    error,
    isStale,
  };
}
