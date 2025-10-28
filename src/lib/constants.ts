/**
 * @file constants.ts
 * @description Shared constants used across the application
 */

// ============================================
// Spreadsheet Limits
// ============================================

/** Maximum number of columns allowed in a spreadsheet */
export const MAX_SPREADSHEET_COLUMNS = 100;

/** Maximum number of rows allowed in a spreadsheet */
export const MAX_SPREADSHEET_ROWS = 1000;

/** Default number of columns in a new spreadsheet tab */
export const DEFAULT_SPREADSHEET_COLUMNS = 5;

/** Default number of rows in a new spreadsheet tab */
export const DEFAULT_SPREADSHEET_ROWS = 20;

/** Default column width in pixels */
export const DEFAULT_COLUMN_WIDTH = 150;

/** Row header column width in pixels */
export const ROW_HEADER_WIDTH = 50;

// ============================================
// Input Validation
// ============================================

/** Maximum length for text input in cells */
export const MAX_TEXT_LENGTH = 1000;

/** Maximum length for tab names */
export const MAX_TAB_NAME_LENGTH = 100;

// ============================================
// UI Timeouts
// ============================================

/** Timeout duration for pending delete confirmation (milliseconds) */
export const DELETE_CONFIRMATION_TIMEOUT = 10000;

/** Timeout duration for deduplication operations (milliseconds) */
export const DEDUPLICATION_TIMEOUT = 100;

// ============================================
// DnD (Drag and Drop)
// ============================================

/** Minimum distance in pixels before drag is activated */
export const DND_ACTIVATION_DISTANCE = 8;
