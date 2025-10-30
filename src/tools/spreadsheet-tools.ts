/**
 * @file spreadsheet-tools.ts
 * @description Tools for AI to manipulate spreadsheet data
 *
 * These tools allow precise mutations of spreadsheet data without
 * sending the entire state on every update.
 */

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import type { Cell } from "@/types/spreadsheet";
import { z } from "zod";
import {
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
  MAX_TEXT_LENGTH,
} from "@/lib/constants";

// ============================================
// Helper Functions
// ============================================

/**
 * Sanitize text input by trimming whitespace and limiting length
 */
function sanitizeText(text: string, maxLength: number = MAX_TEXT_LENGTH): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
}

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
 * Convert format options to Intl.NumberFormat object
 * Accepts either Intl.NumberFormatOptions or undefined
 */
function createNumberFormat(formatOptions?: Intl.NumberFormatOptions): Intl.NumberFormat | undefined {
  if (!formatOptions) return undefined;

  try {
    return new Intl.NumberFormat('en-US', formatOptions);
  } catch (error) {
    console.warn('Invalid number format options:', formatOptions, error);
    return undefined;
  }
}

/**
 * Normalize cell objects to proper Cell type with runtime validation
 */
function normalizeCell(cellData: {
  type: "text";
  text: string
} | {
  type: "number";
  value: number;
  formatOptions?: Intl.NumberFormatOptions
}): Cell {
  if (cellData.type === 'number') {
    const numValue = Number(cellData.value || 0);
    // Validate number values - convert invalid numbers to text
    if (!Number.isFinite(numValue)) {
      return {
        type: 'text',
        text: sanitizeText(String(cellData.value || "")),
      };
    }

    return {
      type: 'number',
      value: numValue,
      format: createNumberFormat(cellData.formatOptions),
    };
  }

  return {
    type: 'text',
    text: sanitizeText(cellData.text),
  };
}

// ============================================
// Tool Functions
// ============================================

const updateCell = async (
  rowId: string | number,
  columnId: string,
  cellData: { type: "text"; text: string } | { type: "number"; value: number; format?: string },
) => {
  try {
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

    // Normalize cell data
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
      message: `Updated cell ${columnId}${rowId} in tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in updateCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const updateRange = async (
  startRow: string | number,
  startColumn: string,
  endRow: string | number,
  endColumn: string,
  data: Array<Array<{ type: "text"; text: string } | { type: "number"; value: number; format?: string }>>,
) => {
  try {
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

    // Validate range is within spreadsheet bounds
    if (
      startRowIdx < 0 ||
      startColIdx < 0 ||
      endRowIdx >= tab.rows.length ||
      endColIdx >= tab.columns.length
    ) {
      return {
        success: false,
        error: `Range exceeds spreadsheet bounds. Sheet has ${tab.rows.length} rows and ${tab.columns.length} columns.`,
      };
    }

    // Validate data dimensions
    const expectedRows = endRowIdx - startRowIdx + 1;
    const expectedCols = endColIdx - startColIdx + 1;

    // Check if data is actually a 2D array
    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: `Data must be a 2D array (array of arrays). Received: ${typeof data}`,
      };
    }

    // Check if first element is an array (not a primitive)
    if (!Array.isArray(data[0])) {
      return {
        success: false,
        error: `Data must be a 2D array (array of arrays). You provided a flat array. Example: Instead of ["A", "B", "C"], use [["A"], ["B"], ["C"]] for a single column, or [["A", "B", "C"]] for a single row.`,
      };
    }

    if (data.length !== expectedRows) {
      return {
        success: false,
        error: `Data has ${data.length} rows but expected ${expectedRows}. Range ${startColumn}${startRow}:${endColumn}${endRow} requires a ${expectedRows}x${expectedCols} array. Example: [[row1col1, row1col2], [row2col1, row2col2]]`,
      };
    }

    for (const row of data) {
      if (row.length !== expectedCols) {
        return {
          success: false,
          error: `Data row has ${row.length} columns but expected ${expectedCols}. Range ${startColumn}${startRow}:${endColumn}${endRow} requires ${expectedCols} columns per row.`,
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
        // Normalize cell data
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
      message: `Updated range ${startColumn}${startRow}:${endColumn}${endRow} in tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in updateRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};


const addColumn = async (count: number = 1) => {
  try {
    const store = useSpreadsheetTabsStore.getState();
    const activeTabId = store.activeTabId;

    if (!activeTabId) {
      return { success: false, error: "No active tab" };
    }

    if (count < 1) {
      return { success: false, error: "Count must be at least 1" };
    }

    const tab = store.tabs.find((t) => t.id === activeTabId);
    if (!tab) {
      return { success: false, error: "Active tab not found" };
    }

    // Check if adding columns would exceed maximum
    if (tab.columns.length + count > MAX_SPREADSHEET_COLUMNS) {
      return {
        success: false,
        error: `Cannot add ${count} column(s). Maximum columns (${MAX_SPREADSHEET_COLUMNS}) would be exceeded. Current: ${tab.columns.length}`,
      };
    }

    for (let i = 0; i < count; i++) {
      store.addColumn(activeTabId);
    }

    return {
      success: true,
      message: `Added ${count} new column${count > 1 ? 's' : ''}`,
    };
  } catch (error) {
    console.error("Error in addColumn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const removeColumn = async (columnId: string) => {
  try {
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
  } catch (error) {
    console.error("Error in removeColumn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const addRow = async (count: number = 1) => {
  try {
    const store = useSpreadsheetTabsStore.getState();
    const activeTabId = store.activeTabId;

    if (!activeTabId) {
      return { success: false, error: "No active tab" };
    }

    if (count < 1) {
      return { success: false, error: "Count must be at least 1" };
    }

    const tab = store.tabs.find((t) => t.id === activeTabId);
    if (!tab) {
      return { success: false, error: "Active tab not found" };
    }

    // Check if adding rows would exceed maximum
    if (tab.rows.length + count > MAX_SPREADSHEET_ROWS) {
      return {
        success: false,
        error: `Cannot add ${count} row(s). Maximum rows (${MAX_SPREADSHEET_ROWS}) would be exceeded. Current: ${tab.rows.length}`,
      };
    }

    for (let i = 0; i < count; i++) {
      store.addRow(activeTabId);
    }

    return {
      success: true,
      message: `Added ${count} new row${count > 1 ? 's' : ''}`,
    };
  } catch (error) {
    console.error("Error in addRow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const removeRow = async (rowId: string | number) => {
  try {
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
  } catch (error) {
    console.error("Error in removeRow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const readCell = async (rowId: string | number, columnId: string) => {
  try {
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
    const cell = tab.rows[rowIndex].cells[cellIndex];

    return {
      success: true,
      cell: cell,
      message: `Read cell ${columnId}${rowId} from tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in readCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const readRange = async (
  startRow: string | number,
  startColumn: string,
  endRow: string | number,
  endColumn: string,
) => {
  try {
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

    // Extract the range data
    const data: Cell[][] = [];
    for (let rowIdx = startRowIdx; rowIdx <= endRowIdx; rowIdx++) {
      const rowData: Cell[] = [];
      for (let cellIdx = startColIdx; cellIdx <= endColIdx; cellIdx++) {
        rowData.push(tab.rows[rowIdx].cells[cellIdx]);
      }
      data.push(rowData);
    }

    return {
      success: true,
      data: data,
      message: `Read range ${startColumn}${startRow}:${endColumn}${endRow} from tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in readRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const clearRange = async (
  startRow: string | number,
  startColumn: string,
  endRow: string | number,
  endColumn: string,
) => {
  try {
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

    // Create updated rows with cleared cells
    const updatedRows = tab.rows.map((row, rowIdx) => {
      if (rowIdx < startRowIdx || rowIdx > endRowIdx) {
        return row;
      }

      const updatedCells = row.cells.map((cell, cellIdx) => {
        if (cellIdx < startColIdx || cellIdx > endColIdx) {
          return cell;
        }

        // Check if cell is editable
        if ("nonEditable" in cell && cell.nonEditable) {
          return cell;
        }

        // Clear the cell by setting it to empty text
        return { type: 'text' as const, text: '' };
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
      message: `Cleared range ${startColumn}${startRow}:${endColumn}${endRow} in tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in clearRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

const sortByColumn = async (columnId: string, order: "asc" | "desc" = "asc") => {
  try {
    const store = useSpreadsheetTabsStore.getState();
    const activeTabId = store.activeTabId;

    if (!activeTabId) {
      return { success: false, error: "No active tab" };
    }

    const tab = store.tabs.find((t) => t.id === activeTabId);
    if (!tab) {
      return { success: false, error: "Active tab not found" };
    }

    const columnIndex = tab.columns.findIndex((c) => c.columnId === columnId);
    if (columnIndex === -1) {
      return { success: false, error: `Column ${columnId} not found` };
    }

    // Separate header row from data rows
    const headerRow = tab.rows[0];
    const dataRows = tab.rows.slice(1);

    // Sort data rows by the specified column
    const sortedDataRows = [...dataRows].sort((a, b) => {
      const cellA = a.cells[columnIndex];
      const cellB = b.cells[columnIndex];

      // Get comparable values
      let valueA: string | number = "";
      let valueB: string | number = "";

      if (cellA.type === "number") {
        valueA = cellA.value || 0;
      } else if (cellA.type === "text") {
        valueA = cellA.text || "";
      }

      if (cellB.type === "number") {
        valueB = cellB.value || 0;
      } else if (cellB.type === "text") {
        valueB = cellB.text || "";
      }

      // Compare values
      if (typeof valueA === "number" && typeof valueB === "number") {
        return order === "asc" ? valueA - valueB : valueB - valueA;
      }

      // String comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      if (order === "asc") {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });

    // Reconstruct rows with header first
    const updatedRows = [headerRow, ...sortedDataRows];

    // Update the tab
    store.updateTab(activeTabId, { rows: updatedRows });

    return {
      success: true,
      message: `Sorted by column ${columnId} in ${order}ending order in tab "${tab.name}"`,
    };
  } catch (error) {
    console.error("Error in sortByColumn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

// ============================================
// Tool Definitions
// ============================================

const cellObjectSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("number"),
    value: z.number(),
    formatOptions: z.object({
      style: z.enum(["decimal", "currency", "percent", "unit"]).optional(),
      currency: z.string().optional(),
      minimumFractionDigits: z.number().optional(),
      maximumFractionDigits: z.number().optional(),
      useGrouping: z.boolean().optional(),
    }).optional(),
  }),
]);

export const updateCellTool = {
  name: "updateSpreadsheetCell",
  description:
    "Update a single cell in the active spreadsheet tab. Provide the row ID (number like 1, 2, 3), column ID (letter like 'A', 'B', 'C'), and a cell object with explicit type. For text cells use: { type: 'text', text: 'your text' }. For number cells use: { type: 'number', value: 42, formatOptions: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 } (optional) }. IMPORTANT: Always specify the cell type explicitly. Number formatting uses Intl.NumberFormat options. Examples: { style: 'decimal', minimumFractionDigits: 2 } for '42.00', { style: 'currency', currency: 'USD' } for '$42.00', { style: 'percent' } for '42%'.",
  tool: updateCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row identifier (e.g., 1, 2, 3)"),
      z.string().describe("Column identifier (e.g., 'A', 'B', 'C')"),
      cellObjectSchema.describe("Cell object with type: { type: 'text', text: 'value' } or { type: 'number', value: 42 }"),
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
    "Update a range of cells in the active spreadsheet tab. CRITICAL REQUIREMENTS: " +
    "1. Data MUST be a 2D array (array of arrays) - NOT a flat array " +
    "2. EVERY cell MUST be an object with a 'type' property - NEVER use raw strings or numbers " +
    "3. Text cells: { type: 'text', text: 'your string value' } " +
    "4. Number cells: { type: 'number', value: 42, formatOptions: { style: 'decimal', minimumFractionDigits: 2 } } " +
    "CORRECT EXAMPLES: " +
    "- Single column (A1:A3): [[{type:'text',text:'Row1'}], [{type:'text',text:'Row2'}], [{type:'text',text:'Row3'}]] " +
    "- Single row (A1:C1): [[{type:'text',text:'Col1'}, {type:'text',text:'Col2'}, {type:'text',text:'Col3'}]] " +
    "- Mixed types (A1:B2): [[{type:'text',text:'Name'}, {type:'number',value:25.5}], [{type:'text',text:'Bob'}, {type:'number',value:30.0}]] " +
    "WRONG - DO NOT USE: " +
    "- ['A','B','C'] (flat array) " +
    "- [['A','B','C']] (raw strings - must use {type:'text',text:'A'}) " +
    "- [[25, 30]] (raw numbers - must use {type:'number',value:25}) " +
    "Number formatting: Use formatOptions with Intl.NumberFormat options: {style:'currency',currency:'USD'}, {style:'decimal',minimumFractionDigits:2}, {style:'percent'}",
  tool: updateRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Start row ID"),
      z.string().describe("Start column ID (e.g., 'A')"),
      z.union([z.string(), z.number()]).describe("End row ID"),
      z.string().describe("End column ID (e.g., 'C')"),
      z.array(z.array(cellObjectSchema)).describe("2D array of cell objects. EVERY element must be an object with 'type' property. Example: [[{ type: 'text', text: 'Name' }, { type: 'number', value: 42 }]]. DO NOT use raw strings or numbers."),
    )
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
  description: "Add one or more new columns to the active spreadsheet tab. Optionally specify how many columns to add (default 1). IMPORTANT: Only use this if all existing columns are filled with data. The spreadsheet starts with columns A-E by default, so check if there are empty columns available before adding new ones. Use this to add multiple columns in a single call.",
  tool: addColumn,
  toolSchema: z
    .function()
    .args(z.number().optional().describe("Number of columns to add (default 1)"))
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
  description: "Add one or more new rows to the active spreadsheet tab. Optionally specify how many rows to add (default 1). IMPORTANT: Only use this if all existing rows are filled with data. The spreadsheet starts with many empty rows (typically 20+), so check if there are empty rows available before adding new ones. Use this to add multiple rows in a single call.",
  tool: addRow,
  toolSchema: z
    .function()
    .args(z.number().optional().describe("Number of rows to add (default 1)"))
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

export const readCellTool = {
  name: "readSpreadsheetCell",
  description: "Read the value of a single cell from the active spreadsheet tab. Returns the cell object with its type and value. Use this to inspect cell contents before performing operations.",
  tool: readCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row identifier (e.g., 1, 2, 3)"),
      z.string().describe("Column identifier (e.g., 'A', 'B', 'C')"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        cell: z.any().optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const readRangeTool = {
  name: "readSpreadsheetRange",
  description: "Read a range of cells from the active spreadsheet tab. Returns a 2D array of cell objects. Use this to inspect multiple cells at once or analyze data before processing.",
  tool: readRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Start row ID"),
      z.string().describe("Start column ID (e.g., 'A')"),
      z.union([z.string(), z.number()]).describe("End row ID"),
      z.string().describe("End column ID (e.g., 'C')"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        data: z.array(z.array(z.any())).optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const clearRangeTool = {
  name: "clearSpreadsheetRange",
  description: "Clear all cells in a specified range by setting them to empty text. Non-editable cells will be skipped. Use this to quickly erase data from multiple cells at once.",
  tool: clearRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Start row ID"),
      z.string().describe("Start column ID (e.g., 'A')"),
      z.union([z.string(), z.number()]).describe("End row ID"),
      z.string().describe("End column ID (e.g., 'C')"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const sortByColumnTool = {
  name: "sortSpreadsheetByColumn",
  description: "Sort the spreadsheet data by a specified column in ascending or descending order. The header row is preserved at the top. Numbers are sorted numerically, text is sorted alphabetically (case-insensitive).",
  tool: sortByColumn,
  toolSchema: z
    .function()
    .args(
      z.string().describe("Column ID to sort by (e.g., 'A', 'B', 'C')"),
      z.enum(["asc", "desc"]).optional().describe("Sort order: 'asc' for ascending, 'desc' for descending (default: 'asc')"),
    )
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
  addColumnTool,
  removeColumnTool,
  addRowTool,
  removeRowTool,
  readCellTool,
  readRangeTool,
  clearRangeTool,
  sortByColumnTool,
];
