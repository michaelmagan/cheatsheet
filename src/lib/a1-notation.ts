/**
 * A1 notation parsing utilities for spreadsheet references
 * Handles cell references like "A1", "$A$1", and ranges like "A1:B10"
 */

export interface CellReference {
  col: string;
  row: number;
  colAbsolute: boolean;
  rowAbsolute: boolean;
}

export interface RangeReference {
  start: CellReference;
  end: CellReference;
}

/**
 * Convert column letter(s) to zero-based index
 * @example "A" -> 0, "B" -> 1, "Z" -> 25, "AA" -> 26, "AB" -> 27
 */
export function columnLetterToIndex(letter: string): number {
  if (!letter || typeof letter !== 'string') {
    throw new Error('Column letter must be a non-empty string');
  }

  const upper = letter.toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) {
    throw new Error(`Invalid column letter: ${letter}`);
  }

  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    const charCode = upper.charCodeAt(i) - 65; // 'A' is 65
    index = index * 26 + charCode + 1;
  }

  return index - 1; // Convert to zero-based
}

/**
 * Convert zero-based column index to letter(s)
 * @example 0 -> "A", 1 -> "B", 25 -> "Z", 26 -> "AA", 27 -> "AB"
 */
export function columnIndexToLetter(index: number): string {
  if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
    throw new Error('Column index must be a non-negative integer');
  }

  let letter = '';
  let num = index + 1; // Convert to one-based for calculation

  while (num > 0) {
    const remainder = (num - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    num = Math.floor((num - 1) / 26);
  }

  return letter;
}

/**
 * Parse a single cell reference (e.g., "A1", "$A$1", "$A1", "A$1")
 * @returns CellReference object with column, row, and absolute reference flags
 */
export function parseA1Cell(cellRef: string): CellReference {
  if (!cellRef || typeof cellRef !== 'string') {
    throw new Error('Cell reference must be a non-empty string');
  }

  const trimmed = cellRef.trim();

  // Match pattern: optional $ + letters + optional $ + digits
  const match = trimmed.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/i);

  if (!match) {
    throw new Error(`Invalid cell reference format: ${cellRef}`);
  }

  const [, colAbsoluteMarker, col, rowAbsoluteMarker, rowStr] = match;
  const row = parseInt(rowStr, 10);

  if (row < 1) {
    throw new Error(`Row number must be >= 1: ${cellRef}`);
  }

  return {
    col: col.toUpperCase(),
    row,
    colAbsolute: colAbsoluteMarker === '$',
    rowAbsolute: rowAbsoluteMarker === '$',
  };
}

/**
 * Parse A1 notation that can be either a single cell or a range
 * @example "A1" -> CellReference, "A1:B10" -> RangeReference
 */
export function parseA1Notation(ref: string): CellReference | RangeReference {
  if (!ref || typeof ref !== 'string') {
    throw new Error('Reference must be a non-empty string');
  }

  const trimmed = ref.trim();

  // Check if it's a range (contains colon)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');

    if (parts.length !== 2) {
      throw new Error(`Invalid range format: ${ref}`);
    }

    const start = parseA1Cell(parts[0]);
    const end = parseA1Cell(parts[1]);

    // Validate range (start should be before or equal to end)
    const startColIndex = columnLetterToIndex(start.col);
    const endColIndex = columnLetterToIndex(end.col);

    if (startColIndex > endColIndex || start.row > end.row) {
      throw new Error(`Invalid range: start cell must be before or equal to end cell: ${ref}`);
    }

    return { start, end };
  }

  // Single cell reference
  return parseA1Cell(trimmed);
}

/**
 * Convert A1 notation to store array indices
 * Accounts for sticky header row and column in the store
 * @example "A1" -> {rowIndex: 1, cellIndex: 1}
 * @example "B2" -> {rowIndex: 2, cellIndex: 2}
 */
export function a1ToStoreIndices(a1Ref: string): { rowIndex: number; cellIndex: number } {
  const parsed = parseA1Notation(a1Ref);

  // Handle range references
  if ('start' in parsed) {
    throw new Error('Range references not supported in a1ToStoreIndices. Use single cell reference.');
  }

  const cellRef = parsed as CellReference;
  const colIndex = columnLetterToIndex(cellRef.col);

  // A1 notation is 1-based, but we need to account for the sticky header
  // A1 maps to rows[1].cells[1] (index 1 in both dimensions)
  // The 0 index is reserved for sticky header row/column
  return {
    rowIndex: cellRef.row, // A1 row 1 -> store index 1
    cellIndex: colIndex + 1, // A1 col A (0) -> store index 1
  };
}

/**
 * Validate A1 reference format without throwing errors
 * @returns true if valid, false otherwise
 */
export function validateA1Reference(ref: string): boolean {
  try {
    parseA1Notation(ref);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to get range boundaries as store indices
 * @example "A1:B2" -> {startRow: 1, endRow: 2, startCol: 1, endCol: 2}
 */
export function rangeToStoreIndices(rangeRef: string): {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
} {
  const parsed = parseA1Notation(rangeRef);

  if (!('start' in parsed)) {
    // Single cell, treat as 1x1 range
    const cellRef = parsed as CellReference;
    const colIndex = columnLetterToIndex(cellRef.col);

    return {
      startRow: cellRef.row,
      endRow: cellRef.row,
      startCol: colIndex + 1,
      endCol: colIndex + 1,
    };
  }

  const rangeReference = parsed as RangeReference;
  const startColIndex = columnLetterToIndex(rangeReference.start.col);
  const endColIndex = columnLetterToIndex(rangeReference.end.col);

  return {
    startRow: rangeReference.start.row,
    endRow: rangeReference.end.row,
    startCol: startColIndex + 1,
    endCol: endColIndex + 1,
  };
}
