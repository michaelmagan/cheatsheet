"use client";

import { cn } from "@/lib/utils";
import { applyChanges } from "@/lib/spreadsheet-utils";
import * as React from "react";
import { ReactGrid } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import type { CellChange, Range, Row as ReactGridRow, Column as ReactGridColumn } from "@silevis/reactgrid";
import type { Row, Column, Selection } from "@/types/spreadsheet";
import { spreadsheetPropsSchema } from "@/schemas/spreadsheet-schemas";

// ============================================
// Zod Schemas
// ============================================

// Re-export the schema for use in Tambo component registration
export const spreadsheetSchema = spreadsheetPropsSchema;

export type SpreadsheetProps = {
  title?: string;
  columns: Column[];
  rows: Row[];
  editable?: boolean;
  className?: string;
  onChange: (rows: Row[]) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (columnId: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (rowId: string | number) => void;
};

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
    const [hasActiveSelection, setHasActiveSelection] = React.useState(false);

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
        setHasActiveSelection(false);
        onSelectionChange?.(null);
        return;
      }

      const range = ranges[0];

      const startRow = range.first.row.idx;
      const endRow = range.last.row.idx;
      const startCol = range.first.column.idx;
      const endCol = range.last.column.idx;

      setHasActiveSelection(true);

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

    // If no rows or columns, show a helpful empty state
    if (!rows || rows.length === 0 || !columns || columns.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "w-full h-full bg-background flex flex-col",
            className
          )}
        >
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 gap-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No Data Available</h3>
              <p className="text-sm max-w-md">
                This spreadsheet is empty. Use the AI assistant to add data, or create columns and rows to get started.
              </p>
            </div>
            <div className="flex gap-2">
              {onAddColumn && (
                <button
                  onClick={onAddColumn}
                  className="px-4 py-2 flex items-center gap-2 text-sm rounded-md bg-accent hover:bg-accent/80 text-foreground border border-border transition-colors"
                  aria-label="Add first column"
                >
                  <span>Add Column</span>
                </button>
              )}
              {onAddRow && (
                <button
                  onClick={onAddRow}
                  className="px-4 py-2 flex items-center gap-2 text-sm rounded-md bg-accent hover:bg-accent/80 text-foreground border border-border transition-colors"
                  aria-label="Add first row"
                >
                  <span>Add Row</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full h-full bg-background flex flex-col",
          className
        )}
      >
        {/* Header with title and toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          {title && (
            <h3 className="text-lg font-semibold">{title}</h3>
          )}

          {/* AI Selection Indicator */}
          {hasActiveSelection && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
              <svg
                className="w-3 h-3 animate-pulse"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <circle cx="10" cy="10" r="5" />
              </svg>
              <span>AI sees selection</span>
            </div>
          )}

          {/* Toolbar with action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedColumnId && onRemoveColumn && (
              <button
                onClick={() => onRemoveColumn(selectedColumnId)}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
                aria-label={`Delete column ${selectedColumnId}`}
                title={`Delete column ${selectedColumnId}`}
              >
                <span>Delete Column {selectedColumnId}</span>
              </button>
            )}

            {selectedRowId && onRemoveRow && (
              <button
                onClick={() => onRemoveRow(selectedRowId)}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
                aria-label={`Delete row ${selectedRowId}`}
                title={`Delete row ${selectedRowId}`}
              >
                <span>Delete Row {selectedRowId}</span>
              </button>
            )}

            {onAddColumn && (
              <button
                onClick={onAddColumn}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground border border-border transition-colors"
                aria-label="Add column"
                title="Add column"
              >
                <span>Add Column</span>
              </button>
            )}

            {onAddRow && (
              <button
                onClick={onAddRow}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground border border-border transition-colors"
                aria-label="Add row"
                title="Add row"
              >
                <span>Add Row</span>
              </button>
            )}
          </div>
        </div>

        {/* Spreadsheet grid */}
        <div className="flex-1 overflow-auto">
          <ReactGrid
            rows={rows as unknown as ReactGridRow[]}
            columns={columns as unknown as ReactGridColumn[]}
            onCellsChanged={handleChanges}
            onSelectionChanged={handleSelectionChanged}
            enableRangeSelection
            enableRowSelection
            enableColumnSelection
            stickyTopRows={1}
            stickyLeftColumns={1}
          />
        </div>
      </div>
    );
  }
);

Spreadsheet.displayName = "Spreadsheet";
