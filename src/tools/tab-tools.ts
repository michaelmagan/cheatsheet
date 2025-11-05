"use client";

/**
 * @file tab-tools.ts
 * @description Tools for AI to manage spreadsheet tabs
 */

import {
  createBlankSheet,
  fortuneSheetStore,
} from "@/lib/fortune-sheet-store";
import type { WorkbookInstance } from "@fortune-sheet/react";
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

function ensureWorkbook(): WorkbookInstance {
  const workbook = fortuneSheetStore.getWorkbook();
  if (!workbook) {
    throw new Error(
      "Spreadsheet workbook is not ready. Make sure the spreadsheet UI has finished mounting before creating tabs.",
    );
  }
  return workbook;
}

async function waitForSheetInStore(
  sheetId: string,
  timeoutMs: number = 1500,
) {
  const initial = fortuneSheetStore
    .getState()
    .sheets.find((sheet) => sheet.id === sheetId);
  if (initial) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for new sheet to register in store."));
    }, timeoutMs);

    const unsubscribe = fortuneSheetStore.subscribe(() => {
      const { sheets } = fortuneSheetStore.getState();
      if (sheets.some((sheet) => sheet.id === sheetId)) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });
}

// ============================================
// Tool Functions
// ============================================

const createTab = async (name?: string) => {
  try {
    const workbook = ensureWorkbook();
    const { sheets } = fortuneSheetStore.getState();
    const sanitizedName = name ? sanitizeTabName(name) : undefined;
    const nextName =
      sanitizedName && sanitizedName.length > 0
        ? sanitizedName
        : `Sheet ${sheets.length + 1}`;

    const existingIds = new Set(
      sheets.map((sheet) => sheet.id).filter((id): id is string => Boolean(id)),
    );

    let candidateSheet = createBlankSheet(nextName, sheets.length, {
      isActive: true,
    });
    while (candidateSheet.id && existingIds.has(candidateSheet.id)) {
      candidateSheet = createBlankSheet(nextName, sheets.length, {
        isActive: true,
      });
    }

    const newSheetId = candidateSheet.id;
    if (!newSheetId) {
      throw new Error("Failed to generate a unique sheet identifier.");
    }

    workbook.addSheet(newSheetId);
    workbook.setSheetName(nextName, { id: newSheetId });
    workbook.activateSheet({ id: newSheetId });

    let didSyncUsingWorkbook = false;
    try {
      await waitForSheetInStore(newSheetId);
      didSyncUsingWorkbook = true;
    } catch (waitError) {
      console.warn(
        "createTab: Sheet did not appear in store in time, synchronizing manually.",
        waitError,
      );
      const workbookSheets =
        typeof workbook.getAllSheets === "function"
          ? workbook.getAllSheets()
          : null;
      if (workbookSheets && workbookSheets.length > 0) {
        fortuneSheetStore.replaceSheets(workbookSheets);
        didSyncUsingWorkbook = true;
      }
    }

    if (!didSyncUsingWorkbook) {
      fortuneSheetStore.setSheets((prev) => {
        const cleared = prev.map((sheet) => ({
          ...sheet,
          status: sheet.id === newSheetId ? 1 : 0,
        }));
        const alreadyExists = cleared.some((sheet) => sheet.id === newSheetId);
        if (alreadyExists) {
          return cleared;
        }
        return [...cleared, candidateSheet];
      });
    }

    const stateAfterCreation = fortuneSheetStore.getState();
    const createdSheet =
      stateAfterCreation.sheets.find((sheet) => sheet.id === newSheetId) ??
      candidateSheet;

    if (stateAfterCreation.activeSheetId !== newSheetId) {
      fortuneSheetStore.setActiveSheet(newSheetId);
    }

    if (!createdSheet?.id) {
      throw new Error("Unable to determine newly created sheet.");
    }

    return {
      success: true,
      tabId: createdSheet.id,
      tabName: createdSheet.name,
      message: `Created new sheet "${createdSheet.name}" with ID ${createdSheet.id}. The sheet is now active.`,
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
