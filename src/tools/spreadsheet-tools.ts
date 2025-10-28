/**
 * @file spreadsheet-tools.ts
 * @description Tools for AI to manipulate spreadsheet data
 *
 * These tools allow precise mutations of spreadsheet data without
 * sending the entire state on every update.
 */

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import type { Cell } from "@/lib/spreadsheet-tabs-store";
import { z } from "zod";

// ============================================
// Helper Functions
// ============================================

/**
 * Get cell at specific position
 */
function getCellPosition(
  tabId: string,
  rowId: string | number,
  columnId: string,
): { rowIndex: number; cellIndex: number } | null {
  const store = useSpreadsheetTabsStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);
  if (!tab) return null;

  const rowIndex = tab.rows.findIndex((r) => r.rowId === rowId);
  if (rowIndex === -1) return null;

  const cellIndex = tab.columns.findIndex((c) => c.columnId === columnId);
  if (cellIndex === -1) return null;

  return { rowIndex, cellIndex };
}

// ============================================
// Cell Normalization
// ============================================

/**
 * Normalize raw values to proper Cell objects
 * Accepts both explicit cell objects and raw values (strings/numbers)
 */
function normalizeCell(value: any): Cell {
  // If already a proper cell object, return as-is
  if (value && typeof value === 'object' && 'type' in value) {
    return value as Cell;
  }

  // Auto-infer from raw value
  if (typeof value === 'number') {
    return { type: "number", value };
  }

  // Default to text (handles strings, null, undefined, etc.)
  return { type: "text", text: String(value ?? "") };
}

// ============================================
// Tool Functions
// ============================================

const updateCell = async (
  rowId: string | number,
  columnId: string,
  cellData: string | number,
) => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  const position = getCellPosition(activeTabId, rowId, columnId);
  if (!position) {
    return {
      success: false,
      error: `Cell not found at row ${rowId}, column ${columnId}`,
    };
  }

  const tab = store.tabs.find((t) => t.id === activeTabId);
  if (!tab) {
    return { success: false, error: "Active tab not found" };
  }

  const { rowIndex, cellIndex } = position;

  // Check if cell is editable
  const existingCell = tab.rows[rowIndex].cells[cellIndex];
  if (existingCell && "nonEditable" in existingCell && existingCell.nonEditable) {
    return {
      success: false,
      error: `Cell at ${columnId}${rowId} is not editable`,
    };
  }

  // Normalize cell data (auto-infer types from raw values)
  const normalizedCell = normalizeCell(cellData);

  // Create updated rows array
  const updatedRows = [...tab.rows];
  updatedRows[rowIndex] = {
    ...updatedRows[rowIndex],
    cells: [...updatedRows[rowIndex].cells],
  };
  updatedRows[rowIndex].cells[cellIndex] = normalizedCell;

  // Update the tab
  store.updateTab(activeTabId, { rows: updatedRows });

  return {
    success: true,
    message: `Updated cell ${columnId}${rowId}`,
  };
};

const updateRange = async (
  startRow: string | number,
  startColumn: string,
  endRow: string | number,
  endColumn: string,
  data: Array<Array<string | number>>,
) => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  const tab = store.tabs.find((t) => t.id === activeTabId);
  if (!tab) {
    return { success: false, error: "Active tab not found" };
  }

  const startPos = getCellPosition(activeTabId, startRow, startColumn);
  const endPos = getCellPosition(activeTabId, endRow, endColumn);

  if (!startPos || !endPos) {
    return { success: false, error: "Invalid range" };
  }

  const { rowIndex: startRowIdx, cellIndex: startColIdx } = startPos;
  const { rowIndex: endRowIdx, cellIndex: endColIdx } = endPos;

  // Validate data dimensions
  const expectedRows = endRowIdx - startRowIdx + 1;
  const expectedCols = endColIdx - startColIdx + 1;

  if (data.length !== expectedRows) {
    return {
      success: false,
      error: `Data has ${data.length} rows but expected ${expectedRows}`,
    };
  }

  for (const row of data) {
    if (row.length !== expectedCols) {
      return {
        success: false,
        error: `Data row has ${row.length} columns but expected ${expectedCols}`,
      };
    }
  }

  // Create updated rows
  const updatedRows = tab.rows.map((row, rowIdx) => {
    if (rowIdx < startRowIdx || rowIdx > endRowIdx) {
      return row;
    }

    const dataRowIdx = rowIdx - startRowIdx;
    const updatedCells = row.cells.map((cell, cellIdx) => {
      if (cellIdx < startColIdx || cellIdx > endColIdx) {
        return cell;
      }

      // Check if cell is editable
      if ("nonEditable" in cell && cell.nonEditable) {
        return cell;
      }

      const dataColIdx = cellIdx - startColIdx;
      // Normalize cell data (auto-infer types from raw values)
      return normalizeCell(data[dataRowIdx][dataColIdx]);
    });

    return {
      ...row,
      cells: updatedCells,
    };
  });

  // Update the tab
  store.updateTab(activeTabId, { rows: updatedRows });

  return {
    success: true,
    message: `Updated range ${startColumn}${startRow}:${endColumn}${endRow}`,
  };
};

const createTab = async (name: string) => {
  const store = useSpreadsheetTabsStore.getState();
  const newTab = store.createTab(name);

  return {
    success: true,
    message: `Created tab "${name}"`,
    tabId: newTab.id,
  };
};

const deleteTab = async (tabId: string) => {
  const store = useSpreadsheetTabsStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);

  if (!tab) {
    return { success: false, error: `Tab ${tabId} not found` };
  }

  store.removeTab(tabId);

  return {
    success: true,
    message: `Deleted tab "${tab.name}"`,
  };
};

const switchTab = async (tabId: string) => {
  const store = useSpreadsheetTabsStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);

  if (!tab) {
    return { success: false, error: `Tab ${tabId} not found` };
  }

  store.setActiveTab(tabId);

  return {
    success: true,
    message: `Switched to tab "${tab.name}"`,
  };
};

const addColumn = async () => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  store.addColumn(activeTabId);

  return {
    success: true,
    message: "Added new column",
  };
};

const removeColumn = async (columnId: string) => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  if (columnId === "ROW_HEADER") {
    return { success: false, error: "Cannot remove row header column" };
  }

  store.removeColumn(activeTabId, columnId);

  return {
    success: true,
    message: `Removed column ${columnId}`,
  };
};

const addRow = async () => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  store.addRow(activeTabId);

  return {
    success: true,
    message: "Added new row",
  };
};

const removeRow = async (rowId: string | number) => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTabId = store.activeTabId;

  if (!activeTabId) {
    return { success: false, error: "No active tab" };
  }

  if (rowId === "header") {
    return { success: false, error: "Cannot remove header row" };
  }

  store.removeRow(activeTabId, rowId);

  return {
    success: true,
    message: `Removed row ${rowId}`,
  };
};

// ============================================
// Tool Definitions
// ============================================

const cellDataSchema = z.union([z.string(), z.number()]);

export const updateCellTool = {
  name: "updateSpreadsheetCell",
  description:
    "Update a single cell in the active spreadsheet tab. Provide the row ID (number like 1, 2, 3), column ID (letter like 'A', 'B', 'C'), and the new cell value (string or number). Cell type is auto-inferred.",
  tool: updateCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row identifier (e.g., 1, 2, 3)"),
      z.string().describe("Column identifier (e.g., 'A', 'B', 'C')"),
      cellDataSchema.describe("Cell value (string or number, type auto-inferred)"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const updateRangeTool = {
  name: "updateSpreadsheetRange",
  description:
    "Update a range of cells in the active spreadsheet tab. Provide start/end row and column, and a 2D array of values (strings or numbers). Cell types are auto-inferred. Useful for bulk updates.",
  tool: updateRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Start row ID"),
      z.string().describe("Start column ID (e.g., 'A')"),
      z.union([z.string(), z.number()]).describe("End row ID"),
      z.string().describe("End column ID (e.g., 'C')"),
      z.array(z.array(cellDataSchema)).describe("2D array of values [rows][columns], strings or numbers"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const createTabTool = {
  name: "createSpreadsheetTab",
  description: "Create a new spreadsheet tab with a given name.",
  tool: createTab,
  toolSchema: z
    .function()
    .args(z.string().describe("Name for the new tab"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        tabId: z.string().optional(),
      }),
    ),
};

export const deleteTabTool = {
  name: "deleteSpreadsheetTab",
  description: "Delete a spreadsheet tab by ID.",
  tool: deleteTab,
  toolSchema: z
    .function()
    .args(z.string().describe("ID of the tab to delete"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const switchTabTool = {
  name: "switchSpreadsheetTab",
  description: "Switch to a different spreadsheet tab.",
  tool: switchTab,
  toolSchema: z
    .function()
    .args(z.string().describe("ID of the tab to switch to"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const addColumnTool = {
  name: "addSpreadsheetColumn",
  description: "Add a new column to the active spreadsheet tab.",
  tool: addColumn,
  toolSchema: z
    .function()
    .args()
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const removeColumnTool = {
  name: "removeSpreadsheetColumn",
  description: "Remove a column from the active spreadsheet tab.",
  tool: removeColumn,
  toolSchema: z
    .function()
    .args(z.string().describe("Column ID to remove (e.g., 'A', 'B')"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const addRowTool = {
  name: "addSpreadsheetRow",
  description: "Add a new row to the active spreadsheet tab.",
  tool: addRow,
  toolSchema: z
    .function()
    .args()
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const removeRowTool = {
  name: "removeSpreadsheetRow",
  description: "Remove a row from the active spreadsheet tab.",
  tool: removeRow,
  toolSchema: z
    .function()
    .args(z.union([z.string(), z.number()]).describe("Row ID to remove (e.g., 1, 2, 3)"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

// ============================================
// Export all tools
// ============================================

export const spreadsheetTools = [
  updateCellTool,
  updateRangeTool,
  createTabTool,
  deleteTabTool,
  switchTabTool,
  addColumnTool,
  removeColumnTool,
  addRowTool,
  removeRowTool,
];
