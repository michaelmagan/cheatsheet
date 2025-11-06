"use client";

import { fortuneSheetStore } from "@/lib/fortune-sheet-store";

export const tabContextHelper = () => {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const workbook = fortuneSheetStore.getWorkbook();
    const workbookSheets =
      workbook && typeof workbook.getAllSheets === "function"
        ? workbook.getAllSheets()
        : null;
    const sheets =
      workbookSheets && workbookSheets.length > 0
        ? workbookSheets
        : fortuneSheetStore.getState().sheets;
    if (!sheets || sheets.length === 0) {
      return null;
    }

    const activeSheet =
      (workbook &&
        typeof workbook.getSheet === "function" &&
        workbook.getSheet()) ||
      sheets.find((sheet) => sheet.status === 1) ||
      sheets[0] ||
      null;

    const summary = sheets
      .map((sheet, index) => {
        const id = sheet.id ?? `sheet-${index + 1}`;
        const label = sheet.name ?? `Sheet ${index + 1}`;
        return activeSheet && id === activeSheet.id ? `${label} (active)` : label;
      })
      .join(", ");

    return `Tabs: ${summary}. Active tab: "${activeSheet?.name ?? "Unknown"}"${
      activeSheet?.id ? ` (ID: ${activeSheet.id})` : ""
    }.`;
  } catch (error) {
    console.error("Error in tabContextHelper:", error);
    return null;
  }
};
