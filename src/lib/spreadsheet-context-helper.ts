/**
 * @file spreadsheet-context-helper.ts
 * @description Context helper to provide read-only spreadsheet data to AI
 */

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";

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

    // Deep clone to avoid any reference issues
    return {
      tabId: activeTab.id,
      name: activeTab.name,
      rows: JSON.parse(JSON.stringify(activeTab.rows)),
      columns: JSON.parse(JSON.stringify(activeTab.columns)),
      editable: activeTab.editable,
    };
  } catch (error) {
    console.error("Error in spreadsheetContextHelper:", error);
    return null;
  }
};
