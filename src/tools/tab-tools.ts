/**
 * @file tab-tools.ts
 * @description Tools for AI to manage spreadsheet tabs
 */

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import { z } from "zod";
import { MAX_TAB_NAME_LENGTH } from "@/lib/constants";

// ============================================
// Helper Functions
// ============================================

/**
 * Sanitize tab name
 */
function sanitizeTabName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > MAX_TAB_NAME_LENGTH
    ? trimmed.substring(0, MAX_TAB_NAME_LENGTH)
    : trimmed;
}

// ============================================
// Tool Functions
// ============================================

const createTab = async (name?: string) => {
  try {
    const store = useSpreadsheetTabsStore.getState();

    const sanitizedName = name ? sanitizeTabName(name) : undefined;
    const newTab = store.createTab(sanitizedName);

    return {
      success: true,
      tabId: newTab.id,
      tabName: newTab.name,
      message: `Created new tab "${newTab.name}" with ID ${newTab.id}. The tab is now active.`,
    };
  } catch (error) {
    console.error("Error in createTab:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// ============================================
// Tool Definitions
// ============================================

export const createTabTool = {
  name: "createSpreadsheetTab",
  description:
    "Create a new spreadsheet tab. Optionally provide a name for the tab. If no name is provided, a default name will be generated (e.g., 'Sheet 2'). The new tab will automatically become the active tab. Returns the tab ID and name.",
  tool: createTab,
  toolSchema: z
    .function()
    .args(
      z
        .string()
        .optional()
        .describe("Optional name for the new tab (e.g., 'Sales Data')"),
    )
    .returns(
      z.object({
        success: z.boolean(),
        tabId: z.string().optional(),
        tabName: z.string().optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

// ============================================
// Export all tools
// ============================================

export const tabTools = [createTabTool];
