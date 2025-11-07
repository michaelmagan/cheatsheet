"use client";

/**
 * @file spreadsheet-validation-tools.ts
 * @description Tools for validating spreadsheet formulas before execution
 */

import {
  extractFunctions,
  checkSyntax,
  columnIndexToLetter,
  parseRangeReference,
  getSheetRowCount,
  getSheetColumnCount,
} from "@/lib/fortune-sheet-utils";
import { getFunction, getAllFunctions } from "@/lib/formula-functions";
import { fortuneSheetStore } from "@/lib/fortune-sheet-store";
import type { WorkbookInstance } from "@fortune-sheet/react";
import { z } from "zod";

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
  throw new Error("No active sheet found.");
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
  cell: unknown,
  rawValue: unknown,
  displayValue: string | null
): string | null {
  // Check if cell has error type marker
  if (cell && typeof cell === "object" && "ct" in cell) {
    const cellObj = cell as { ct?: { t?: string }; m?: unknown; v?: unknown };
    if (cellObj.ct?.t === "e") {
      const display = cellObj.m ?? cellObj.v ?? rawValue;
      const displayStr = typeof display === "string" ? display : toDisplayString(display);

      // Verify it's actually an error pattern and not just a zero or other valid value
      if (displayStr && EXCEL_ERROR_PREFIX.test(displayStr.trim())) {
        return displayStr;
      }

      // If cell type is "e" but value doesn't match error pattern, it might be misclassified
      // Don't treat it as an error (handles case where zero is marked as error type)
      return null;
    }
  }

  // Check rawValue for error pattern
  if (typeof rawValue === "string" && EXCEL_ERROR_PREFIX.test(rawValue.trim())) {
    return rawValue;
  }

  // Check displayValue for error pattern
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
  column: number
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

  const sheet = fortuneSheetStore.getSheetById(sheetId) ?? workbook.getSheet({ id: sheetId });

  // Get cell object for error detection
  let cell: unknown = null;
  if (sheet && Array.isArray(sheet.celldata)) {
    const match = sheet.celldata.find(
      (entry: { r: number; c: number; v?: unknown }) => entry.r === row && entry.c === column
    );
    if (match) {
      cell = match.v ?? null;
    }
  }

  let formula =
    typeof formulaValueRaw === "string" && formulaValueRaw.trim().length > 0
      ? formulaValueRaw
      : null;
  if (!formula && cell && typeof cell === "object" && "f" in cell && typeof cell.f === "string") {
    formula = cell.f;
  }
  if (!formula && typeof rawValue === "string" && rawValue.trim().startsWith("=")) {
    formula = rawValue.trim();
  }

  const displayValue =
    displayValueRaw !== undefined && displayValueRaw !== null
      ? toDisplayString(displayValueRaw)
      : cell && typeof cell === "object" && "m" in cell && cell.m !== undefined && cell.m !== null
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

/**
 * Calculate Levenshtein distance between two strings for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar function names using Levenshtein distance
 * @param functionName - The function name to find matches for
 * @param maxDistance - Maximum edit distance to consider (default: 2)
 * @param maxSuggestions - Maximum number of suggestions to return (default: 3)
 * @returns Array of similar function names sorted by distance
 */
function findSimilarFunctions(
  functionName: string,
  maxDistance: number = 2,
  maxSuggestions: number = 3
): string[] {
  const allFunctions = getAllFunctions();
  const upperName = functionName.toUpperCase();

  // Calculate distance for each function
  const distances = allFunctions.map(fn => ({
    name: fn.name,
    distance: levenshteinDistance(upperName, fn.name)
  }));

  // Filter by max distance, sort by distance, and return top suggestions
  return distances
    .filter(item => item.distance > 0 && item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(item => item.name);
}

/**
 * Validation issue types
 */
type ValidationIssueType =
  | "unknown_function"
  | "syntax_error"
  | "invalid_reference";

interface ValidationIssue {
  type: ValidationIssueType;
  message: string;
  details?: string;
  suggestions?: string[];
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  functionsFound: string[];
  functionsValidated: string[];
}

/**
 * Validate a spreadsheet formula before execution
 *
 * This tool performs comprehensive validation on a formula string:
 * 1. Extracts all function names from the formula
 * 2. Checks each function against the formula-functions.ts catalog
 * 3. Detects basic syntax issues (unmatched parentheses, invalid references)
 * 4. Provides suggestions for typos using fuzzy matching
 *
 * @param args - Object containing the formula to validate
 * @returns Validation result with issues and suggestions
 */
async function validateSpreadsheetFormula(args: { formula: string }): Promise<ValidationResult> {
  try {
    const { formula } = args;
    const issues: ValidationIssue[] = [];
    const functionsFound: string[] = [];
    const functionsValidated: string[] = [];

    // Step 1: Check basic syntax
    const syntaxErrors = checkSyntax(formula);
    for (const error of syntaxErrors) {
      issues.push({
        type: "syntax_error",
        message: error,
      });
    }

    // Step 2: Extract function names
    const extractedFunctions = extractFunctions(formula);
    functionsFound.push(...extractedFunctions);

    // Step 3: Validate each function against catalog
    for (const functionName of extractedFunctions) {
      const functionInfo = getFunction(functionName);

      if (!functionInfo) {
        // Function not found - try to suggest similar functions
        const suggestions = findSimilarFunctions(functionName);

        issues.push({
          type: "unknown_function",
          message: `Function "${functionName}" is not recognized`,
          details: suggestions.length > 0
            ? "This function is not in the supported formula catalog. Did you mean one of these?"
            : "This function is not in the supported formula catalog.",
          suggestions,
        });
      } else {
        functionsValidated.push(functionName);
      }
    }

    // Determine if formula is valid
    const isValid = issues.length === 0;

    return {
      isValid,
      issues,
      functionsFound,
      functionsValidated,
    };
  } catch (error) {
    console.error("Error in validateSpreadsheetFormula:", error);

    return {
      isValid: false,
      issues: [
        {
          type: "syntax_error",
          message: error instanceof Error ? error.message : "Unknown validation error",
        },
      ],
      functionsFound: [],
      functionsValidated: [],
    };
  }
}

/**
 * Scan the active sheet for cells containing formula errors
 *
 * This tool scans a range (or entire sheet) for cells with error values like:
 * #DIV/0!, #VALUE!, #REF!, #NAME?, #NUM!, #N/A, etc.
 *
 * Returns up to 50 errors to avoid overwhelming the response. Each error includes:
 * - Cell address (e.g., "B5")
 * - Error code (e.g., "#DIV/0!")
 * - Formula that caused the error (if present)
 *
 * @param range - Optional range in A1 notation (e.g., "B2:E10"). If omitted, scans entire sheet.
 * @returns Object with error count, error list, and summary message
 */
async function getSpreadsheetErrors(range?: string) {
  try {
    const { sheet } = getActiveSheetSnapshot();
    const workbook = ensureWorkbook();
    const sheetId = ensureActiveSheetId();

    // Determine scan range
    const scanRange = range
      ? parseRangeReference(range)
      : {
          start: { row: 0, col: 0 },
          end: {
            row: getSheetRowCount(sheet) - 1,
            col: getSheetColumnCount(sheet) - 1,
          },
        };

    // Scan for errors
    const errors: Array<{ address: string; error: string; formula: string | null }> = [];
    let truncated = false;

    outerLoop: for (let row = scanRange.start.row; row <= scanRange.end.row; row++) {
      for (let col = scanRange.start.col; col <= scanRange.end.col; col++) {
        const evaluation = buildCellEvaluation(workbook, sheetId, row, col);
        if (evaluation.error) {
          errors.push({
            address: evaluation.address,
            error: evaluation.error,
            formula: evaluation.formula,
          });
        }

        if (errors.length >= 50) {
          truncated = true;
          break outerLoop;
        }
      }
    }

    const rangeLabel = range || "entire sheet";

    return {
      success: true,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      range: rangeLabel,
      truncated,
      message:
        errors.length === 0
          ? `No errors found in ${rangeLabel}`
          : `Found ${errors.length} error${errors.length > 1 ? "s" : ""} in ${rangeLabel}${truncated ? " (limited to first 50)" : ""}`,
    };
  } catch (error) {
    console.error("Error in getSpreadsheetErrors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Zod schemas for validation
const validationIssueSchema = z.object({
  type: z.enum(["unknown_function", "syntax_error", "invalid_reference"]),
  message: z.string(),
  details: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

const validationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(validationIssueSchema),
  functionsFound: z.array(z.string()),
  functionsValidated: z.array(z.string()),
});

/**
 * Tool definition for Tambo
 */
export const validateSpreadsheetFormulaTool = {
  name: "validateSpreadsheetFormula",
  description: "Validate a spreadsheet formula before execution by checking function recognition, syntax, and reference format, with suggestions for typos.",
  tool: validateSpreadsheetFormula,
  toolSchema: z
    .function()
    .args(
      z.object({
        formula: z.string().describe(
          "The formula to validate, including the leading '=' sign (e.g., '=SUM(A1:A10)')"
        ),
      })
    )
    .returns(validationResultSchema),
};

/**
 * Tool definition for getSpreadsheetErrors
 */
export const getSpreadsheetErrorsTool = {
  name: "getSpreadsheetErrors",
  description: "Scan the active sheet for cells containing formula errors (e.g., #DIV/0!, #VALUE!, #REF!, #NAME?). Optionally accepts a range in A1 notation.",
  tool: getSpreadsheetErrors,
  toolSchema: z
    .function()
    .args(
      z
        .string()
        .optional()
        .describe("Range to scan in A1 notation (e.g., 'B2:E10'). If omitted, scans entire sheet.")
    )
    .returns(
      z.object({
        success: z.boolean(),
        errorCount: z.number().optional().describe("Total number of errors found"),
        errors: z
          .array(
            z.object({
              address: z.string().describe("Cell address (e.g., 'B5')"),
              error: z.string().describe("Error code (e.g., '#DIV/0!')"),
              formula: z.string().nullable().describe("Formula that caused the error, if present"),
            })
          )
          .optional()
          .describe("Array of error details (omitted if no errors found)"),
        range: z.string().optional().describe("Range that was scanned"),
        truncated: z.boolean().optional().describe("True if results limited to first 50 errors"),
        message: z.string().optional().describe("Human-readable summary"),
        error: z.string().optional().describe("Error message if operation failed"),
      })
    ),
};

export const spreadsheetValidationTools = [
  validateSpreadsheetFormulaTool,
  getSpreadsheetErrorsTool,
];
