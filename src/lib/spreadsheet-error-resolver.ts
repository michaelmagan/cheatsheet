/**
 * Error resolution system for spreadsheet formula errors.
 * Provides error type detection and actionable resolution guidance.
 */

/**
 * Fallback error resolution message for unknown error types.
 */
export const FORMULA_ERROR_RESOLUTION =
  "The formula contains an error. Use listSpreadsheetFormulas() to verify function names, " +
  "or call getSpreadsheetFormulaHelp() with the specific function name for usage details.";

/**
 * Maps Excel error codes to error categories.
 *
 * @param errorCode - The Excel error code (e.g., "#NAME?", "#DIV/0!", "#REF!")
 * @returns The error category as a string
 */
export function determineErrorType(errorCode: string): string {
  const normalizedError = errorCode.trim().toUpperCase();

  const errorPatterns: Record<string, string> = {
    "#NAME?": "formula_error",
    "#DIV/0!": "division_error",
    "#REF!": "reference_error",
    "#VALUE!": "value_error",
    "#NUM!": "numeric_error",
    "#N/A": "lookup_error",
    "#NULL!": "null_error",
    "#GETTING_DATA": "loading_error",
    "#SPILL!": "spill_error",
    "#CALC!": "calculation_error",
    "#FIELD!": "field_error",
    "#BLOCKED!": "blocked_error",
    "#UNKNOWN!": "unknown_error",
    "#ERROR!": "general_error",
    "#CIRCULAR!": "circular_reference",
  };

  return errorPatterns[normalizedError] || "unknown_error";
}

/**
 * Returns error-specific resolution guidance with references to Tambo tools.
 *
 * @param errorCode - The Excel error code (e.g., "#NAME?", "#DIV/0!", "#REF!")
 * @returns Actionable resolution message
 */
export function getErrorSpecificResolution(errorCode: string): string {
  const normalizedError = errorCode.trim().toUpperCase();

  const resolutions: Record<string, string> = {
    "#NAME?":
      "Function name not recognized. Call listSpreadsheetFormulas() to verify function exists, " +
      "then getSpreadsheetFormulaHelp(functionName) for the correct syntax.",

    "#DIV/0!":
      "Division by zero detected. Check if denominator cell is zero using readSpreadsheetCell(), " +
      "or wrap formula with IF() to handle zero case: =IF(B1=0, 0, A1/B1)",

    "#REF!":
      "Invalid cell reference. Verify referenced cells exist within sheet bounds. " +
      "If the sheet is too small, use addSpreadsheetRow(N) or addSpreadsheetColumn(N) to expand it.",

    "#VALUE!":
      "Wrong argument type. Call getSpreadsheetFormulaHelp(functionName) to check expected parameter types " +
      "and verify all arguments match the expected data types.",

    "#NUM!":
      "Invalid numeric value or out of range. Check for extremely large numbers, negative square roots, " +
      "or other mathematically invalid operations.",

    "#N/A":
      "Lookup value not found. Verify the lookup value exists in the search range using readSpreadsheetRange(). " +
      "Check that the lookup value matches exactly (including spaces and case).",

    "#NULL!":
      "Cell ranges don't intersect. Use a comma to separate multiple ranges (e.g., SUM(A1:A10, C1:C10)), " +
      "not a space.",

    "#CIRCULAR!":
      "Circular reference detected (formula refers to itself directly or indirectly). " +
      "Remove the circular dependency by restructuring your formulas.",

    "#GETTING_DATA":
      "Formula is waiting for data to load. This is typically transient. " +
      "If it persists, check that all referenced cells have completed their calculations.",

    "#SPILL!":
      "Array formula can't output to the required range because cells are blocked. " +
      "Clear the cells where the formula needs to output using clearSpreadsheetRange().",

    "#CALC!":
      "Error during calculation, possibly due to exceeding calculation limits. " +
      "Simplify the formula or break it into smaller steps across multiple cells.",

    "#FIELD!":
      "Formula references a field that doesn't exist in a linked data type or table. " +
      "Verify the field name is correct and exists in the data source.",

    "#BLOCKED!":
      "Formula is blocked by privacy or security settings. " +
      "This typically occurs with external data sources. Verify permissions and data source settings.",

    "#UNKNOWN!":
      "Unknown error during formula evaluation. " +
      "Try rewriting the formula in a simpler form or breaking it into steps.",

    "#ERROR!":
      "General error occurred. This may indicate an incomplete or malformed formula. " +
      "Verify the formula syntax is complete and correct. Common causes include missing closing parentheses, " +
      "incomplete range references, or unsupported formula features.",
  };

  return resolutions[normalizedError] || FORMULA_ERROR_RESOLUTION;
}
