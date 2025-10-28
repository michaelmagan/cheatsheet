import type { Row as ReactGridRow, CellChange } from "@silevis/reactgrid";
import type { Cell, Row, Column } from "@/types/spreadsheet";

// ============================================
// Cell Reference Utilities (for selection context)
// ============================================

// Convert column index to Excel letter (0→A, 25→Z, 26→AA)
export function columnIndexToLetter(index: number): string {
  let letter = "";
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

// Convert Excel letter to column index (A→0, Z→25, AA→26)
export function letterToColumnIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + letter.charCodeAt(i) - 64;
  }
  return index - 1;
}

// Parse cell reference "B3" → {row: 2, col: 1}
export function parseCellReference(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);

  const rowNumber = parseInt(match[2]);
  if (rowNumber < 1) {
    throw new Error(`Invalid row number in cell reference: ${ref}. Row numbers must be >= 1`);
  }

  return {
    col: letterToColumnIndex(match[1]),
    row: rowNumber - 1,
  };
}

// Convert coordinates to cell reference {row: 2, col: 1} → "B3"
export function coordinatesToCellRef(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`;
}

// Parse range "A1:C5" → {start: {row, col}, end: {row, col}}
export function parseRangeReference(range: string): {
  start: { row: number; col: number };
  end: { row: number; col: number };
} {
  const [startRef, endRef] = range.split(":");
  return {
    start: parseCellReference(startRef),
    end: parseCellReference(endRef),
  };
}

// Selection interface for compatibility (to be updated in Phase 3)
interface SelectionCompat {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

// Format ReactGrid Selection as Excel-style range
export function formatSelectionAsRange(selection: SelectionCompat): string {
  const { row: startRow, col: startCol } = selection.start;
  const { row: endRow, col: endCol } = selection.end;

  const startRef = coordinatesToCellRef(startRow, startCol);
  const endRef = coordinatesToCellRef(endRow, endCol);

  if (startRef === endRef) {
    return startRef; // Single cell "A1"
  }
  return `${startRef}:${endRef}`; // Range "A1:C5"
}

// Cell value types
type CellValue = string | number | undefined;

interface CellWithValue {
  row: number;
  col: number;
  value: CellValue;
  cellRef: string;
}

// Extract cell values from selection and rows data
export function extractCellValues(
  selection: SelectionCompat,
  rows: ReactGridRow[]
): Array<CellWithValue> {
  const { row: startRow, col: startCol } = selection.start;
  const { row: endRow, col: endCol } = selection.end;

  const values: CellWithValue[] = [];

  for (let r = startRow; r <= endRow; r++) {
    const row = rows[r];
    if (!row) continue;

    for (let c = startCol; c <= endCol; c++) {
      const cell = row.cells[c] as Cell;
      if (!cell) continue;

      let value: CellValue;
      if (cell.type === "header") {
        value = cell.text;
      } else if (cell.type === "text") {
        value = cell.text;
      } else if (cell.type === "number") {
        value = cell.value;
      }

      values.push({
        row: r,
        col: c,
        value,
        cellRef: coordinatesToCellRef(r, c),
      });
    }
  }

  return values;
}

// ============================================
// ReactGrid Manipulation Utilities
// ============================================

// Apply cell changes from ReactGrid to immutable rows array
export function applyChanges(changes: CellChange[], rows: Row[], columns: Column[]): Row[] {
  const newRows = [...rows];

  changes.forEach((change) => {
    const rowIndex = newRows.findIndex((r) => r.rowId === change.rowId);
    if (rowIndex === -1) return;

    const row = { ...newRows[rowIndex] };
    // Find the column index by matching columnId (which may be a string like "A", "B", etc.)
    const cellIndex = columns.findIndex((col) => col.columnId === change.columnId);
    if (cellIndex === -1) return;

    const cell = { ...row.cells[cellIndex], ...change.newCell } as Cell;
    row.cells = [...row.cells];
    row.cells[cellIndex] = cell;
    newRows[rowIndex] = row;
  });

  return newRows;
}
