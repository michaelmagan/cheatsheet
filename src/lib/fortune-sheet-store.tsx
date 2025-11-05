"use client";

import * as React from "react";
import type {
  Cell,
  CellWithRowAndCol,
  Op,
  Sheet,
} from "@fortune-sheet/core";
import type { WorkbookInstance } from "@fortune-sheet/react";

type FortuneSheetInternalState = {
  sheets: Sheet[];
  activeSheetId: string | null;
  workbook: WorkbookInstance | null;
  lastOps: Op[];
};

type FortuneSheetContextValue = {
  sheets: Sheet[];
  activeSheetId: string | null;
  workbook: WorkbookInstance | null;
  lastOps: Op[];
  setSheets: React.Dispatch<React.SetStateAction<Sheet[]>>;
  replaceSheets: (sheets: Sheet[]) => void;
  setActiveSheet: (sheetId: string) => void;
  registerWorkbook: (instance: WorkbookInstance | null) => void;
  setLastOps: (ops: Op[]) => void;
};

function generateSheetId(index: number): string {
  return `sheet-${index + 1}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMaxCoordinate(
  cells: CellWithRowAndCol[],
  key: "r" | "c",
): number {
  let max = -1;
  for (const cell of cells) {
    const value = typeof cell[key] === "number" ? cell[key] : -1;
    if (value > max) {
      max = value;
    }
  }
  return max;
}

const DEFAULT_ROW_HEIGHT = 19;
const DEFAULT_COLUMN_WIDTH = 73;
const DEFAULT_ZOOM_RATIO = 1;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sanitizePositiveNumber(value: unknown, fallback: number): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric <= 0) {
    return fallback;
  }
  return numeric;
}

function sanitizeZoomRatio(value: unknown): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric <= 0) {
    return DEFAULT_ZOOM_RATIO;
  }
  return numeric;
}

function sanitizeDimensionRecord(
  record: Record<string, unknown> | undefined,
): Record<string, number> | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }

  const sanitized: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    const numeric = toFiniteNumber(raw);
    if (numeric !== null && numeric > 0) {
      sanitized[key] = numeric;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeSheetMetadata(sheet: Sheet): Sheet {
  const defaultRowHeight = sanitizePositiveNumber(
    (sheet as { defaultRowHeight?: unknown }).defaultRowHeight,
    DEFAULT_ROW_HEIGHT,
  );
  const defaultColWidth = sanitizePositiveNumber(
    (sheet as { defaultColWidth?: unknown }).defaultColWidth,
    DEFAULT_COLUMN_WIDTH,
  );
  const zoomRatio = sanitizeZoomRatio(
    (sheet as { zoomRatio?: unknown }).zoomRatio,
  );

  const rawConfig =
    sheet.config && typeof sheet.config === "object" ? { ...sheet.config } : {};
  const columnlen = sanitizeDimensionRecord(
    (rawConfig as Record<string, unknown>).columnlen as
      | Record<string, unknown>
      | undefined,
  );
  const rowlen = sanitizeDimensionRecord(
    (rawConfig as Record<string, unknown>).rowlen as
      | Record<string, unknown>
      | undefined,
  );

  if (columnlen) {
    (rawConfig as Record<string, unknown>).columnlen = columnlen;
  } else {
    delete (rawConfig as Record<string, unknown>).columnlen;
  }

  if (rowlen) {
    (rawConfig as Record<string, unknown>).rowlen = rowlen;
  } else {
    delete (rawConfig as Record<string, unknown>).rowlen;
  }

  return {
    ...sheet,
    defaultRowHeight,
    defaultColWidth,
    zoomRatio,
    config: rawConfig as Sheet["config"],
  };
}

export function normalizeSheetForFortuneSheet(sheet: Sheet): Sheet {
  const sanitizedSheet = sanitizeSheetMetadata(sheet);
  const celldata = Array.isArray(sanitizedSheet.celldata)
    ? (sanitizedSheet.celldata as CellWithRowAndCol[])
    : [];
  const existingData = Array.isArray(sanitizedSheet.data)
    ? sanitizedSheet.data
    : [];

  const dataRowCount = existingData.length;
  let dataColumnCount = 0;
  for (const row of existingData) {
    if (Array.isArray(row) && row.length > dataColumnCount) {
      dataColumnCount = row.length;
    }
  }

  const celldataRowCount =
    celldata.length > 0 ? getMaxCoordinate(celldata, "r") + 1 : 0;
  const celldataColumnCount =
    celldata.length > 0 ? getMaxCoordinate(celldata, "c") + 1 : 0;

  const declaredRowCount =
    typeof sanitizedSheet.row === "number" &&
    Number.isFinite(sanitizedSheet.row) &&
    sanitizedSheet.row > 0
      ? sanitizedSheet.row
      : 0;
  const declaredColumnCount =
    typeof sanitizedSheet.column === "number" &&
    Number.isFinite(sanitizedSheet.column) &&
    sanitizedSheet.column > 0
      ? sanitizedSheet.column
      : 0;

  const targetRowCount = Math.max(
    declaredRowCount,
    dataRowCount,
    celldataRowCount,
    1,
  );
  const targetColumnCount = Math.max(
    declaredColumnCount,
    dataColumnCount,
    celldataColumnCount,
    1,
  );

  const normalizedData = Array.from({ length: targetRowCount }, (_, rowIndex) => {
    const sourceRow = Array.isArray(existingData[rowIndex])
      ? existingData[rowIndex]!
      : [];
    return Array.from({ length: targetColumnCount }, (_, columnIndex) => {
      if (Array.isArray(sourceRow) && columnIndex < sourceRow.length) {
        return sourceRow[columnIndex] ?? null;
      }
      return null;
    });
  });

  for (const cell of celldata) {
    const rowIndex =
      typeof cell.r === "number" && cell.r >= 0 ? cell.r : Number.NaN;
    const columnIndex =
      typeof cell.c === "number" && cell.c >= 0 ? cell.c : Number.NaN;
    if (
      Number.isInteger(rowIndex) &&
      Number.isInteger(columnIndex) &&
      rowIndex < targetRowCount &&
      columnIndex < targetColumnCount
    ) {
      normalizedData[rowIndex][columnIndex] =
        (cell.v as Cell | null | undefined) ?? null;
    }
  }

  return {
    ...sanitizedSheet,
    row: targetRowCount,
    column: targetColumnCount,
    data: normalizedData,
  };
}

function ensureSheetGrid(sheet: Sheet): Sheet {
  return normalizeSheetForFortuneSheet(sheet);
}

function recordHasInvalidDimensions(record: Record<string, unknown> | undefined) {
  if (!record || typeof record !== "object") {
    return false;
  }
  for (const value of Object.values(record)) {
    const numeric = toFiniteNumber(value);
    if (numeric === null || numeric <= 0) {
      return true;
    }
  }
  return false;
}

export function sheetHasInvalidMetrics(sheet: Sheet): boolean {
  const zoom = (sheet as { zoomRatio?: unknown }).zoomRatio;
  if (zoom !== undefined && zoom !== null) {
    const numeric = toFiniteNumber(zoom);
    if (numeric === null || sanitizeZoomRatio(zoom) !== zoom) {
      return true;
    }
  }

  const defaultRowHeight = (sheet as { defaultRowHeight?: unknown }).defaultRowHeight;
  if (defaultRowHeight !== undefined && defaultRowHeight !== null) {
    if (sanitizePositiveNumber(defaultRowHeight, DEFAULT_ROW_HEIGHT) !== defaultRowHeight) {
      return true;
    }
  }

  const defaultColWidth = (sheet as { defaultColWidth?: unknown }).defaultColWidth;
  if (defaultColWidth !== undefined && defaultColWidth !== null) {
    if (sanitizePositiveNumber(defaultColWidth, DEFAULT_COLUMN_WIDTH) !== defaultColWidth) {
      return true;
    }
  }

  const config = sheet.config && typeof sheet.config === "object" ? sheet.config : undefined;
  if (!config) {
    return false;
  }

  const columnlen = (config as { columnlen?: Record<string, unknown> }).columnlen;
  if (recordHasInvalidDimensions(columnlen)) {
    return true;
  }

  const rowlen = (config as { rowlen?: Record<string, unknown> }).rowlen;
  if (recordHasInvalidDimensions(rowlen)) {
    return true;
  }

  return false;
}

export function createBlankSheet(
  name: string,
  order: number,
  options?: { isActive?: boolean }
): Sheet {
  const baseSheet: Sheet = {
    id: generateSheetId(order),
    name,
    status: options?.isActive ? 1 : 0,
    order,
    row: 36,
    column: 18,
    hide: 0,
    showGridLines: 1,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    defaultColWidth: DEFAULT_COLUMN_WIDTH,
    config: {},
    celldata: [],
  };
  return ensureSheetGrid(baseSheet);
}

const DEFAULT_SHEETS: Sheet[] = [
  ensureSheetGrid({
    id: "sheet-1",
    name: "Sheet1",
    status: 1,
    order: 0,
    row: 36,
    column: 18,
    hide: 0,
    showGridLines: 1,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    defaultColWidth: DEFAULT_COLUMN_WIDTH,
    config: {},
    celldata: [],
  }),
];

function cloneSheet(sheet: Sheet, index: number): Sheet {
  const id = sheet.id ?? generateSheetId(index);
  const normalized = ensureSheetGrid(sheet);
  return {
    ...normalized,
    id,
    order: normalized.order ?? index,
    status: normalized.status ?? (index === 0 ? 1 : 0),
  };
}

function deriveActiveSheetId(sheets: Sheet[]): string | null {
  const active = sheets.find((sheet) => sheet.status === 1);
  if (active?.id) {
    return active.id;
  }
  return sheets.length > 0 ? sheets[0]?.id ?? null : null;
}

const listeners = new Set<() => void>();

const scheduleMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (callback: () => void) => Promise.resolve().then(callback);

let notifyPending = false;

let state: FortuneSheetInternalState = {
  sheets: DEFAULT_SHEETS.map(cloneSheet),
  activeSheetId: deriveActiveSheetId(DEFAULT_SHEETS),
  workbook: null,
  lastOps: [],
};

function notify() {
  if (notifyPending) {
    return;
  }
  notifyPending = true;
  scheduleMicrotask(() => {
    notifyPending = false;
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Error in fortuneSheetStore listener:", error);
      }
    });
  });
}

function normalizeSheets(nextSheets: Sheet[]): Sheet[] {
  return nextSheets.map((sheet, index) => cloneSheet(sheet, index));
}

function setSheetsInternal(nextSheets: Sheet[]) {
  const normalized = normalizeSheets(nextSheets);
  state = {
    ...state,
    sheets: normalized,
    activeSheetId: deriveActiveSheetId(normalized),
  };
  notify();
}

function setActiveSheetInternal(sheetId: string) {
  const nextSheets = state.sheets.map((sheet, index) => ({
    ...sheet,
    status: sheet.id === sheetId ? 1 : 0,
    order: index,
  }));
  state = {
    ...state,
    sheets: nextSheets,
    activeSheetId: deriveActiveSheetId(nextSheets),
  };
  notify();
}

function registerWorkbook(instance: WorkbookInstance | null) {
  if (state.workbook === instance) {
    return;
  }

  state = {
    ...state,
    workbook: instance,
  };
  notify();
}

function replaceSheetsInternal(sheets: Sheet[]) {
  setSheetsInternal(sheets);
}

function extractActiveSheetIdFromOps(ops: Op[]): string | null {
  for (const op of ops) {
    if (
      op.path.length === 1 &&
      op.path[0] === "currentSheetId" &&
      typeof op.value === "string"
    ) {
      return op.value;
    }
  }

  for (const op of ops) {
    if (
      op.path.length >= 3 &&
      op.path[0] === "sheets" &&
      typeof op.path[1] === "number" &&
      op.path[2] === "status" &&
      op.value === 1
    ) {
      const sheetIndex = op.path[1] as number;
      const targetSheet = state.sheets[sheetIndex];
      if (targetSheet?.id) {
        return targetSheet.id;
      }
    }
  }

  return null;
}

function setLastOpsInternal(ops: Op[]) {
  const nextActiveSheetId =
    extractActiveSheetIdFromOps(ops) ?? state.activeSheetId;

  state = {
    ...state,
    lastOps: ops,
    activeSheetId: nextActiveSheetId,
  };
  notify();
}

export const fortuneSheetStore = {
  getSnapshot(): FortuneSheetInternalState {
    return state;
  },
  getState(): FortuneSheetInternalState {
    return state;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setSheets(updater: React.SetStateAction<Sheet[]>) {
    const nextSheets =
      typeof updater === "function"
        ? (updater as (prev: Sheet[]) => Sheet[])(state.sheets)
        : updater;
    setSheetsInternal(nextSheets);
  },
  replaceSheets: replaceSheetsInternal,
  setActiveSheet: setActiveSheetInternal,
  setWorkbook: registerWorkbook,
  setLastOps: setLastOpsInternal,
  getWorkbook(): WorkbookInstance | null {
    return state.workbook;
  },
  getSheetById(sheetId: string): Sheet | undefined {
    return state.sheets.find((sheet) => sheet.id === sheetId);
  },
  getLastOps(): Op[] {
    return state.lastOps;
  },
};

const FortuneSheetContext = React.createContext<
  FortuneSheetContextValue | undefined
>(undefined);

export interface FortuneSheetProviderProps {
  initialSheets?: Sheet[];
  children: React.ReactNode;
}

export function FortuneSheetProvider({
  initialSheets = DEFAULT_SHEETS,
  children,
}: FortuneSheetProviderProps) {
  React.useEffect(() => {
    fortuneSheetStore.replaceSheets(initialSheets);
  }, [initialSheets]);

  const snapshot = React.useSyncExternalStore(
    fortuneSheetStore.subscribe,
    fortuneSheetStore.getSnapshot,
    fortuneSheetStore.getSnapshot
  );

  const value = React.useMemo<FortuneSheetContextValue>(
    () => ({
      sheets: snapshot.sheets,
      activeSheetId: snapshot.activeSheetId,
      workbook: snapshot.workbook,
      lastOps: snapshot.lastOps,
      setSheets: fortuneSheetStore.setSheets,
      replaceSheets: fortuneSheetStore.replaceSheets,
      setActiveSheet: fortuneSheetStore.setActiveSheet,
      registerWorkbook: fortuneSheetStore.setWorkbook,
      setLastOps: fortuneSheetStore.setLastOps,
    }),
    [snapshot]
  );

  return (
    <FortuneSheetContext.Provider value={value}>
      {children}
    </FortuneSheetContext.Provider>
  );
}

export function useFortuneSheet() {
  const ctx = React.useContext(FortuneSheetContext);
  if (!ctx) {
    throw new Error("useFortuneSheet must be used within a FortuneSheetProvider");
  }
  return ctx;
}
