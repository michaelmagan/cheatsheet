"use client";

import { cn } from "@/lib/utils";
import { applyChanges } from "@/lib/spreadsheet-utils";
import * as React from "react";
import { ReactGrid } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import type { CellChange, Range } from "@silevis/reactgrid";
import { z } from "zod";

// ============================================
// Zod Schemas
// ============================================

// Cell types
const headerCellSchema = z.object({
  type: z.literal("header"),
  text: z.string(),
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

const textCellSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

const numberCellSchema = z.object({
  type: z.literal("number"),
  value: z.number(),
  format: z.string().optional(), // e.g., "$0,0.00" or "0.00%"
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

const cellSchema = z.union([headerCellSchema, textCellSchema, numberCellSchema]);

// Row structure
const rowSchema = z.object({
  rowId: z.union([z.string(), z.number()]),
  cells: z.array(cellSchema),
  height: z.number().optional(),
});

// Column structure
const columnSchema = z.object({
  columnId: z.string(),
  width: z.number().optional(),
  resizable: z.boolean().optional(),
  reorderable: z.boolean().optional(),
});

// Main spreadsheet props
export const spreadsheetSchema = z.object({
  title: z.string().optional().describe("Title displayed above the spreadsheet"),
  columns: z.array(columnSchema).describe("Column definitions"),
  rows: z.array(rowSchema).describe("Row data with cells"),
  editable: z.boolean().optional().default(true).describe("Whether cells can be edited"),
});

export type SpreadsheetProps = z.infer<typeof spreadsheetSchema> & {
  className?: string;
  onChange: (rows: Row[]) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (columnId: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (rowId: string | number) => void;
};

// Selection type
interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

// ============================================
// Spreadsheet Component (Fully Controlled)
// ============================================

/**
 * Interactive spreadsheet component using ReactGrid
 * This is a fully controlled component - parent manages all state
 *
 * @component
 * @example
 * ```tsx
 * <Spreadsheet
 *   title="Sales Data"
 *   columns={[
 *     { columnId: "A", width: 150 },
 *     { columnId: "B", width: 150 }
 *   ]}
 *   rows={[
 *     {
 *       rowId: 0,
 *       cells: [
 *         { type: "header", text: "Month" },
 *         { type: "header", text: "Revenue" }
 *       ]
 *     },
 *     {
 *       rowId: 1,
 *       cells: [
 *         { type: "text", text: "Jan" },
 *         { type: "number", value: 45000 }
 *       ]
 *     }
 *   ]}
 *   editable={true}
 *   onChange={(newRows) => updateState(newRows)}
 * />
 * ```
 */
export const Spreadsheet = React.forwardRef<HTMLDivElement, SpreadsheetProps>(
  ({
    columns,
    rows,
    editable = true,
    onChange,
    onSelectionChange,
    className,
    title,
    onAddColumn,
    onRemoveColumn,
    onAddRow,
    onRemoveRow,
  }, ref) => {
    const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(null);
    const [selectedRowId, setSelectedRowId] = React.useState<string | number | null>(null);

    // Handle cell changes - call parent's onChange
    const handleChanges = React.useCallback((changes: CellChange[]) => {
      if (!editable) return;

      const newRows = applyChanges(changes, rows, columns);
      onChange(newRows);
    }, [editable, rows, columns, onChange]);

    // Handle selection changes
    const handleSelectionChanged = React.useCallback((ranges: Range[]) => {
      if (!ranges || ranges.length === 0) {
        setSelectedColumnId(null);
        setSelectedRowId(null);
        onSelectionChange?.(null);
        return;
      }

      const range = ranges[0];
      const startRow = Number(range.first.row);
      const endRow = Number(range.last.row);
      const startCol = Number(range.first.column);
      const endCol = Number(range.last.column);

      // Check if entire column is selected (all rows selected for one column)
      if (startCol === endCol && startRow === 0 && endRow === rows.length - 1) {
        const columnId = columns[startCol]?.columnId;
        if (columnId && columnId !== "ROW_HEADER") {
          setSelectedColumnId(columnId);
          setSelectedRowId(null);
        }
      }
      // Check if entire row is selected (all columns selected for one row)
      else if (startRow === endRow && startCol === 0 && endCol === columns.length - 1) {
        const rowId = rows[startRow]?.rowId;
        if (rowId && rowId !== "header") {
          setSelectedRowId(rowId);
          setSelectedColumnId(null);
        }
      } else {
        // Regular cell selection
        setSelectedColumnId(null);
        setSelectedRowId(null);
      }

      const selection: Selection = {
        start: {
          row: startRow,
          col: startCol
        },
        end: {
          row: endRow,
          col: endCol
        },
      };

      onSelectionChange?.(selection);
    }, [onSelectionChange, rows, columns]);

    // If no rows or columns, show a placeholder
    if (!rows || rows.length === 0 || !columns || columns.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "w-full bg-background p-4",
            className
          )}
        >
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full bg-background relative",
          className
        )}
      >
        {title && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        <div className="w-full overflow-auto relative">
          <ReactGrid
            rows={rows}
            columns={columns}
            onCellsChanged={handleChanges}
            onSelectionChanged={handleSelectionChanged}
            enableRangeSelection
            enableRowSelection
            enableColumnSelection
          />

          {/* Add Column button - positioned to the right */}
          {onAddColumn && (
            <button
              onClick={onAddColumn}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-accent hover:bg-accent/80 text-foreground shadow-sm border border-border"
              title="Add column"
            >
              +
            </button>
          )}

          {/* Add Row button - positioned at bottom */}
          {onAddRow && (
            <button
              onClick={onAddRow}
              className="absolute left-1/2 bottom-2 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-accent hover:bg-accent/80 text-foreground shadow-sm border border-border"
              title="Add row"
            >
              +
            </button>
          )}

          {/* Delete Column button - shown when column is selected */}
          {selectedColumnId && onRemoveColumn && (
            <button
              onClick={() => onRemoveColumn(selectedColumnId)}
              className="absolute top-4 right-12 px-3 py-1 flex items-center gap-1 text-xs rounded bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md border border-border"
              title={`Delete column ${selectedColumnId}`}
            >
              <span>Delete Column {selectedColumnId}</span>
            </button>
          )}

          {/* Delete Row button - shown when row is selected */}
          {selectedRowId && onRemoveRow && (
            <button
              onClick={() => onRemoveRow(selectedRowId)}
              className="absolute top-4 right-12 px-3 py-1 flex items-center gap-1 text-xs rounded bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md border border-border"
              title={`Delete row ${selectedRowId}`}
            >
              <span>Delete Row {selectedRowId}</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Spreadsheet.displayName = "Spreadsheet";
