"use client";

/**
 * @file tab-tools.ts
 * @description Minimal tools for the AI to manage spreadsheet tabs
 */

import { fortuneSheetStore } from "@/lib/fortune-sheet-store";
import type { WorkbookInstance } from "@fortune-sheet/react";
import { z } from "zod";
import { MAX_TAB_NAME_LENGTH } from "@/lib/constants";

// ============================================
// Helpers
// ============================================

const sanitizeTabName = (name: string) => {
  const trimmed = name.trim();
  return trimmed.length > MAX_TAB_NAME_LENGTH
    ? trimmed.slice(0, MAX_TAB_NAME_LENGTH)
    : trimmed;
};

const requireWorkbook = (): WorkbookInstance => {
  const workbook = fortuneSheetStore.getWorkbook();
  if (!workbook) {
    throw new Error(
      "Spreadsheet workbook is not ready. Wait for the spreadsheet to finish loading.",
    );
  }
  return workbook;
};

const detectNewSheet = (
  before: Set<string>,
  after: Array<{ id?: string | null }>,
) => {
  for (const sheet of after) {
    if (sheet.id && !before.has(sheet.id)) {
      return sheet;
    }
  }
  return after[after.length - 1];
};

// ============================================
// Tool implementations
// ============================================

const createTab = async (name?: string) => {
  try {
    const workbook = requireWorkbook();
    const existing =
      typeof workbook.getAllSheets === "function"
        ? workbook.getAllSheets()
        : [];
    const existingIds = new Set(
      existing
        .map((sheet) => sheet.id)
        .filter((id): id is string => Boolean(id)),
    );

    const desiredName =
      name && name.trim().length > 0
        ? sanitizeTabName(name)
        : `Sheet ${existing.length + 1}`;

    workbook.addSheet();

    const updated =
      typeof workbook.getAllSheets === "function"
        ? workbook.getAllSheets()
        : existing;
    if (updated.length === 0) {
      throw new Error("Unable to retrieve sheet list after creation.");
    }

    const newSheet = detectNewSheet(existingIds, updated);
    if (!newSheet?.id) {
      throw new Error("Unable to determine the newly created sheet.");
    }

    workbook.setSheetName(desiredName, { id: newSheet.id });
    workbook.activateSheet({ id: newSheet.id });

    return {
      success: true,
      tabId: newSheet.id,
      tabName: desiredName,
      message: `Switched to new sheet "${desiredName}" (${newSheet.id}).`,
    };
  } catch (error) {
    console.error("Error in createSpreadsheetTab:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

const getTabs = async () => {
  try {
    const workbook = requireWorkbook();
    const sheets =
      typeof workbook.getAllSheets === "function"
        ? workbook.getAllSheets()
        : [];

    if (sheets.length === 0) {
      return {
        success: true,
        tabs: [],
        message: "No sheets are available.",
      };
    }

    const active =
      (typeof workbook.getSheet === "function" && workbook.getSheet()) ??
      sheets.find((sheet) => sheet.status === 1) ??
      sheets[0];

    const tabs = sheets.map((sheet, index) => {
      const id = sheet.id ?? `sheet-${index + 1}`;
      return {
        id,
        name: sheet.name ?? `Sheet ${index + 1}`,
        isActive: active ? id === active.id : index === 0,
      };
    });

    const activeTab = tabs.find((tab) => tab.isActive) ?? tabs[0];

    return {
      success: true,
      tabs,
      activeTabId: activeTab?.id,
      activeTabName: activeTab?.name,
      message: activeTab
        ? `Current sheet is "${activeTab.name}" (${activeTab.id}).`
        : "Unable to determine the active sheet.",
    };
  } catch (error) {
    console.error("Error in getSpreadsheetTabs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// ============================================
// Tool metadata
// ============================================

export const createTabTool = {
  name: "createSpreadsheetTab",
  description:
    "Create a new spreadsheet tab. Optionally provide a name for the tab. The new tab becomes active automatically.",
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

export const getTabsTool = {
  name: "getSpreadsheetTabs",
  description: "List all spreadsheet tabs and indicate which one is active.",
  tool: getTabs,
  toolSchema: z
    .function()
    .args()
    .returns(
      z.object({
        success: z.boolean(),
        tabs: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              isActive: z.boolean(),
            }),
          )
          .optional(),
        activeTabId: z.string().optional(),
        activeTabName: z.string().optional(),
        message: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
};

export const tabTools = [createTabTool, getTabsTool];
