/**
 * Spreadsheet type definitions
 * Centralized type definitions for spreadsheet cells, rows, columns, and tabs
 */

// ============================================
// Cell Types
// ============================================

export interface HeaderCell {
  type: "header";
  text: string;
  nonEditable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface TextCell {
  type: "text";
  text: string;
  nonEditable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface NumberCell {
  type: "number";
  value: number;
  format?: Intl.NumberFormat;
  nonEditable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export type Cell = HeaderCell | TextCell | NumberCell;

// ============================================
// Row and Column Types
// ============================================

export interface Row {
  rowId: string | number;
  cells: Cell[];
  height?: number;
}

export interface Column {
  columnId: string;
  width?: number;
  resizable?: boolean;
  reorderable?: boolean;
}

// ============================================
// Tab Type
// ============================================

export interface SpreadsheetTab {
  id: string;
  name: string;
  rows: Row[];
  columns: Column[];
  editable: boolean;
}

// ============================================
// Selection Type
// ============================================

export interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}
