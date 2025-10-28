/**
 * Shared Zod schemas for spreadsheet validation
 * Centralized schemas to eliminate duplication across components
 */

import { z } from "zod";

// ============================================
// Cell Schemas
// ============================================

export const headerCellSchema = z.object({
  type: z.literal("header"),
  text: z.string(),
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

export const textCellSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

export const numberCellSchema = z.object({
  type: z.literal("number"),
  value: z.number(),
  format: z.string().optional(), // e.g., "$0,0.00" or "0.00%"
  nonEditable: z.boolean().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

export const cellSchema = z.union([
  headerCellSchema,
  textCellSchema,
  numberCellSchema,
]);

// ============================================
// Row and Column Schemas
// ============================================

export const rowSchema = z.object({
  rowId: z.union([z.string(), z.number()]),
  cells: z.array(cellSchema),
  height: z.number().optional(),
});

export const columnSchema = z.object({
  columnId: z.string(),
  width: z.number().optional(),
  resizable: z.boolean().optional(),
  reorderable: z.boolean().optional(),
});

// ============================================
// Tab Schema
// ============================================

export const spreadsheetTabSchema = z.object({
  id: z.string(),
  name: z.string(),
  rows: z.array(rowSchema),
  columns: z.array(columnSchema),
  editable: z.boolean(),
});

// ============================================
// Component Props Schemas
// ============================================

export const spreadsheetPropsSchema = z.object({
  title: z.string().optional().describe("Title displayed above the spreadsheet"),
  columns: z.array(columnSchema).describe("Column definitions"),
  rows: z.array(rowSchema).describe("Row data with cells"),
  editable: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether cells can be edited"),
});

export const spreadsheetStateSchema = z.object({
  tabId: z.string().describe("Current tab ID"),
  name: z.string().describe("Current tab name"),
  rows: z.array(rowSchema).describe("All rows with cell data"),
  columns: z.array(columnSchema).describe("Column definitions"),
  editable: z.boolean().describe("Whether cells can be edited"),
});

export const interactableSpreadsheetPropsSchema = z.object({
  className: z.string().optional(),
  state: spreadsheetStateSchema.nullable().optional(),
});
