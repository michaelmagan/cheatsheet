import type { Cell } from "@/types/spreadsheet";
import { useSpreadsheetData } from "./useSpreadsheetData";

/**
 * useMultipleSpreadsheetData Hook
 *
 * Fetches multiple spreadsheet ranges in a single hook call, providing a cleaner
 * alternative to calling useSpreadsheetData multiple times.
 *
 * This hook respects the Rules of Hooks by calling a fixed number of useSpreadsheetData
 * hooks internally (maximum 10), and slicing the results to match the actual number
 * of ranges requested.
 *
 * @param tabId - The ID of the spreadsheet tab to read from
 * @param ranges - Array of A1 notation ranges (e.g., ["A1:C5", "E1:F10"])
 * @returns Object containing array of results (one per range), aggregated loading state, and aggregated errors
 *
 * @example
 * const { data, loading, error } = useMultipleSpreadsheetData(tabId, ["A1:B5", "D1:E10"]);
 * // data[0] contains cells from A1:B5
 * // data[1] contains cells from D1:E10
 * // loading is true if ANY range is still loading
 */
export function useMultipleSpreadsheetData(
  tabId: string,
  ranges: string[]
): {
  data: Array<{
    cells: Cell[] | null;
    loading: boolean;
    error: string | null;
    isStale: boolean;
  }>;
  loading: boolean;
  error: string | null;
} {
  // Don't fetch if invalid input
  const hasValidInput = tabId && tabId !== "" && ranges && ranges.length > 0;

  // Maximum number of datasets supported (fixed to respect Rules of Hooks)
  const MAX_DATASETS = 10;

  // Call a fixed number of useSpreadsheetData hooks
  // Pass placeholder values when index >= ranges.length
  const result0 = useSpreadsheetData({
    tabId: ranges[0] && hasValidInput ? tabId : "",
    range: ranges[0] && hasValidInput ? ranges[0] : "A1",
  });

  const result1 = useSpreadsheetData({
    tabId: ranges[1] && hasValidInput ? tabId : "",
    range: ranges[1] && hasValidInput ? ranges[1] : "A1",
  });

  const result2 = useSpreadsheetData({
    tabId: ranges[2] && hasValidInput ? tabId : "",
    range: ranges[2] && hasValidInput ? ranges[2] : "A1",
  });

  const result3 = useSpreadsheetData({
    tabId: ranges[3] && hasValidInput ? tabId : "",
    range: ranges[3] && hasValidInput ? ranges[3] : "A1",
  });

  const result4 = useSpreadsheetData({
    tabId: ranges[4] && hasValidInput ? tabId : "",
    range: ranges[4] && hasValidInput ? ranges[4] : "A1",
  });

  const result5 = useSpreadsheetData({
    tabId: ranges[5] && hasValidInput ? tabId : "",
    range: ranges[5] && hasValidInput ? ranges[5] : "A1",
  });

  const result6 = useSpreadsheetData({
    tabId: ranges[6] && hasValidInput ? tabId : "",
    range: ranges[6] && hasValidInput ? ranges[6] : "A1",
  });

  const result7 = useSpreadsheetData({
    tabId: ranges[7] && hasValidInput ? tabId : "",
    range: ranges[7] && hasValidInput ? ranges[7] : "A1",
  });

  const result8 = useSpreadsheetData({
    tabId: ranges[8] && hasValidInput ? tabId : "",
    range: ranges[8] && hasValidInput ? ranges[8] : "A1",
  });

  const result9 = useSpreadsheetData({
    tabId: ranges[9] && hasValidInput ? tabId : "",
    range: ranges[9] && hasValidInput ? ranges[9] : "A1",
  });

  // Collect all results in an array
  const allResults = [
    result0,
    result1,
    result2,
    result3,
    result4,
    result5,
    result6,
    result7,
    result8,
    result9,
  ];

  // Return empty state if input is invalid
  if (!hasValidInput) {
    return {
      data: [],
      loading: false,
      error: null,
    };
  }

  // Slice to actual length (up to MAX_DATASETS)
  const actualLength = Math.min(ranges.length, MAX_DATASETS);
  const results = allResults.slice(0, actualLength);

  // Aggregate loading state - true if ANY range is still loading
  const loading = results.some((r) => r.loading);

  // Aggregate errors - collect all non-null errors
  const errors = results.filter((r) => r.error).map((r) => r.error as string);

  return {
    data: results,
    loading,
    error: errors.length > 0 ? errors.join("; ") : null,
  };
}
