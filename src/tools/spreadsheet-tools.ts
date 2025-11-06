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
import type { Cell, Sheet } from "@fortune-sheet/core";
import type { WorkbookInstance } from "@fortune-sheet/react";
import { z } from "zod";

type CellDataType =
  | { type: "text"; text: string }
  | { type: "number"; value: number }
  | { type: "formula"; formula: string };

type CellEvaluation = {
  address: string;
  row: number;
  column: number;
  rawValue: unknown;
  displayValue: string | null;
  formula: string | null;
  error: string | null;
};

const EXCEL_ERROR_PREFIX =
  /^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA|SPILL!|CALC!|FIELD!|BLOCKED!|UNKNOWN!|ERROR!)/i;

const cellEvaluationSchema = z.object({
  address: z.string(),
  row: z.number().int(),
  column: z.number().int(),
  rawValue: z.any(),
  displayValue: z.string().nullable(),
  formula: z.string().nullable(),
  error: z.string().nullable(),
});

const cellEvaluationWithStatusSchema = cellEvaluationSchema.extend({
  success: z.boolean(),
});

const cellPayloadSchema = z.object({
  type: z.enum(["text", "number", "formula"]),
  text: z.string().optional(),
  value: z.number().optional(),
  formula: z.string().optional(),
});

const singleCellUpdateResultSchema = z.object({
  success: z.boolean(),
  cell: cellEvaluationWithStatusSchema,
});

const EVALUATION_POLL_INTERVAL_MS = 50;
const EVALUATION_MAX_ATTEMPTS = 60;
const FORMULA_ERROR_RESOLUTION =
  "The formula was written to the cell, but it evaluated to an error. Update the cell with a supported formula or adjust its arguments before proceeding.";

const cellErrorSummarySchema = z.object({
  address: z.string(),
  error: z.string(),
});

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
  const sanitized = sanitizeText(cellData.text);
  if (sanitized.startsWith("=")) {
    return `'${sanitized}`;
  }
  return sanitized;
}

function normalizeRangeValue(cellData: CellDataType | null): string | number {
  if (cellData === null) {
    return "";
  }
  return normalizeValue(cellData);
}

function waitForWorkbookTick(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function toDisplayString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function detectErrorFromCell(
  cell: Cell | null,
  rawValue: unknown,
  displayValue: string | null
): string | null {
  if (cell?.ct?.t === "e") {
    const display = cell.m ?? cell.v ?? rawValue;
    return typeof display === "string" ? display : toDisplayString(display);
  }

  if (typeof rawValue === "string" && EXCEL_ERROR_PREFIX.test(rawValue.trim())) {
    return rawValue;
  }

  if (
    typeof displayValue === "string" &&
    EXCEL_ERROR_PREFIX.test(displayValue.trim())
  ) {
    return displayValue;
  }

  return null;
}

function buildCellEvaluation(
  workbook: WorkbookInstance,
  sheetId: string,
  row: number,
  column: number,
  sheetLookup?: Map<string, Cell | null>
): CellEvaluation {
  const label = `${columnIndexToLetter(column)}${row + 1}`;
  const rawValue = workbook.getCellValue(row, column, { id: sheetId });
  const displayValueRaw = workbook.getCellValue(row, column, {
    id: sheetId,
    type: "m",
  });
  const formulaValueRaw = workbook.getCellValue(row, column, {
    id: sheetId,
    type: "f",
  });

  let lookup = sheetLookup;
  let sheet: Sheet | undefined;
  if (!lookup) {
    sheet = fortuneSheetStore.getSheetById(sheetId) ?? workbook.getSheet({ id: sheetId });
    lookup = sheet ? buildCelldataLookup(sheet) : new Map();
  } else {
    sheet = fortuneSheetStore.getSheetById(sheetId) ?? workbook.getSheet({ id: sheetId });
  }

  const cellFromLookup = lookup ? getCellFromLookup(lookup, row, column) : null;
  const cell = cellFromLookup ?? getCellFromSheetSnapshot(sheet, row, column);
  let formula =
    typeof formulaValueRaw === "string" && formulaValueRaw.trim().length > 0
      ? formulaValueRaw
      : null;
  if (!formula && cell && typeof cell === "object" && typeof cell.f === "string") {
    formula = cell.f;
  }
  if (!formula && typeof rawValue === "string" && rawValue.trim().startsWith("=")) {
    formula = rawValue.trim();
  }

  const displayValue =
    displayValueRaw !== undefined && displayValueRaw !== null
      ? toDisplayString(displayValueRaw)
      : cell && cell.m !== undefined && cell.m !== null
      ? String(cell.m)
      : toDisplayString(rawValue);

  const error = detectErrorFromCell(cell, rawValue, displayValue);

  return {
    address: label,
    row,
    column,
    rawValue,
    displayValue,
    formula,
    error,
  };
}

function buildFormulaRules(fn: {
  signature: string;
  description: string;
  example?: string;
}): string[] {
  const rules = [
    `Signature: ${fn.signature}`,
    `Description: ${fn.description}`,
  ];
  if (fn.example) {
    rules.push(`Example: ${fn.example}`);
  }
  return rules;
}

function getCellFromSheetSnapshot(
  sheet: Sheet | undefined,
  row: number,
  column: number
): Cell | null {
  if (!sheet) {
    return null;
  }

  if (Array.isArray(sheet.celldata)) {
    const match = sheet.celldata.find(
      (entry) => entry.r === row && entry.c === column,
    );
    if (match) {
      return match.v ?? null;
    }
  }

  if (Array.isArray(sheet.data) && Array.isArray(sheet.data[row])) {
    const value = sheet.data[row]?.[column];
    if (value && typeof value === "object") {
      return value as Cell;
    }
    if (value !== undefined && value !== null) {
      return {
        v: value,
        m: typeof value === "string" ? value : toDisplayString(value),
      } as unknown as Cell;
    }
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldContinuePolling(
  evaluation: CellEvaluation,
  expectFormula: boolean
): boolean {
  if (evaluation.error) {
    return false;
  }
  if (!expectFormula) {
    return false;
  }

  const hasValue =
    evaluation.formula !== null ||
    evaluation.displayValue !== null ||
    evaluation.rawValue !== null;

  return !hasValue;
}

async function waitForCellEvaluation(
  workbook: WorkbookInstance,
  sheetId: string,
  row: number,
  column: number,
  options?: { expectFormula?: boolean }
): Promise<CellEvaluation> {
  const expectFormula = options?.expectFormula ?? false;

  let evaluation = buildCellEvaluation(workbook, sheetId, row, column);
  if (!shouldContinuePolling(evaluation, expectFormula)) {
    return evaluation;
  }

  await waitForWorkbookTick();
  evaluation = buildCellEvaluation(workbook, sheetId, row, column);
  if (!shouldContinuePolling(evaluation, expectFormula)) {
    return evaluation;
  }

  for (let attempt = 0; attempt < EVALUATION_MAX_ATTEMPTS; attempt++) {
    await delay(EVALUATION_POLL_INTERVAL_MS);
    evaluation = buildCellEvaluation(workbook, sheetId, row, column);
    if (!shouldContinuePolling(evaluation, expectFormula)) {
      break;
    }
  }

  return evaluation;
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
    if (typeof (workbook as { setSelection?: unknown }).setSelection === "function") {
      (workbook as {
        setSelection: (
          selection: Array<{ row: [number, number]; column: [number, number] }>,
          options?: { id?: string }
        ) => void;
      }).setSelection([{ row: [row, row], column: [column, column] }], { id: sheetId });
    }
    workbook.setCellValue(row, column, value, { id: sheetId });
    workbook.calculateFormula(sheetId, {
      row: [row, row],
      column: [column, column],
    });

    const evaluation = await waitForCellEvaluation(workbook, sheetId, row, column, {
      expectFormula: payload.type === "formula",
    });

    const label = `${columnIndexToLetter(column)}${row + 1}`;
    const cellResult = {
      ...evaluation,
      success: !evaluation.error,
    };

    if (evaluation.error) {
      return {
        success: false,
        message: `Cell ${label} shows a spreadsheet error after the update.`,
        error: evaluation.error,
        writeStatus: "applied_with_error",
        evaluationStatus: "error",
        resolution: FORMULA_ERROR_RESOLUTION,
        evaluation,
        result: {
          success: false,
          cell: cellResult,
        },
        errorCells: [
          {
            address: label,
            error: evaluation.error,
          },
        ],
      };
    }

    return {
      success: true,
      message: `Updated cell ${label}`,
      writeStatus: "applied",
      evaluationStatus: "ok",
      evaluation,
      result: {
        success: true,
        cell: cellResult,
      },
    };
  } catch (error) {
    console.error("Error in updateCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function updateLinearRange(args: {
  start: string;
  direction: "horizontal" | "vertical";
  count: number;
  values: Array<CellDataType | null>;
}) {
  try {
    const { start, direction, count, values } = args;
    const workbook = ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();

    if (!Number.isInteger(count) || count < 1) {
      throw new Error("Count must be a positive integer.");
    }
    if (values.length !== count) {
      throw new Error(
        `Values length (${values.length}) must match count (${count}).`,
      );
    }

    const startAddress = resolveAddress(start);
    const delta = direction === "vertical" ? { row: 1, column: 0 } : { row: 0, column: 1 };
    const endRow = startAddress.row + delta.row * (count - 1);
    const endColumn = startAddress.column + delta.column * (count - 1);

    const maxRow = Math.max(startAddress.row, endRow);
    const maxColumn = Math.max(startAddress.column, endColumn);

    if (maxRow >= MAX_SPREADSHEET_ROWS) {
      throw new Error(
        `Target row ${maxRow + 1} exceeds the spreadsheet limit of ${MAX_SPREADSHEET_ROWS}.`,
      );
    }
    if (maxColumn >= MAX_SPREADSHEET_COLUMNS) {
      throw new Error(
        `Target column exceeds the spreadsheet limit of ${MAX_SPREADSHEET_COLUMNS}.`,
      );
    }

    const rowCount = getSheetRowCount(sheet);
    const columnCount = getSheetColumnCount(sheet);

    if (maxRow >= rowCount) {
      throw new Error(
        `Target row ${maxRow + 1} is beyond the active sheet's ${rowCount} rows. Add rows first.`,
      );
    }
    if (maxColumn >= columnCount) {
      throw new Error(
        `Target column ${columnIndexToLetter(maxColumn)} is beyond the active sheet's ${columnCount} columns. Add columns first.`,
      );
    }

    const expectFormulas = values.map((value) => value?.type === "formula");

    for (let index = 0; index < count; index++) {
      const row = startAddress.row + delta.row * index;
      const column = startAddress.column + delta.column * index;
      const normalized = normalizeRangeValue(values[index] ?? null);
      if (typeof (workbook as { setSelection?: unknown }).setSelection === "function") {
        (workbook as {
          setSelection: (
            selection: Array<{ row: [number, number]; column: [number, number] }>,
            options?: { id?: string }
          ) => void;
        }).setSelection([{ row: [row, row], column: [column, column] }], { id: sheetId });
      }
      workbook.setCellValue(row, column, normalized, { id: sheetId });
    }

    if (expectFormulas.some(Boolean)) {
      workbook.calculateFormula(sheetId, {
        row: [Math.min(startAddress.row, endRow), Math.max(startAddress.row, endRow)],
        column: [Math.min(startAddress.column, endColumn), Math.max(startAddress.column, endColumn)],
      });
    }

    const evaluations: Array<CellEvaluation & { success: boolean }> = [];

    for (let index = 0; index < count; index++) {
      const row = startAddress.row + delta.row * index;
      const column = startAddress.column + delta.column * index;
      const evaluation = await waitForCellEvaluation(
        workbook,
        sheetId,
        row,
        column,
        { expectFormula: expectFormulas[index] },
      );
      evaluations.push({
        ...evaluation,
        success: !evaluation.error,
      });
    }

    const errorCells = evaluations.filter((cell) => !cell.success);
    const startLabel = `${columnIndexToLetter(startAddress.column)}${startAddress.row + 1}`;
    const endLabel =
      count === 1
        ? startLabel
        : `${columnIndexToLetter(endColumn)}${endRow + 1}`;
    const rangeLabel = count === 1 ? startLabel : `${startLabel}:${endLabel}`;

    if (errorCells.length > 0) {
      const errorMessage = errorCells
        .map((cell) => `${cell.address}: ${cell.error ?? "Unknown error"}`)
        .join("; ");
      return {
        success: false,
        message: `Linear range ${rangeLabel} contains spreadsheet errors after the update.`,
        error: errorMessage,
        writeStatus: "applied_with_error",
        evaluationStatus: "error",
        resolution: FORMULA_ERROR_RESOLUTION,
        evaluations,
        errorCells: errorCells.map((cell) => ({
          address: cell.address,
          error: cell.error ?? "Unknown error",
        })),
      };
    }

    return {
      success: true,
      message: `Filled ${direction} range ${rangeLabel}.`,
      writeStatus: "applied",
      evaluationStatus: "ok",
      evaluations,
    };
  } catch (error) {
    console.error("Error in updateLinearRange:", error);
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
    const baseFunctions = category
      ? getFunctionsByCategory(category)
      : getAllFunctions();
    const functions = baseFunctions.map((fn) => ({
      name: fn.name,
      description: fn.description,
    }));
    return {
      success: true,
      functions,
      message: category
        ? `Returned ${functions.length} functions in category "${category}". This list only includes names and brief descriptions—ask which functions need details, then call getSpreadsheetFormulaHelp for each.`
        : `Returned ${functions.length} spreadsheet functions. This is a large catalog; capture the function names you care about and call getSpreadsheetFormulaHelp to retrieve detailed rules.`,
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
      function: {
        ...fn,
        rules: buildFormulaRules(fn),
      },
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
    "Update a single cell in the active sheet. Provide either A1 notation (e.g., updateSpreadsheetCell('B5', { type: 'text', text: 'Hello' })) or row/column notation (e.g., updateSpreadsheetCell(5, 'B', { type: 'number', value: 42 })). When using formulas, call listSpreadsheetFormulas to confirm the function exists and getSpreadsheetFormulaHelp to review its signature before writing the formula.",
  tool: updateCell,
  toolSchema: z
    .function()
    .args(
      z.union([z.string(), z.number()]).describe("Row index or A1 address"),
      z
        .union([
          z.string().describe("Column letter when using row/column notation"),
          cellPayloadSchema.describe("Cell payload when using A1 notation"),
        ])
        .describe("Column letter or cell payload"),
      cellPayloadSchema
        .optional()
        .describe("Cell payload when using row/column arguments"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
        writeStatus: z.string().optional(),
        evaluationStatus: z.string().optional(),
        resolution: z.string().optional(),
        evaluation: cellEvaluationSchema.optional(),
        result: singleCellUpdateResultSchema.optional(),
        errorCells: z.array(cellErrorSummarySchema).optional(),
      })
    ),
};

export const updateLinearRangeTool = {
  name: "updateSpreadsheetLinearRange",
  description:
    "Fill a straight line of cells. Provide a starting address (e.g., 'B3'), choose whether to move horizontally or vertically, specify how many cells to touch, then pass that many payloads. When writing formulas, confirm the syntax with listSpreadsheetFormulas and getSpreadsheetFormulaHelp before updating.",
  tool: updateLinearRange,
  toolSchema: z
    .function()
    .args(
      z.object({
        start: z.string().describe("Starting cell in A1 notation, e.g., 'B3'"),
        direction: z
          .enum(["horizontal", "vertical"])
          .describe("Fill direction from the starting cell"),
        count: z
          .number()
          .int()
          .positive()
          .describe("Number of cells to update"),
        values: z
          .array(cellPayloadSchema.or(z.null()))
          .describe("Exactly count entries describing each cell"),
      })
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
        writeStatus: z.string().optional(),
        evaluationStatus: z.string().optional(),
        resolution: z.string().optional(),
        evaluations: z
          .array(cellEvaluationWithStatusSchema)
          .optional()
          .describe("Per-cell results in update order"),
        errorCells: z.array(cellErrorSummarySchema).optional(),
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
    "List the supported spreadsheet functions (names with brief descriptions only). Optionally filter by category (Math, Statistical, Text, Logical, Date, Lookup, Financial, Information). Ask which functions need deeper guidance, then call getSpreadsheetFormulaHelp for those.",
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
        functions: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
            })
          )
          .optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const getFormulaHelpTool = {
  name: "getSpreadsheetFormulaHelp",
  description:
    "Fetch detailed metadata (signature, rules, examples) for a specific function previously surfaced via listSpreadsheetFormulas. Function names are case-insensitive; call repeatedly if you need multiple.",
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
            rules: z.array(z.string()),
          })
          .optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

export const spreadsheetTools = [
  updateCellTool,
  updateLinearRangeTool,
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
