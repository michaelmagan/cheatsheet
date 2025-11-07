/**
 * @file spreadsheet-types.ts
 * @description Shared type definitions for spreadsheet tools and validation
 */

/**
 * Primitive value accepted by updateSpreadsheetCells
 */
export type CellValueInput = string | number | null;

/**
 * Represents a single cell mutation request
 */
export interface CellUpdateRequest {
  /** Cell address in A1 notation (e.g., "B5") */
  address: string;
  /** Value to write (text, number, formula string, or null/empty) */
  value: CellValueInput;
}

/**
 * Evaluation result for a single cell after a read or update operation
 */
export interface CellEvaluation {
  /** Cell address in A1 notation (e.g., "B5") */
  address: string;
  /** Zero-based row index */
  row: number;
  /** Zero-based column index */
  column: number;
  /** Raw value from the cell */
  rawValue: unknown;
  /** Human-readable display value */
  displayValue: string | null;
  /** Formula string if cell contains a formula (starts with =) */
  formula: string | null;
  /** Error code if cell evaluation failed (e.g., "#DIV/0!", "#NAME?") */
  error: string | null;
}

/**
 * Summary of a single cell update operation
 */
export interface CellUpdateSummary {
  /** Cell address in A1 notation */
  address: string;
  /** Display value after update */
  value: string | null;
  /** Formula if applicable */
  formula: string | null;
}

/**
 * Detailed information about a cell error
 */
export interface ErrorDetail {
  /** Error type category (e.g., "formula_error", "division_error") */
  type: string;
  /** Error code from Excel (e.g., "#DIV/0!", "#NAME?") */
  code: string;
  /** Human-readable resolution guidance for fixing the error */
  resolution: string;
}

/**
 * Summary of a bulk operation (e.g., updateSpreadsheetCells)
 */
export interface BulkOperationSummary {
  /** Total number of cells in the operation */
  total: number;
  /** Number of cells that updated successfully */
  succeeded: number;
  /** Number of cells that failed with errors */
  failed: number;
}

/**
 * Information about additional errors beyond the first
 */
export interface MoreErrorsInfo {
  /** Number of additional errors (excludes firstError) */
  count: number;
  /** Sample of error cell addresses (up to 5) */
  addresses: string[];
  /** Message directing user to getSpreadsheetErrors tool */
  note: string;
}

/**
 * Optional parameter type for requesting detailed evaluations in bulk operations
 */
export type ReturnDetailsParam = boolean;
