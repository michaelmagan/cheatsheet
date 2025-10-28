/**
 * @file spreadsheet-context-helper.ts
 * @description Context helper to provide read-only spreadsheet data to AI
 */

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import type { SpreadsheetTab, Cell, Column } from "@/types/spreadsheet";

/**
 * Formats spreadsheet data as a markdown table
 */
function formatSpreadsheetAsMarkdown(activeTab: SpreadsheetTab): string {
  const { name, rows, columns } = activeTab;

  // Get column headers (excluding ROW_HEADER)
  const columnIds = columns
    .filter((col: Column) => col.columnId !== 'ROW_HEADER')
    .map((col: Column) => col.columnId);

  // Build markdown string
  let markdown = `# Spreadsheet: ${name}\n\n`;

  // Header row
  markdown += `|   | ${columnIds.join(' | ')} |\n`;
  markdown += `|---|${columnIds.map(() => '---').join('|')}|\n`;

  // Data rows (skip first row which is the header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowId;
    const cellValues = row.cells
      .slice(1) // skip first cell (row number cell)
      .map((cell: Cell) => {
        if (cell.type === 'number') return String(cell.value ?? '');
        return cell.text || '';
      });

    markdown += `| ${rowNumber} | ${cellValues.join(' | ')} |\n`;
  }

  return markdown;
}

/**
 * Context helper that provides the active spreadsheet tab data
 * This is read-only context - AI uses tools for mutations
 */
export const spreadsheetContextHelper = () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return null;
    }

    const store = useSpreadsheetTabsStore.getState();

    if (!store || !store.tabs) {
      return null;
    }

    const activeTab = store.tabs.find((t) => t.id === store.activeTabId);

    if (!activeTab) {
      return null;
    }

    // Ensure all data structures are valid before returning
    if (!Array.isArray(activeTab.rows) || !Array.isArray(activeTab.columns)) {
      return null;
    }

    // Return markdown-formatted spreadsheet data
    return formatSpreadsheetAsMarkdown(activeTab);
  } catch (error) {
    console.error("Error in spreadsheetContextHelper:", error);
    return null;
  }
};
