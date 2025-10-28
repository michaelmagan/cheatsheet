/**
 * spreadsheet-tabs-store.ts
 * Simplified store for spreadsheet tabs (like Google Sheets)
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Cell, Row, Column, SpreadsheetTab } from "@/types/spreadsheet";
import { generateId } from "@/lib/id-generator";
import {
  DEFAULT_SPREADSHEET_COLUMNS,
  DEFAULT_SPREADSHEET_ROWS,
  DEFAULT_COLUMN_WIDTH,
  ROW_HEADER_WIDTH,
} from "@/lib/constants";

// ============================================
// Types
// ============================================

// Store state
export interface SpreadsheetTabsState {
  tabs: SpreadsheetTab[];
  activeTabId: string | null;

  // Actions
  getTabs: () => SpreadsheetTab[];
  getActiveTab: () => SpreadsheetTab | undefined;
  createTab: (name?: string) => SpreadsheetTab;
  updateTab: (id: string, data: Partial<SpreadsheetTab>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  reorderTab: (tabId: string, newIndex: number) => void;
  addColumn: (tabId: string) => void;
  removeColumn: (tabId: string, columnId: string) => void;
  addRow: (tabId: string) => void;
  removeRow: (tabId: string, rowId: string | number) => void;
}

// ============================================
// Helpers
// ============================================

// Helper to generate column letters (A, B, C, ..., Z, AA, AB, ...)
export function columnIndexToLetter(index: number): string {
  let letter = "";
  let num = index;
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

// Create default columns with row number column + data columns (A-E)
function createDefaultColumns(): Column[] {
  // First column is for row numbers
  const rowNumberColumn: Column = {
    columnId: "ROW_HEADER",
    width: ROW_HEADER_WIDTH,
    resizable: false,
    reorderable: false,
  };

  // Generate column letters based on DEFAULT_SPREADSHEET_COLUMNS
  const columnLetters = Array.from({ length: DEFAULT_SPREADSHEET_COLUMNS }, (_, i) =>
    columnIndexToLetter(i)
  );

  // Data columns
  const dataColumns: Column[] = columnLetters.map((columnId) => ({
    columnId,
    width: DEFAULT_COLUMN_WIDTH,
    resizable: true,
    reorderable: false,
  }));

  return [rowNumberColumn, ...dataColumns];
}

// Create default rows (column header row + DEFAULT_SPREADSHEET_ROWS data rows)
function createDefaultRows(): Row[] {
  const columns = createDefaultColumns();
  const dataColumns = columns.filter(col => col.columnId !== "ROW_HEADER");
  const rows: Row[] = [];

  // Header row (row 0) - contains column letters (non-editable)
  rows.push({
    rowId: "header",
    cells: [
      // First cell is empty (top-left corner)
      {
        type: "header" as const,
        text: "",
        nonEditable: true,
      },
      // Column headers - non-editable
      ...dataColumns.map((col) => ({
        type: "header" as const,
        text: col.columnId,
        nonEditable: true,
      })),
    ],
  });

  // Data rows with row number in first column
  for (let i = 1; i <= DEFAULT_SPREADSHEET_ROWS; i++) {
    rows.push({
      rowId: i,
      cells: [
        // Row number header (non-editable)
        {
          type: "text" as const,
          text: String(i),
          nonEditable: true,
        },
        // Data cells
        ...dataColumns.map(() => ({
          type: "text" as const,
          text: "",
        })),
      ],
    });
  }

  return rows;
}

// ============================================
// Validation Helper
// ============================================

// Validate and fix cell structure
function validateCell(cell: unknown): Cell {
  if (!cell || typeof cell !== "object") {
    return { type: "text", text: "" };
  }

  const c = cell as Record<string, unknown>;

  if (c.type === "header") {
    return {
      type: "header",
      text: String(c.text || ""),
      nonEditable: c.nonEditable as boolean | undefined,
    };
  }

  if (c.type === "number") {
    return {
      type: "number",
      value: Number(c.value || 0),
      format: undefined, // NumberFormat objects cannot be serialized/restored from storage
      nonEditable: c.nonEditable as boolean | undefined,
    };
  }

  // Default to text
  return {
    type: "text",
    text: String(c.text || ""),
    nonEditable: c.nonEditable as boolean | undefined,
  };
}

// Validate and fix tab data
function validateTab(tab: unknown): SpreadsheetTab | null {
  try {
    if (!tab || typeof tab !== "object") {
      return null;
    }

    const t = tab as Record<string, unknown>;

    if (!t.id || !Array.isArray(t.rows) || !Array.isArray(t.columns)) {
      return null;
    }

    return {
      id: t.id as string,
      name: String(t.name || "Sheet"),
      rows: t.rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          rowId: r.rowId as string | number,
          cells: Array.isArray(r.cells)
            ? r.cells.map(validateCell)
            : [],
          height: r.height as number | undefined,
        };
      }),
      columns: t.columns.map((col: unknown) => {
        const c = col as Record<string, unknown>;
        return {
          columnId: String(c.columnId || ""),
          width: Number(c.width || 150),
          resizable: Boolean(c.resizable),
          reorderable: Boolean(c.reorderable),
        };
      }),
      editable: Boolean(t.editable !== false),
    };
  } catch (error) {
    console.error("Error validating tab:", error);
    return null;
  }
}

// ============================================
// Store
// ============================================

export const useSpreadsheetTabsStore = create<SpreadsheetTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      // Get all tabs
      getTabs: () => get().tabs,

      // Get active tab
      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId);
      },

      // Create a new tab
      createTab: (name?: string) => {
        const id = generateId();
        const tabs = get().tabs;
        const tabName = name || `Sheet ${tabs.length + 1}`;

        const newTab: SpreadsheetTab = {
          id,
          name: tabName,
          rows: createDefaultRows(),
          columns: createDefaultColumns(),
          editable: true,
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));

        return newTab;
      },

      // Update tab data
      updateTab: (id: string, data: Partial<SpreadsheetTab>) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      // Remove a tab
      removeTab: (id: string) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActiveId = state.activeTabId;

          // If we're removing the active tab, select another one
          if (state.activeTabId === id) {
            newActiveId = newTabs[0]?.id || null;
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveId,
          };
        });
      },

      // Set the active tab
      setActiveTab: (id: string | null) => {
        set({ activeTabId: id });
      },

      // Reorder tabs
      reorderTab: (tabId: string, newIndex: number) => {
        set((state) => {
          const currentIndex = state.tabs.findIndex((t) => t.id === tabId);
          if (currentIndex === -1) return state;

          const tabs = [...state.tabs];
          const [moving] = tabs.splice(currentIndex, 1);
          const boundedIndex = Math.max(
            0,
            Math.min(tabs.length, newIndex),
          );
          tabs.splice(boundedIndex, 0, moving);

          return { tabs };
        });
      },

      // Add a new column to a tab
      addColumn: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          // Find the next column letter
          const dataColumns = tab.columns.filter(col => col.columnId !== "ROW_HEADER");
          const nextColumnIndex = dataColumns.length;
          const nextColumnId = columnIndexToLetter(nextColumnIndex);

          // Add new column
          const newColumn: Column = {
            columnId: nextColumnId,
            width: DEFAULT_COLUMN_WIDTH,
            resizable: true,
            reorderable: false,
          };

          // Update rows to add a cell for the new column
          const updatedRows = tab.rows.map((row) => {
            if (row.rowId === "header") {
              // Add column header (non-editable)
              return {
                ...row,
                cells: [
                  ...row.cells,
                  { type: "header" as const, text: nextColumnId, nonEditable: true },
                ],
              };
            } else {
              // Add empty data cell
              return {
                ...row,
                cells: [
                  ...row.cells,
                  { type: "text" as const, text: "" },
                ],
              };
            }
          });

          return {
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    columns: [...t.columns, newColumn],
                    rows: updatedRows,
                  }
                : t
            ),
          };
        });
      },

      // Remove a column from a tab
      removeColumn: (tabId: string, columnId: string) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab || columnId === "ROW_HEADER") return state;

          // Find column index
          const columnIndex = tab.columns.findIndex((col) => col.columnId === columnId);
          if (columnIndex === -1) return state;

          // Remove column
          const newColumns = tab.columns.filter((col) => col.columnId !== columnId);

          // Relabel columns after the removed one
          const relabeledColumns = newColumns.map((col, idx) => {
            if (col.columnId === "ROW_HEADER") return col;
            // Recalculate column letter based on position (excluding ROW_HEADER)
            const dataColIndex = newColumns
              .slice(0, idx)
              .filter(c => c.columnId !== "ROW_HEADER").length;
            return {
              ...col,
              columnId: columnIndexToLetter(dataColIndex),
            };
          });

          // Update rows
          const updatedRows = tab.rows.map((row) => {
            const newCells = [...row.cells];
            newCells.splice(columnIndex, 1);

            // Update header cells with new column labels (keep non-editable)
            if (row.rowId === "header") {
              return {
                ...row,
                cells: newCells.map((cell, idx) => {
                  if (idx === 0) return cell; // Skip ROW_HEADER
                  const dataColIndex = idx - 1;
                  return {
                    ...cell,
                    type: "header" as const,
                    text: columnIndexToLetter(dataColIndex),
                    nonEditable: true,
                  };
                }),
              };
            }

            return { ...row, cells: newCells };
          });

          return {
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    columns: relabeledColumns,
                    rows: updatedRows,
                  }
                : t
            ),
          };
        });
      },

      // Add a new row to a tab
      addRow: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          // Find the next row number
          const dataRows = tab.rows.filter(row => row.rowId !== "header");
          const nextRowNumber = dataRows.length + 1;

          // Create a new row with empty cells
          const newRow: Row = {
            rowId: nextRowNumber,
            cells: tab.columns.map((col) => {
              if (col.columnId === "ROW_HEADER") {
                // Row number cell
                return {
                  type: "text" as const,
                  text: String(nextRowNumber),
                  nonEditable: true,
                };
              } else {
                // Data cell
                return {
                  type: "text" as const,
                  text: "",
                };
              }
            }),
          };

          return {
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    rows: [...t.rows, newRow],
                  }
                : t
            ),
          };
        });
      },

      // Remove a row from a tab
      removeRow: (tabId: string, rowId: string | number) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab || rowId === "header") return state;

          // Remove the row
          const newRows = tab.rows.filter((row) => row.rowId !== rowId);

          // Renumber remaining data rows
          const updatedRows = newRows.map((row) => {
            if (row.rowId === "header") return row;

            // Find position in data rows (excluding header)
            const dataRows = newRows.filter(r => r.rowId !== "header");
            const index = dataRows.findIndex(r => r.rowId === row.rowId);
            const newRowNumber = index + 1;

            return {
              ...row,
              rowId: newRowNumber,
              cells: row.cells.map((cell, cellIdx) => {
                // Update row number in first column
                if (tab.columns[cellIdx]?.columnId === "ROW_HEADER") {
                  return {
                    ...cell,
                    type: "text" as const,
                    text: String(newRowNumber),
                    nonEditable: true,
                  };
                }
                return cell;
              }),
            };
          });

          return {
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    rows: updatedRows,
                  }
                : t
            ),
          };
        });
      },
    }),
    {
      name: "spreadsheet-tabs-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate and clean all tabs on rehydration
          const validatedTabs = state.tabs
            .map(validateTab)
            .filter((tab): tab is SpreadsheetTab => tab !== null);

          state.tabs = validatedTabs;

          // If activeTabId is invalid, set to first tab or null
          if (state.activeTabId && !validatedTabs.find(t => t.id === state.activeTabId)) {
            state.activeTabId = validatedTabs[0]?.id || null;
          }
        }
      },
    },
  ),
);
