"use client";

/**
 * @file spreadsheet-tools.ts
 * @description FortuneSheet-backed tools exposed to Tambo AI agents.
 */

import { fortuneSheetStore, createBlankSheet } from "@/lib/fortune-sheet-store";
import {
  columnIndexToLetter,
  letterToColumnIndex,
  parseCellReference,
  parseRangeReference,
  getSheetRowCount,
  getSheetColumnCount,
  buildCelldataLookup,
  getCellFromLookup,
} from "@/lib/fortune-sheet-utils";
import {
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
  MAX_TEXT_LENGTH,
} from "@/lib/constants";
import {
  getAllFunctions,
  getFunctionsByCategory,
  getFunction,
} from "@/lib/formula-functions";
import type { WorkbookInstance } from "@fortune-sheet/react";
import { z } from "zod";

type CellDataType =
  | { type: "text"; text: string }
  | { type: "number"; value: number }
  | { type: "formula"; formula: string };

type RangeDataType = Array<Array<CellDataType>>;

function ensureWorkbook(): WorkbookInstance {
  const workbook = fortuneSheetStore.getWorkbook();
  if (!workbook) {
    throw new Error("Spreadsheet workbook is not ready. Ensure the UI is mounted.");
  }
  return workbook;
}

function ensureActiveSheetId(): string {
  const { sheets, activeSheetId } = fortuneSheetStore.getState();
  if (activeSheetId) {
    return activeSheetId;
  }
  if (sheets.length > 0 && sheets[0]?.id) {
    return sheets[0].id!;
  }
  const blank = createBlankSheet("Sheet1", 0, { isActive: true });
  fortuneSheetStore.setSheets([blank]);
  return blank.id!;
}

function sanitizeText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_TEXT_LENGTH
    ? trimmed.slice(0, MAX_TEXT_LENGTH)
    : trimmed;
}

function isNumericString(value: string): boolean {
  return /^[0-9]+$/.test(value.trim());
}

function normalizeValue(cellData: CellDataType): string | number {
  if (cellData.type === "number") {
    const value = Number(cellData.value);
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid number value: ${cellData.value}`);
    }
    return value;
  }
  if (cellData.type === "formula") {
    const formula = cellData.formula.trim();
    if (!formula.startsWith("=")) {
      return `=${formula}`;
    }
    return formula;
  }
  return sanitizeText(cellData.text);
}

function resolveAddress(input: string | number, column?: string) {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (column && isNumericString(trimmed)) {
      return resolveAddress(Number.parseInt(trimmed, 10), column);
    }
    const parsed = parseCellReference(trimmed);
    return { row: parsed.row, column: parsed.col };
  }
  if (!column) {
    throw new Error("Column identifier is required when using numeric row references.");
  }
  const numericRow = Number(input);
  if (!Number.isFinite(numericRow) || numericRow <= 0 || !Number.isInteger(numericRow)) {
    throw new Error(`Row reference must be a positive integer. Received: ${input}`);
  }
  const colIndex = letterToColumnIndex(column.toUpperCase());
  return { row: numericRow - 1, column: colIndex };
}

function resolveRange(
  start: string | number,
  startColumn?: string,
  endRow?: string | number,
  endColumn?: string
) {
  if (typeof start === "string" && !startColumn) {
    return parseRangeReference(start);
  }
  if (
    startColumn === undefined ||
    endRow === undefined ||
    endColumn === undefined
  ) {
    throw new Error(
      "Row/column notation requires start row, start column, end row, and end column."
    );
  }
  const startPoint = resolveAddress(start, startColumn);
  const endPoint = resolveAddress(endRow, endColumn);
  return {
    start: { row: Math.min(startPoint.row, endPoint.row), col: Math.min(startPoint.column, endPoint.column) },
    end: { row: Math.max(startPoint.row, endPoint.row), col: Math.max(startPoint.column, endPoint.column) },
  };
}

function getActiveSheetSnapshot() {
  const sheetId = ensureActiveSheetId();
  const { sheets } = fortuneSheetStore.getState();
  const sheet = sheets.find((candidate) => candidate.id === sheetId);
  if (!sheet) {
    throw new Error(`Sheet with id "${sheetId}" not found.`);
  }
  return { sheetId, sheet };
}

async function updateCell(
  rowIdOrAddress: string | number,
  columnIdOrData?: string | CellDataType,
  cellDataOrUndefined?: CellDataType
) {
  try {
    const workbook = ensureWorkbook();
    const { sheetId } = getActiveSheetSnapshot();

    let row: number;
    let column: number;
    let payload: CellDataType;

    const isRowColumnCall =
      (typeof rowIdOrAddress === "number" ||
        (typeof rowIdOrAddress === "string" && isNumericString(rowIdOrAddress))) &&
      typeof columnIdOrData === "string";

    if (!isRowColumnCall) {
      if (typeof rowIdOrAddress !== "string") {
        throw new Error(
          "When using row/column notation, provide the column letter as the second argument."
        );
      }
      if (!columnIdOrData) {
        throw new Error(
          "When using A1 notation, provide the cell data as the second argument."
        );
      }
      const address = resolveAddress(rowIdOrAddress);
      row = address.row;
      column = address.column;
      payload = columnIdOrData as CellDataType;
    } else {
      const address = resolveAddress(rowIdOrAddress, columnIdOrData);
      row = address.row;
      column = address.column;
      if (!cellDataOrUndefined) {
        throw new Error("Cell data must be provided.");
      }
      payload = cellDataOrUndefined;
    }

    const value = normalizeValue(payload);
    workbook.setCellValue(row, column, value, { id: sheetId });

    const label = `${columnIndexToLetter(column)}${row + 1}`;
    return {
      success: true,
      message: `Updated cell ${label}`,
    };
  } catch (error) {
    console.error("Error in updateCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function updateRange(
  startRowOrRange: string | number,
  startColumnOrData?: string | RangeDataType,
  endRow?: string | number,
  endColumn?: string,
  data?: RangeDataType
) {
  try {
    const workbook = ensureWorkbook();
    const { sheetId } = getActiveSheetSnapshot();

    let rangeData: RangeDataType;
    let resolvedRange;

    if (typeof startRowOrRange === "string" && !startColumnOrData) {
      throw new Error("When using range address, provide range data as second argument.");
    }

    if (typeof startRowOrRange === "string" && startColumnOrData) {
      resolvedRange = parseRangeReference(startRowOrRange);
      rangeData = startColumnOrData as RangeDataType;
    } else {
      resolvedRange = resolveRange(
        startRowOrRange as number,
        startColumnOrData as string,
        endRow,
        endColumn
      );
      if (!data) {
        throw new Error("Range data must be provided.");
      }
      rangeData = data;
    }

    const rowSpan = resolvedRange.end.row - resolvedRange.start.row + 1;
    const colSpan = resolvedRange.end.col - resolvedRange.start.col + 1;

    if (rangeData.length !== rowSpan) {
      throw new Error(
        `Range expects ${rowSpan} rows but data has ${rangeData.length}.`
      );
    }
    rangeData.forEach((row, idx) => {
      if (row.length !== colSpan) {
        throw new Error(
          `Row ${idx + 1} in range data has ${row.length} columns but expected ${colSpan}.`
        );
      }
    });

    const values = rangeData.map((row) => row.map(normalizeValue));
    workbook.setCellValuesByRange(values, {
      row: [resolvedRange.start.row, resolvedRange.end.row],
      column: [resolvedRange.start.col, resolvedRange.end.col],
    }, { id: sheetId });

    const startLabel = `${columnIndexToLetter(resolvedRange.start.col)}${resolvedRange.start.row + 1}`;
    const endLabel = `${columnIndexToLetter(resolvedRange.end.col)}${resolvedRange.end.row + 1}`;

    return {
      success: true,
      message: `Updated range ${startLabel}:${endLabel}`,
    };
  } catch (error) {
    console.error("Error in updateRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function addColumn(count: number = 1) {
  try {
    if (count < 1) {
      throw new Error("Count must be at least 1.");
    }
    const workbook = ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();
    const columnCount = getSheetColumnCount(sheet);
    if (columnCount + count > MAX_SPREADSHEET_COLUMNS) {
      throw new Error(
        `Cannot add columns beyond ${MAX_SPREADSHEET_COLUMNS}.`
      );
    }
    workbook.insertRowOrColumn("column", columnCount, count, "rightbottom", {
      id: sheetId,
    });
    return {
      success: true,
      message: `Added ${count} column${count > 1 ? "s" : ""}.`,
    };
  } catch (error) {
    console.error("Error in addColumn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function removeColumn(columnId: string) {
  try {
    const workbook = ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();
    const columnIndex = letterToColumnIndex(columnId.toUpperCase());
    const columnCount = getSheetColumnCount(sheet);
    if (columnIndex < 0 || columnIndex >= columnCount) {
      throw new Error(`Column ${columnId} is out of bounds.`);
    }
    workbook.deleteRowOrColumn("column", columnIndex, columnIndex, {
      id: sheetId,
    });
    return {
      success: true,
      message: `Removed column ${columnId.toUpperCase()}.`,
    };
  } catch (error) {
    console.error("Error in removeColumn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function addRow(count: number = 1) {
  try {
    if (count < 1) {
      throw new Error("Count must be at least 1.");
    }
    const workbook = ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();
    const rowCount = getSheetRowCount(sheet);
    if (rowCount + count > MAX_SPREADSHEET_ROWS) {
      throw new Error(`Cannot add rows beyond ${MAX_SPREADSHEET_ROWS}.`);
    }
    workbook.insertRowOrColumn("row", rowCount, count, "rightbottom", {
      id: sheetId,
    });
    return {
      success: true,
      message: `Added ${count} row${count > 1 ? "s" : ""}.`,
    };
  } catch (error) {
    console.error("Error in addRow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function removeRow(rowId: string | number) {
  try {
    const rowNumber = typeof rowId === "string" ? Number(rowId) : rowId;
    if (!Number.isFinite(rowNumber) || rowNumber < 1) {
      throw new Error("Row must be a positive integer.");
    }
    const workbook = ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();
    const rowIndex = rowNumber - 1;
    const rowCount = getSheetRowCount(sheet);
    if (rowIndex < 0 || rowIndex >= rowCount) {
      throw new Error(`Row ${rowNumber} is out of bounds.`);
    }
    workbook.deleteRowOrColumn("row", rowIndex, rowIndex, { id: sheetId });
    return {
      success: true,
      message: `Removed row ${rowNumber}.`,
    };
  } catch (error) {
    console.error("Error in removeRow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function readCell(rowOrAddress: string | number, columnId?: string) {
  try {
    const { sheet } = getActiveSheetSnapshot();
    const address = resolveAddress(rowOrAddress, columnId);
    const lookup = buildCelldataLookup(sheet);
    const cell = getCellFromLookup(lookup, address.row, address.column);
    return {
      success: true,
      cell,
      message: cell
        ? `Read cell ${columnIndexToLetter(address.column)}${address.row + 1}.`
        : "Cell is empty.",
    };
  } catch (error) {
    console.error("Error in readCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function readRange(
  startRowOrRange: string | number,
  startColumn?: string,
  endRow?: string | number,
  endColumn?: string
) {
  try {
    const resolvedRange = resolveRange(
      startRowOrRange,
      startColumn,
      endRow,
      endColumn
    );
    const { sheet } = getActiveSheetSnapshot();
    const lookup = buildCelldataLookup(sheet);
    const data: Array<Array<unknown>> = [];

    for (let row = resolvedRange.start.row; row <= resolvedRange.end.row; row++) {
      const rowData: unknown[] = [];
      for (let col = resolvedRange.start.col; col <= resolvedRange.end.col; col++) {
        rowData.push(getCellFromLookup(lookup, row, col));
      }
      data.push(rowData);
    }

    const startLabel = `${columnIndexToLetter(resolvedRange.start.col)}${resolvedRange.start.row + 1}`;
    const endLabel = `${columnIndexToLetter(resolvedRange.end.col)}${resolvedRange.end.row + 1}`;
    return {
      success: true,
      data,
      message: `Read range ${startLabel}:${endLabel}.`,
    };
  } catch (error) {
    console.error("Error in readRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function clearRange(
  startRowOrRange: string | number,
  startColumn?: string,
  endRow?: string | number,
  endColumn?: string
) {
  try {
    const workbook = ensureWorkbook();
    const { sheetId } = getActiveSheetSnapshot();
    const resolvedRange = resolveRange(
      startRowOrRange,
      startColumn,
      endRow,
      endColumn
    );

    for (let row = resolvedRange.start.row; row <= resolvedRange.end.row; row++) {
      for (let col = resolvedRange.start.col; col <= resolvedRange.end.col; col++) {
        workbook.clearCell(row, col, { id: sheetId });
      }
    }

    const startLabel = `${columnIndexToLetter(resolvedRange.start.col)}${resolvedRange.start.row + 1}`;
    const endLabel = `${columnIndexToLetter(resolvedRange.end.col)}${resolvedRange.end.row + 1}`;

    return {
      success: true,
      message: `Cleared range ${startLabel}:${endLabel}.`,
    };
  } catch (error) {
    console.error("Error in clearRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function listFormulas(options?: { category?: string }) {
  try {
    const category = options?.category;
    const functions = category
      ? getFunctionsByCategory(category)
      : getAllFunctions();
    return {
      success: true,
      functions,
      message: category
        ? `Returned ${functions.length} functions in category "${category}".`
        : `Returned ${functions.length} spreadsheet functions.`,
    };
  } catch (error) {
    console.error("Error in listFormulas:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function getFormulaHelp(args: { functionName: string }) {
  try {
    const fn = getFunction(args.functionName);
    if (!fn) {
      return {
        success: false,
        error: `Function "${args.functionName}" not found.`,
      };
    }
    return {
      success: true,
      function: fn,
    };
  } catch (error) {
    console.error("Error in getFormulaHelp:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export const updateCellTool = {
  name: "updateSpreadsheetCell",
  description:
    "Update a single cell in the active sheet. Provide either A1 notation (e.g., updateSpreadsheetCell('B5', { type: 'text', text: 'Hello' })) or row/column notation (e.g., updateSpreadsheetCell(5, 'B', { type: 'number', value: 42 })).",
  tool: updateCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row index or A1 address"),
      z
        .union([
          z.string().describe("Column letter when using row/column notation"),
          z.object({
            type: z.enum(["text", "number", "formula"]),
            text: z.string().optional(),
            value: z.number().optional(),
            formula: z.string().optional(),
          }),
        ])
        .describe("Column letter or cell payload"),
      z
        .object({
          type: z.enum(["text", "number", "formula"]),
          text: z.string().optional(),
          value: z.number().optional(),
          formula: z.string().optional(),
        })
        .optional()
        .describe("Cell payload when using row/column arguments"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const updateRangeTool = {
  name: "updateSpreadsheetRange",
  description:
    "Update a range of cells in the active sheet. Provide A1 notation with a 2D array of cell payloads, or specify row/column boundaries explicitly.",
  tool: updateRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Range (A1) or start row"),
      z
        .union([
          z.string().describe("Start column (if not using A1 notation)"),
          z
            .array(
              z.array(
                z.object({
                  type: z.enum(["text", "number", "formula"]),
                  text: z.string().optional(),
                  value: z.number().optional(),
                  formula: z.string().optional(),
                })
              )
            )
            .describe("Range data when using A1 notation"),
        ])
        .optional(),
      z.union([z.string(), z.number()]).optional().describe("End row"),
      z.string().optional().describe("End column"),
      z
        .array(
          z.array(
            z.object({
              type: z.enum(["text", "number", "formula"]),
              text: z.string().optional(),
              value: z.number().optional(),
              formula: z.string().optional(),
            })
          )
        )
        .optional()
        .describe("Range data when using row/column notation"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const addColumnTool = {
  name: "addSpreadsheetColumn",
  description: "Append new columns to the active sheet.",
  tool: addColumn,
  toolSchema: z
    .function()
    .args(
      z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of columns to add (default: 1)")
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const removeColumnTool = {
  name: "removeSpreadsheetColumn",
  description: "Remove a column (e.g., 'B') from the active sheet.",
  tool: removeColumn,
  toolSchema: z
    .function()
    .args(z.string().describe("Column letter to remove"))
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const addRowTool = {
  name: "addSpreadsheetRow",
  description: "Append new rows to the active sheet.",
  tool: addRow,
  toolSchema: z
    .function()
    .args(
      z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of rows to add (default: 1)")
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const removeRowTool = {
  name: "removeSpreadsheetRow",
  description: "Remove a row by number (e.g., 3).",
  tool: removeRow,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe(
        "Row number to remove (1-based)."
      )
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const readCellTool = {
  name: "readSpreadsheetCell",
  description:
    "Read a single cell from the active sheet. Supports A1 notation (e.g., 'B5') or row/column arguments.",
  tool: readCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row index or A1 address"),
      z.string().optional().describe("Column letter when using row/column notation")
    )
    .returns(
      z.object({
        success: z.boolean(),
        cell: z.any().optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const readRangeTool = {
  name: "readSpreadsheetRange",
  description:
    "Read a rectangular range of cells. Supports A1 notation (e.g., 'A1:C5') or row/column boundaries.",
  tool: readRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Range (A1) or start row"),
      z.string().optional().describe("Start column"),
      z.union([z.string(), z.number()]).optional().describe("End row"),
      z.string().optional().describe("End column")
    )
    .returns(
      z.object({
        success: z.boolean(),
        data: z.array(z.array(z.any())).optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const clearRangeTool = {
  name: "clearSpreadsheetRange",
  description:
    "Clear a range of cells by removing their values. Supports A1 notation or row/column bounds.",
  tool: clearRange,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Range (A1) or start row"),
      z.string().optional().describe("Start column"),
      z.union([z.string(), z.number()]).optional().describe("End row"),
      z.string().optional().describe("End column")
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const listFormulasTool = {
  name: "listSpreadsheetFormulas",
  description:
    "List supported spreadsheet functions. Optionally filter by category (Math, Statistical, Text, Logical, Date, Lookup, Financial, Information).",
  tool: listFormulas,
  toolSchema: z
    .function()
    .args(
      z
        .object({
          category: z.string().optional(),
        })
        .optional()
    )
    .returns(
      z.object({
        success: z.boolean(),
        functions: z.array(
          z.object({
            name: z.string(),
            category: z.string(),
            signature: z.string(),
            description: z.string(),
            example: z.string().optional(),
          })
        ).optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const getFormulaHelpTool = {
  name: "getSpreadsheetFormulaHelp",
  description:
    "Look up metadata for a specific function (signature, description, examples). Function names are case-insensitive.",
  tool: getFormulaHelp,
  toolSchema: z
    .function()
    .args(
      z.object({
        functionName: z.string().describe("Function name, e.g., 'SUM'"),
      })
    )
    .returns(
      z.object({
        success: z.boolean(),
        function: z
          .object({
            name: z.string(),
            category: z.string(),
            signature: z.string(),
            description: z.string(),
            example: z.string().optional(),
          })
          .optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

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
  listFormulasTool,
  getFormulaHelpTool,
];
