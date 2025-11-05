/**
 * Shared Zod schemas for spreadsheet validation
 * Centralized schemas to eliminate duplication across components
 */

import { z } from "zod";

// ============================================
// FortuneSheet Cell Schema
// ============================================

export const fortuneCellSchema = z.object({
  r: z.number(),
  c: z.number(),
  v: z
    .object({
      v: z.any().optional(),
      m: z.any().optional(),
      f: z.string().optional(),
      ct: z.record(z.any()).optional(),
      bg: z.string().optional(),
    })
    .nullable()
    .optional(),
});

// ============================================
// FortuneSheet Sheet Schema
// ============================================

export const fortuneSheetStateSchema = z.object({
  sheetId: z.string().describe("Current sheet ID"),
  name: z.string().describe("Current sheet name"),
  rowCount: z.number().describe("Number of rows in the sheet"),
  columnCount: z.number().describe("Number of columns in the sheet"),
  celldata: z.array(fortuneCellSchema).describe("Sparse cell data"),
});

// ============================================
// Interactable Props Schema
// ============================================

export const interactableSpreadsheetPropsSchema = z.object({
  className: z.string().optional(),
  state: fortuneSheetStateSchema.nullable().optional(),
});
