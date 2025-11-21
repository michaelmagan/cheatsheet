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
  findDataExtent,
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
import {
  determineErrorType,
  getErrorSpecificResolution,
  normalizeErrorCode,
} from "@/lib/spreadsheet-error-resolver";
import type { Cell } from "@fortune-sheet/core";
import type { WorkbookInstance } from "@fortune-sheet/react";
import type {
  CellEvaluation,
  CellUpdateRequest,
  CellValueInput,
  ReturnDetailsParam,
} from "@/types/spreadsheet-types";
import { z } from "zod";

// Simplified cell value - just use JavaScript primitives
type CellValue = CellValueInput;
type WorkbookFormatAttribute = Parameters<WorkbookInstance["setCellFormatByRange"]>[0];

// FortuneSheet can return errors with or without the # prefix
// cell.v typically has "#DIV/0!" while cell.m might have "DIV/0" or "DIV/0!"
const EXCEL_ERROR_PATTERN =
  /^#?(NULL!?|DIV\/0!?|VALUE!?|REF!?|NAME\??|NUM!?|N\/A|GETTING_DATA|SPILL!?|CALC!?|FIELD!?|BLOCKED!?|UNKNOWN!?|ERROR!?)$/i;

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

const cellValueSchema = z.union([z.string(), z.number(), z.null()]);

const hexColorPattern = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const styleOptionsSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    fontFamily: z.string().min(1).max(100).optional(),
    fontSize: z.number().int().min(6).max(200).optional(),
    fontColor: z
      .string()
      .min(1)
      .regex(hexColorPattern, "Colors must be hex strings like '#FFAA00'")
      .describe("Hex color (supports #RGB or #RRGGBB)")
      .optional(),
    backgroundColor: z
      .string()
      .min(1)
      .regex(hexColorPattern, "Colors must be hex strings like '#FFAA00'")
      .describe("Hex color (supports #RGB or #RRGGBB)")
      .optional(),
    horizontalAlign: z.enum(["left", "center", "right"]).optional(),
    verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
    textWrap: z.enum(["clip", "overflow", "wrap"]).optional(),
    textRotation: z
      .enum(["none", "angleup", "angledown", "vertical", "rotation-up", "rotation-down"])
      .optional(),
  })
  .refine(
    (style) => Object.values(style).some((value) => value !== undefined),
    { message: "Provide at least one style property to update." }
  );

const styleTargetSchema = z.object({
  range: z
    .string()
    .min(1)
    .describe("A1-style range (e.g., 'B2:D5' or 'A1')"),
  style: styleOptionsSchema,
});

type StyleOptionsInput = z.infer<typeof styleOptionsSchema>;
type StyleTargetInput = z.infer<typeof styleTargetSchema>;

type StyleOperation = {
  attr: WorkbookFormatAttribute;
  value: string | number | null;
  summary: string;
};

// New optimized schemas for Phase 1
const errorDetailSchema = z.object({
  type: z.string(),
  code: z.string(),
  resolution: z.string(),
});

const WORKBOOK_READY_TIMEOUT_MS = 5000;
const WORKBOOK_READY_POLL_INTERVAL_MS = 100;

async function ensureWorkbook(): Promise<WorkbookInstance> {
  const startTime = Date.now();

  while (Date.now() - startTime < WORKBOOK_READY_TIMEOUT_MS) {
    const workbook = fortuneSheetStore.getWorkbook();
    if (workbook) {
      return workbook;
    }
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, WORKBOOK_READY_POLL_INTERVAL_MS));
  }

  throw new Error("Spreadsheet workbook is not ready after 5 seconds. Ensure the UI is mounted.");
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
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  const num = Number(trimmed);
  return !Number.isNaN(num) && Number.isFinite(num);
}

function normalizeValue(cellData: CellValue): string | number {
  // Handle empty cells
  if (cellData === null || cellData === "") {
    return "";
  }

  // Handle numbers
  if (typeof cellData === "number") {
    if (!Number.isFinite(cellData)) {
      throw new Error(`Invalid number: ${cellData}. Must be a finite number.`);
    }
    return cellData;
  }

  // Handle strings
  if (typeof cellData === "string") {
    const trimmed = cellData.trim();

    // Empty string after trim
    if (trimmed === "") {
      return "";
    }

    // Formula (starts with =)
    if (trimmed.startsWith("=")) {
      return trimmed;
    }

    // Numeric string conversion
    if (isNumericString(trimmed)) {
      return Number(trimmed);
    }

    // Regular text - escape if it looks like a formula
    const sanitized = sanitizeText(trimmed);
    if (sanitized.startsWith("=")) {
      return `'${sanitized}`;
    }
    return sanitized;
  }

  throw new Error(
    `Invalid cell value: ${JSON.stringify(cellData)}. ` +
    `Expected string, number, or null. ` +
    `Example: ["Name", 42, "=SUM(A1:A10)", null]`
  );
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
  // Check displayValue first (most reliable for computed errors)
  if (typeof displayValue === "string") {
    const trimmed = displayValue.trim();
    if (EXCEL_ERROR_PATTERN.test(trimmed)) {
      return displayValue;
    }
  }

  // Check rawValue
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (EXCEL_ERROR_PATTERN.test(trimmed)) {
      return rawValue;
    }
  }

  // Check if the cell has error type marker
  if (cell?.ct?.t === "e") {
    const display = cell.m ?? cell.v ?? rawValue;
    const displayStr = typeof display === "string" ? display : toDisplayString(display);

    // Verify it's actually an error pattern and not just a zero or other valid value
    if (displayStr && EXCEL_ERROR_PATTERN.test(displayStr.trim())) {
      return displayStr;
    }

    // If cell type is "e" but value doesn't match error pattern, it might be misclassified
    // Don't treat it as an error (handles case where zero is marked as error type)
    return null;
  }

  return null;
}

function buildCellEvaluation(
  workbook: WorkbookInstance,
  sheetId: string,
  row: number,
  column: number
): CellEvaluation {
  const label = `${columnIndexToLetter(column)}${row + 1}`;

  // Try multiple approaches to access the calculated cell data
  let cell: Cell | null = null;

  // Approach 1: Try internal context (if accessible)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (workbook as any).context;
    if (context?.luckysheetfile) {
      const sheetIndex = context.luckysheetfile.findIndex(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.id === sheetId
      );
      if (sheetIndex !== -1) {
        const internalSheet = context.luckysheetfile[sheetIndex];
        cell = internalSheet.data?.[row]?.[column] ?? null;
      }
    }
  } catch {
    // Silently fall through to next approach
  }

  // Approach 2: Try fortuneSheetStore (React store)
  if (!cell) {
    const storeSheet = fortuneSheetStore.getSheetById(sheetId);
    if (storeSheet) {
      cell = storeSheet.data?.[row]?.[column] ?? null;
    }
  }

  // Approach 3: Try workbook.getSheet() (may be stale)
  if (!cell) {
    const sheet = workbook.getSheet({ id: sheetId });
    if (sheet) {
      cell = sheet.data?.[row]?.[column] ?? null;
    }
  }

  // Extract values from cell object
  const rawValue = cell?.v ?? null;
  const displayValue = toDisplayString(cell?.m ?? cell?.v ?? null);

  // Get formula
  let formula: string | null = null;
  if (typeof cell?.f === "string" && cell.f.trim().length > 0) {
    // Strip HTML tags that FortuneSheet sometimes includes in formula strings
    formula = cell.f.replace(/<[^>]*>/g, "").trim();
  }

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

/**
 * Triggers formula calculation for the given range.
 * Waits for React microtasks to flush so changes propagate to accessible data structures.
 */
async function calculateFormulaAndWait(
  workbook: WorkbookInstance,
  sheetId: string,
  range: { row: [number, number]; column: [number, number] }
): Promise<void> {
  // Trigger calculation - this updates internal Context synchronously
  workbook.calculateFormula(sheetId, range);

  // Wait for React's microtask queue to flush so changes propagate
  // FortuneSheet React wrapper may batch updates in microtasks
  await Promise.resolve(); // Flush current microtask
  await Promise.resolve(); // Flush any chained microtasks
  await new Promise(resolve => setTimeout(resolve, 0)); // Flush macrotask queue
}

function waitForCellEvaluation(
  workbook: WorkbookInstance,
  sheetId: string,
  row: number,
  column: number
): CellEvaluation {
  // Build evaluation by reading directly from sheet.data (already updated synchronously)
  return buildCellEvaluation(workbook, sheetId, row, column);
}

function resolveRange(range: string) {
  return parseRangeReference(range);
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

function formatRangeLabel(range: { start: { row: number; col: number }; end: { row: number; col: number } }) {
  const startLabel = `${columnIndexToLetter(range.start.col)}${range.start.row + 1}`;
  const endLabel = `${columnIndexToLetter(range.end.col)}${range.end.row + 1}`;
  return startLabel === endLabel ? startLabel : `${startLabel}:${endLabel}`;
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Color strings cannot be empty.");
  }
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!(hex.length === 3 || hex.length === 6) || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid color value "${value}". Use hex like '#FFAA00'.`);
  }
  const expanded = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  return `#${expanded.toUpperCase()}`;
}

const horizontalAlignValueMap = {
  left: "1",
  center: "0",
  right: "2",
} as const;

const verticalAlignValueMap = {
  top: "1",
  middle: "0",
  bottom: "2",
} as const;

const textWrapValueMap = {
  clip: "0",
  overflow: "1",
  wrap: "2",
} as const;

const textRotationValueMap = {
  none: "0",
  angleup: "1",
  angledown: "2",
  vertical: "3",
  "rotation-up": "4",
  "rotation-down": "5",
} as const;

function filterNullFields(obj: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

function buildStyleOperations(style: StyleOptionsInput): StyleOperation[] {
  const operations: StyleOperation[] = [];

  if (style.bold !== undefined) {
    operations.push({
      attr: "bl",
      value: style.bold ? 1 : 0,
      summary: `bold:${style.bold ? "on" : "off"}`,
    });
  }
  if (style.italic !== undefined) {
    operations.push({
      attr: "it",
      value: style.italic ? 1 : 0,
      summary: `italic:${style.italic ? "on" : "off"}`,
    });
  }
  if (style.underline !== undefined) {
    operations.push({
      attr: "un",
      value: style.underline ? 1 : 0,
      summary: `underline:${style.underline ? "on" : "off"}`,
    });
  }
  if (style.strikethrough !== undefined) {
    operations.push({
      attr: "cl",
      value: style.strikethrough ? 1 : 0,
      summary: `strikethrough:${style.strikethrough ? "on" : "off"}`,
    });
  }
  if (style.fontFamily !== undefined) {
    const normalizedFamily = style.fontFamily.trim();
    if (!normalizedFamily) {
      throw new Error("Font family cannot be empty.");
    }
    operations.push({
      attr: "ff",
      value: normalizedFamily,
      summary: `fontFamily:${normalizedFamily}`,
    });
  }
  if (style.fontSize !== undefined) {
    const rounded = Math.round(style.fontSize);
    const normalizedSize = Math.min(200, Math.max(6, rounded));
    operations.push({
      attr: "fs",
      value: normalizedSize,
      summary: `fontSize:${normalizedSize}`,
    });
  }
  if (style.fontColor !== undefined) {
    const normalized = normalizeHexColor(style.fontColor);
    operations.push({
      attr: "fc",
      value: normalized,
      summary: `fontColor:${normalized}`,
    });
  }
  if (style.backgroundColor !== undefined) {
    const normalized = normalizeHexColor(style.backgroundColor);
    operations.push({
      attr: "bg",
      value: normalized,
      summary: `backgroundColor:${normalized}`,
    });
  }
  if (style.horizontalAlign !== undefined) {
    operations.push({
      attr: "ht",
      value: horizontalAlignValueMap[style.horizontalAlign],
      summary: `horizontalAlign:${style.horizontalAlign}`,
    });
  }
  if (style.verticalAlign !== undefined) {
    operations.push({
      attr: "vt",
      value: verticalAlignValueMap[style.verticalAlign],
      summary: `verticalAlign:${style.verticalAlign}`,
    });
  }
  if (style.textWrap !== undefined) {
    operations.push({
      attr: "tb",
      value: textWrapValueMap[style.textWrap],
      summary: `textWrap:${style.textWrap}`,
    });
  }
  if (style.textRotation !== undefined) {
    operations.push({
      attr: "tr",
      value: textRotationValueMap[style.textRotation],
      summary: `textRotation:${style.textRotation}`,
    });
  }

  return operations;
}


async function updateCells(args: {
  cells: CellUpdateRequest[];
  returnDetails?: ReturnDetailsParam;
}) {
  try {
    const { cells, returnDetails } = args;
    const workbook = await ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();

    if (cells.length === 0) {
      throw new Error("Cells array must contain at least one cell.");
    }

    const resolvedCells = cells.map((cell, index) => {
      try {
        const parsed = parseCellReference(cell.address);

        if (parsed.row >= MAX_SPREADSHEET_ROWS) {
          throw new Error(
            `Cell ${cell.address} row ${parsed.row + 1} exceeds max ${MAX_SPREADSHEET_ROWS}`
          );
        }
        if (parsed.col >= MAX_SPREADSHEET_COLUMNS) {
          throw new Error(
            `Cell ${cell.address} column exceeds max ${MAX_SPREADSHEET_COLUMNS}`
          );
        }

        return { address: cell.address, row: parsed.row, column: parsed.col, value: cell.value };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(
          `Invalid address at cells[${index}]: ${cell.address}. ${message}`
        );
      }
    });

    const maxRow = Math.max(...resolvedCells.map((c) => c.row));
    const maxColumn = Math.max(...resolvedCells.map((c) => c.column));
    const rowCount = getSheetRowCount(sheet);
    const columnCount = getSheetColumnCount(sheet);

    if (maxRow >= rowCount) {
      const rowsNeeded = maxRow - rowCount + 1;
      throw new Error(
        `Some cells are beyond the sheet's ${rowCount} rows. ` +
          `Call addSpreadsheetRow(${rowsNeeded}) to add ${rowsNeeded} more row(s).`
      );
    }
    if (maxColumn >= columnCount) {
      const columnsNeeded = maxColumn - columnCount + 1;
      throw new Error(
        `Some cells are beyond the sheet's ${columnCount} columns. ` +
          `Call addSpreadsheetColumn(${columnsNeeded}) to add ${columnsNeeded} more column(s).`
      );
    }

    const expectFormulas = resolvedCells.map(
      (cell) =>
        typeof cell.value === "string" && cell.value.trim().startsWith("=")
    );

    for (let i = 0; i < resolvedCells.length; i++) {
      const { row, column, value } = resolvedCells[i];
      const normalized = normalizeValue(value);
      workbook.setCellValue(row, column, normalized, { id: sheetId });
    }

    if (expectFormulas.some(Boolean)) {
      const minRow = Math.min(...resolvedCells.map((c) => c.row));
      const minColumn = Math.min(...resolvedCells.map((c) => c.column));

      // Calculate formulas and wait for React to flush changes
      await calculateFormulaAndWait(workbook, sheetId, {
        row: [minRow, maxRow],
        column: [minColumn, maxColumn],
      });
    }

    const evaluations: Array<CellEvaluation & { success: boolean }> = [];
    for (let i = 0; i < resolvedCells.length; i++) {
      const { row, column } = resolvedCells[i];
      const evaluation = waitForCellEvaluation(
        workbook,
        sheetId,
        row,
        column
      );

      // Normalize error code if present
      const normalizedEvaluation = evaluation.error
        ? { ...evaluation, error: normalizeErrorCode(evaluation.error) }
        : evaluation;

      evaluations.push({
        ...normalizedEvaluation,
        success: !evaluation.error,
      });
    }

    const summary = {
      total: cells.length,
      withoutErrors: evaluations.filter((e) => !e.error).length,
      withErrors: evaluations.filter((e) => e.error).length,
    };

    const addressList = resolvedCells.map((c) => c.address).join(", ");

    if (summary.withErrors === 0) {
      return {
        success: true,
        message: `Successfully updated ${summary.total} cell(s): ${addressList}`,
        summary,
        ...(returnDetails && {
          evaluations: evaluations.map(e => filterNullFields(e as unknown as Record<string, unknown>))
        }),
      };
    }

    const errorCells = evaluations.filter((cell) => cell.error);
    const firstError = errorCells[0]!;
    const normalizedErrorCode = normalizeErrorCode(firstError.error!);

    return {
      success: true,
      message: `Successfully wrote ${summary.total} cell(s), but ${summary.withErrors} formula(s) contain errors and need to be fixed: ${errorCells.map(e => e.address).join(", ")}`,
      summary,
      formulaErrors: {
        count: summary.withErrors,
        note: "The cells were successfully updated, but the formulas contain errors. Fix the formulas by calling updateSpreadsheetCells again with corrected formulas.",
      },
      firstError: {
        address: firstError.address,
        formula: firstError.formula,
        value: firstError.displayValue,
        error: {
          type: determineErrorType(firstError.error!),
          code: normalizedErrorCode,
          resolution: getErrorSpecificResolution(firstError.error!),
        },
      },
      ...(summary.withErrors > 1 && {
        moreErrors: {
          count: summary.withErrors - 1,
          addresses: errorCells.slice(1).map((e) => e.address),
        },
      }),
      ...(returnDetails && {
        evaluations: evaluations.map(e => filterNullFields(e as unknown as Record<string, unknown>))
      }),
    };
  } catch (error) {
    console.error("Error in updateCells:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function updateCellStyles(args: { targets: StyleTargetInput[] }) {
  try {
    const { targets } = args;
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new Error("Provide at least one target range to style.");
    }

    const workbook = await ensureWorkbook();
    const { sheetId, sheet } = getActiveSheetSnapshot();
    const rowCount = getSheetRowCount(sheet);
    const columnCount = getSheetColumnCount(sheet);

    const applied: Array<{ range: string; styles: string[] }> = [];

    targets.forEach((target, index) => {
      const resolvedRange = resolveRange(target.range);
      const rangeLabel = formatRangeLabel(resolvedRange);
      if (resolvedRange.end.row >= rowCount) {
        const rowsNeeded = resolvedRange.end.row - rowCount + 1;
        throw new Error(
          `Range ${rangeLabel} exceeds the sheet's ${rowCount} rows. Add at least ${rowsNeeded} more row(s) first.`
        );
      }
      if (resolvedRange.end.col >= columnCount) {
        const columnsNeeded = resolvedRange.end.col - columnCount + 1;
        throw new Error(
          `Range ${rangeLabel} exceeds the sheet's ${columnCount} columns. Add at least ${columnsNeeded} more column(s) first.`
        );
      }

      if (resolvedRange.end.row >= MAX_SPREADSHEET_ROWS) {
        throw new Error(
          `Range ${rangeLabel} exceeds the maximum supported rows (${MAX_SPREADSHEET_ROWS}).`
        );
      }
      if (resolvedRange.end.col >= MAX_SPREADSHEET_COLUMNS) {
        throw new Error(
          `Range ${rangeLabel} exceeds the maximum supported columns (${MAX_SPREADSHEET_COLUMNS}).`
        );
      }

      const operations = buildStyleOperations(target.style);
      if (operations.length === 0) {
        throw new Error(`Target at index ${index} does not include any style changes.`);
      }

      const workbookRange = {
        row: [resolvedRange.start.row, resolvedRange.end.row] as [number, number],
        column: [resolvedRange.start.col, resolvedRange.end.col] as [number, number],
      };

      operations.forEach((operation) => {
        workbook.setCellFormatByRange(operation.attr, operation.value, workbookRange, {
          id: sheetId,
        });
      });

      applied.push({
        range: rangeLabel,
        styles: operations.map((operation) => operation.summary),
      });
    });

    const summaryRanges = applied.map((entry) => entry.range).join(", ");

    return {
      success: true,
      message:
        applied.length === 1
          ? `Updated styles for ${summaryRanges}.`
          : `Updated styles for ${applied.length} ranges: ${summaryRanges}.`,
      applied,
    };
  } catch (error) {
    console.error("Error in updateCellStyles:", error);
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
    const workbook = await ensureWorkbook();
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
    const workbook = await ensureWorkbook();
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
    const workbook = await ensureWorkbook();
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
    const workbook = await ensureWorkbook();
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

async function readCell(address: string) {
  try {
    const { sheet } = getActiveSheetSnapshot();
    const cellAddress = parseCellReference(address);
    const lookup = buildCelldataLookup(sheet);
    const cellObj = getCellFromLookup(lookup, cellAddress.row, cellAddress.col);

    if (!cellObj) {
      return {
        success: true,
        cell: null,
        message: "Cell is empty.",
      };
    }

    // Build simplified cell data with only non-null fields
    const cellData: {
      value: unknown;
      displayValue: string | null;
      formula?: string;
    } = {
      value: cellObj.v,
      displayValue: resolveCellDisplay(cellObj),
    };

    // Only include formula if it exists
    if (typeof cellObj.f === "string" && cellObj.f.trim().length > 0) {
      cellData.formula = cellObj.f;
    }

    return {
      success: true,
      cell: cellData,
      message: `Read cell ${address}.`,
    };
  } catch (error) {
    console.error("Error in readCell:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function resolveCellDisplay(cell: Cell | null): string | null {
  if (!cell) {
    return null;
  }
  // Return display value (m) if available, otherwise raw value (v)
  if (cell.m !== undefined && cell.m !== null) {
    return typeof cell.m === "string" ? cell.m : String(cell.m);
  }
  if (cell.v !== undefined && cell.v !== null) {
    return typeof cell.v === "string" ? cell.v : String(cell.v);
  }
  return null;
}

async function readRange(
  range: string,
  mode?: "summary" | "values" | "full"
) {
  try {
    const resolvedRange = resolveRange(range);
    const { sheet } = getActiveSheetSnapshot();
    const lookup = buildCelldataLookup(sheet);

    const startLabel = `${columnIndexToLetter(resolvedRange.start.col)}${resolvedRange.start.row + 1}`;
    const endLabel = `${columnIndexToLetter(resolvedRange.end.col)}${resolvedRange.end.row + 1}`;

    const rowCount = resolvedRange.end.row - resolvedRange.start.row + 1;
    const columnCount = resolvedRange.end.col - resolvedRange.start.col + 1;
    const cellCount = rowCount * columnCount;

    // Auto-select mode based on size if not specified
    let selectedMode = mode;
    if (selectedMode === undefined) {
      selectedMode = cellCount > 100 ? "summary" : "values";
    }

    // Summary mode: return dimensions + first 3 rows as preview
    if (selectedMode === "summary") {
      const preview: Array<Array<string | null>> = [];
      const previewRows = Math.min(3, rowCount);

      for (let i = 0; i < previewRows; i++) {
        const row = resolvedRange.start.row + i;
        const rowData: Array<string | null> = [];
        for (let col = resolvedRange.start.col; col <= resolvedRange.end.col; col++) {
          const cell = getCellFromLookup(lookup, row, col);
          rowData.push(resolveCellDisplay(cell));
        }
        preview.push(rowData);
      }

      return {
        success: true,
        mode: "summary" as const,
        summary: {
          range: `${startLabel}:${endLabel}`,
          rowCount,
          columnCount,
          totalCells: cellCount,
        },
        preview,
        message: `Showing ${previewRows}-row preview of ${cellCount} cells from ${startLabel}:${endLabel}. Use mode='values' or 'full' for complete data.`,
        hasMore: rowCount > 3,
      };
    }

    // Values mode: return simple 2D array of display values
    if (selectedMode === "values") {
      const data: Array<Array<string | null>> = [];

      for (let row = resolvedRange.start.row; row <= resolvedRange.end.row; row++) {
        const rowData: Array<string | null> = [];
        for (let col = resolvedRange.start.col; col <= resolvedRange.end.col; col++) {
          const cell = getCellFromLookup(lookup, row, col);
          rowData.push(resolveCellDisplay(cell));
        }
        data.push(rowData);
      }

      return {
        success: true,
        mode: "values" as const,
        data,
        message: `Read ${cellCount} cells from ${startLabel}:${endLabel} (values only)`,
      };
    }

    // Full mode: sparse A1 notation format with non-null cells only
    const data: Array<{
      cell: string;
      value: unknown;
      displayValue: string;
      formula?: string;
    }> = [];

    for (let row = resolvedRange.start.row; row <= resolvedRange.end.row; row++) {
      for (let col = resolvedRange.start.col; col <= resolvedRange.end.col; col++) {
        const cellObj = getCellFromLookup(lookup, row, col);

        // Skip null/empty cells
        if (!cellObj) continue;

        const cellAddress = `${columnIndexToLetter(col)}${row + 1}`;
        const value = cellObj.v;
        const displayValue = resolveCellDisplay(cellObj) ?? "";
        const formula = typeof cellObj.f === "string" && cellObj.f.trim().length > 0
          ? cellObj.f
          : undefined;

        const cellData: {
          cell: string;
          value: unknown;
          displayValue: string;
          formula?: string;
        } = {
          cell: cellAddress,
          value,
          displayValue,
        };

        // Only include formula if it exists
        if (formula) {
          cellData.formula = formula;
        }

        data.push(cellData);
      }
    }

    return {
      success: true,
      mode: "full" as const,
      data,
      message: `Read ${data.length} non-empty cells from ${startLabel}:${endLabel}. Cells not listed are null/empty.`,
    };
  } catch (error) {
    console.error("Error in readRange:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function clearRange(range: string) {
  try {
    const workbook = await ensureWorkbook();
    const { sheetId } = getActiveSheetSnapshot();
    const resolvedRange = resolveRange(range);

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

async function listFormulas(options?: { category?: string; page?: number; pageSize?: number }) {
  try {
    const category = options?.category;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error("Page must be 1 or greater");
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new Error("Page size must be between 1 and 100");
    }

    // Get all functions (filtered by category if provided)
    const baseFunctions = category
      ? getFunctionsByCategory(category)
      : getAllFunctions();

    // Calculate pagination
    const totalItems = baseFunctions.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    // Get paginated slice
    const paginatedFunctions = baseFunctions
      .slice(startIndex, endIndex)
      .map((fn) => ({
        name: fn.name,
        description: fn.description,
      }));

    // Build message
    const categoryMessage = category ? ` in category "${category}"` : "";
    const paginationMessage = totalPages > 1
      ? ` (page ${page} of ${totalPages})`
      : "";
    const message = category
      ? `Returned ${paginatedFunctions.length} of ${totalItems} functions${categoryMessage}${paginationMessage}. This list only includes names and brief descriptions—ask which functions need details, then call getSpreadsheetFormulaHelp for each.`
      : `Returned ${paginatedFunctions.length} of ${totalItems} spreadsheet functions${paginationMessage}. This is a large catalog; capture the function names you care about and call getSpreadsheetFormulaHelp to retrieve detailed rules.`;

    return {
      success: true,
      functions: paginatedFunctions,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      message,
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

async function getSpreadsheetInfo() {
  try {
    const { sheet } = getActiveSheetSnapshot();

    // Get active sheet dimensions
    const activeRows = getSheetRowCount(sheet);
    const activeColumns = getSheetColumnCount(sheet);

    // Calculate data extent (non-empty cells)
    const lookup = buildCelldataLookup(sheet);
    const dataExtent = findDataExtent(lookup);

    // Calculate available capacity
    const availableRows = MAX_SPREADSHEET_ROWS - activeRows;
    const availableColumns = MAX_SPREADSHEET_COLUMNS - activeColumns;

    return {
      success: true,
      activeSheet: {
        rows: activeRows,
        columns: activeColumns,
      },
      dataExtent: dataExtent
        ? {
            range: `${dataExtent.start}:${dataExtent.end}`,
            start: dataExtent.start,
            end: dataExtent.end,
          }
        : null,
      capacity: {
        availableRows,
        availableColumns,
        canAddRows: availableRows > 0,
        canAddColumns: availableColumns > 0,
      },
      limits: {
        maxRows: MAX_SPREADSHEET_ROWS,
        maxColumns: MAX_SPREADSHEET_COLUMNS,
      },
    };
  } catch (error) {
    console.error("Error in getSpreadsheetInfo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export const updateCellsTool = {
  name: "updateSpreadsheetCells",
  description:
    "Update one or more cells by specifying exact addresses. Works for single cells or batch updates. IMPORTANT: success=true means cells were written successfully. If formulas contain errors (like #DIV/0!, #NAME?), they are still written to cells but will be flagged in firstError/formulaErrors. You should then fix the formula by calling this tool again with a corrected formula.",
  tool: updateCells,
  toolSchema: z
    .function()
    .args(
      z.object({
        cells: z
          .array(
            z.object({
              address: z.string().describe(
                "Cell address in A1 notation (e.g., 'B5', 'AA12')"
              ),
              value: cellValueSchema.describe(
                "Cell value. Types: (1) Formula - string starting with '=' like '=SUM(A1:A10)'. (2) Number - number type OR numeric string like 42, '42', -15.5, '-15.5', '1e10'. Numeric strings are auto-converted to numbers. (3) Text - non-numeric string like 'Hello', 'Item 123'. (4) Empty - null or ''."
              ),
            })
          )
          .describe(
            "Array of cells to update. Recommended: ~20 cells per call for manageability, but you can include more if needed."
          ),
        returnDetails: z
          .boolean()
          .optional()
          .describe("Set to true for detailed per-cell results (uses more tokens)"),
      })
    )
    .returns(
      z.object({
        success: z.boolean().describe("True if cells were successfully written. Note: formulas with errors are still written successfully, but flagged in formulaErrors."),
        message: z.string().optional(),
        error: z.string().optional(),
        summary: z
          .object({
            total: z.number(),
            withoutErrors: z.number(),
            withErrors: z.number(),
          })
          .optional(),
        formulaErrors: z
          .object({
            count: z.number(),
            note: z.string(),
          })
          .optional()
          .describe("Present when formulas contain errors. The cells were written, but formulas need fixing."),
        firstError: z
          .object({
            address: z.string(),
            formula: z.string().nullable(),
            value: z.string().nullable(),
            error: errorDetailSchema,
          })
          .optional()
          .describe("Details about the first formula error encountered. Use this to fix the formula."),
        moreErrors: z
          .object({
            count: z.number(),
            addresses: z.array(z.string()),
          })
          .optional(),
        evaluations: z.array(cellEvaluationWithStatusSchema).optional(),
      })
    ),
};

export const updateCellStylesTool = {
  name: "updateSpreadsheetCellStyles",
  description:
    "Apply formatting such as bold text, font colors, fills, alignment, wrapping, or rotation to one or more ranges.",
  tool: updateCellStyles,
  toolSchema: z
    .function()
    .args(
      z.object({
        targets: z
          .array(styleTargetSchema)
          .min(1, "Provide at least one range to style.")
          .describe(
            "Ranges to style. Each range can be specified via A1 notation or explicit start/end coordinates along with the style properties to apply."
          ),
      })
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
        applied: z
          .array(
            z.object({
              range: z.string(),
              styles: z.array(z.string()),
            })
          )
          .optional(),
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
    "Read a single cell from the active sheet using A1 notation (e.g., 'B5').",
  tool: readCell,
  toolSchema: z
    .function()
    .args(
      z.string().describe("Cell address in A1 notation (e.g., 'B5')")
    )
    .returns(
      z.union([
        z.object({
          success: z.literal(true),
          cell: z.object({
            value: z.any().describe("Raw cell value"),
            displayValue: z.string().nullable().describe("Formatted display value"),
            formula: z.string().optional().describe("Formula if present"),
          }).nullable(),
          message: z.string(),
        }),
        z.object({
          success: z.literal(false),
          error: z.string(),
        }),
      ])
    ),
};

export const readRangeTool = {
  name: "readSpreadsheetRange",
  description:
    "Read a rectangular range of cells with flexible output modes using A1 notation (e.g., 'A1:C5').",
  tool: readRange,
  toolSchema: z
    .function()
    .args(
      z.string().describe("Range in A1 notation (e.g., 'A1:C5')"),
      z.enum(["summary", "values", "full"]).optional().describe("Output mode (auto-selected if not specified)")
    )
    .returns(
      z.union([
        z.object({
          success: z.literal(true),
          mode: z.literal("summary"),
          summary: z.object({
            range: z.string().describe("Full range in A1 notation"),
            rowCount: z.number().describe("Total number of rows in range"),
            columnCount: z.number().describe("Total number of columns in range"),
            totalCells: z.number().describe("Total number of cells in range"),
          }),
          preview: z.array(z.array(z.string().nullable())).describe("First 3 rows of data as display values"),
          message: z.string(),
          hasMore: z.boolean().describe("True if there are more rows beyond the preview"),
        }),
        z.object({
          success: z.literal(true),
          mode: z.literal("values"),
          data: z.array(z.array(z.string().nullable())).describe("2D array of display values"),
          message: z.string(),
        }),
        z.object({
          success: z.literal(true),
          mode: z.literal("full"),
          data: z.array(z.object({
            cell: z.string().describe("Cell address in A1 notation"),
            value: z.any().describe("Raw cell value"),
            displayValue: z.string().describe("Formatted display value"),
            formula: z.string().optional().describe("Formula if present"),
          })).describe("Array of non-empty cells with A1 addresses"),
          message: z.string(),
        }),
        z.object({
          success: z.literal(false),
          error: z.string(),
        }),
      ])
    ),
};

export const clearRangeTool = {
  name: "clearSpreadsheetRange",
  description:
    "Clear a range of cells by removing their values using A1 notation (e.g., 'A1:C5').",
  tool: clearRange,
  toolSchema: z
    .function()
    .args(
      z.string().describe("Range in A1 notation (e.g., 'A1:C5')")
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
          category: z.string().optional().describe("Optional category filter (Math, Statistical, Text, Logical, Date, Lookup, Financial, Information)"),
          page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
          pageSize: z.number().int().min(1).max(100).optional().describe("Functions per page (default: 20, max: 100)"),
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
        pagination: z
          .object({
            page: z.number().describe("Current page number"),
            pageSize: z.number().describe("Number of items per page"),
            totalItems: z.number().describe("Total number of functions available"),
            totalPages: z.number().describe("Total number of pages"),
            hasNextPage: z.boolean().describe("Whether there is a next page"),
            hasPreviousPage: z.boolean().describe("Whether there is a previous page"),
          })
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

export const getSpreadsheetInfoTool = {
  name: "getSpreadsheetInfo",
  description:
    "Get comprehensive information about the active spreadsheet, including dimensions, data extent, and capacity for expansion.",
  tool: getSpreadsheetInfo,
  toolSchema: z
    .function()
    .args()
    .returns(
      z.union([
        z.object({
          success: z.literal(true),
          activeSheet: z.object({
            rows: z.number().describe("Current number of rows in the active sheet"),
            columns: z.number().describe("Current number of columns in the active sheet"),
          }),
          dataExtent: z
            .object({
              range: z.string().describe("Full range of non-empty cells (e.g., 'A1:C10')"),
              start: z.string().describe("Top-left cell of data range (e.g., 'A1')"),
              end: z.string().describe("Bottom-right cell of data range (e.g., 'C10')"),
            })
            .nullable()
            .describe("Extent of non-empty cells, or null if sheet is empty"),
          capacity: z.object({
            availableRows: z.number().describe("Number of additional rows that can be added"),
            availableColumns: z.number().describe("Number of additional columns that can be added"),
            canAddRows: z.boolean().describe("Whether more rows can be added"),
            canAddColumns: z.boolean().describe("Whether more columns can be added"),
          }),
          limits: z.object({
            maxRows: z.number().describe("Maximum rows allowed in the spreadsheet"),
            maxColumns: z.number().describe("Maximum columns allowed in the spreadsheet"),
          }),
        }),
        z.object({
          success: z.literal(false),
          error: z.string(),
        }),
      ])
    ),
};

export const spreadsheetTools = [
  updateCellsTool,
  updateCellStylesTool,
  addColumnTool,
  removeColumnTool,
  addRowTool,
  removeRowTool,
  readCellTool,
  readRangeTool,
  clearRangeTool,
  listFormulasTool,
  getFormulaHelpTool,
  getSpreadsheetInfoTool,
];
