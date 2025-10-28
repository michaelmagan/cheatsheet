import type { Row as ReactGridRow } from "@silevis/reactgrid";
import { extractCellValues, formatSelectionAsRange } from "./spreadsheet-utils";

// ============================================
// Types
// ============================================

export interface SpreadsheetSelectionContext {
  spreadsheetId: string;
  selectedRange: string; // e.g., "A1:D5"
  selectedCells: Array<{
    row: number;
    col: number;
    value: string | number | undefined;
    cellRef: string; // e.g., "B3"
  }>;
}

interface CellSelection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

// Define context helper return type based on Tambo's expected format
type ContextHelperResult = {
  type: string;
  data: Record<string, unknown>;
} | null;

// ============================================
// Global State
// ============================================

// Track current selection globally (updated by Spreadsheet component)
let currentSpreadsheetSelection: SpreadsheetSelectionContext | null = null;

// ============================================
// Context Helper (for Tambo)
// ============================================

/**
 * Context helper that Tambo will call to get current spreadsheet selection
 * This provides additional context to the AI about what cells the user has selected
 */
export const spreadsheetSelectionContextHelper = (): ContextHelperResult => {
  if (!currentSpreadsheetSelection) {
    return null;
  }

  return {
    type: "spreadsheet-selection",
    data: {
      spreadsheetId: currentSpreadsheetSelection.spreadsheetId,
      selectedRange: currentSpreadsheetSelection.selectedRange,
      selectedCells: currentSpreadsheetSelection.selectedCells,
      summary: `User has selected ${currentSpreadsheetSelection.selectedCells.length} cells (${currentSpreadsheetSelection.selectedRange})`,
    },
  };
};

// ============================================
// Update Function (called by Spreadsheet component)
// ============================================

/**
 * Function for Spreadsheet component to update selection
 * This should be called whenever the user's selection changes in the spreadsheet
 *
 * @param spreadsheetId - The unique ID of the spreadsheet component
 * @param selection - The current cell selection (or null if no selection)
 * @param rows - The current row data from the spreadsheet
 */
export function updateSpreadsheetSelection(
  spreadsheetId: string,
  selection: CellSelection | null,
  rows: ReactGridRow[],
) {
  if (!selection) {
    currentSpreadsheetSelection = null;
    return;
  }

  currentSpreadsheetSelection = {
    spreadsheetId,
    selectedRange: formatSelectionAsRange(selection),
    selectedCells: extractCellValues(selection, rows),
  };
}
