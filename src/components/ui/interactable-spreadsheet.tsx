"use client";

import { useFortuneSheet } from "@/lib/fortune-sheet-store";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useEffect, useRef } from "react";
import { interactableSpreadsheetPropsSchema } from "@/schemas/spreadsheet-schemas";
import {
  buildCelldataLookup,
  getSheetColumnCount,
  getSheetRowCount,
} from "@/lib/fortune-sheet-utils";

// ============================================
// Types
// ============================================

type InteractableSpreadsheetProps = {
  className?: string;
  state?: {
    sheetId: string;
    name: string;
    rowCount: number;
    columnCount: number;
    celldata: Array<{ r: number; c: number; v: unknown }>;
  } | null;
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
};

// ============================================
// Interactable Wrapper Component
// ============================================

function SpreadsheetInteractableWrapper(
  props: InteractableSpreadsheetProps,
) {
  const { className, onPropsUpdate, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();
  const { sheets, activeSheetId } = useFortuneSheet();

  const lastEmittedKeyRef = useRef("");
  const onPropsUpdateRef = useRef(onPropsUpdate);
  const interactableComponentsRef = useRef(interactableComponents);

  // Keep refs up to date
  useEffect(() => {
    onPropsUpdateRef.current = onPropsUpdate;
    interactableComponentsRef.current = interactableComponents;
  });

  // ============================================
  // INBOUND: Read-only - AI cannot update via this interactable
  // Use tools for mutations instead
  // ============================================
  // (No inbound logic needed)

  const activeSheet =
    sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0];

  const snapshot = (() => {
    if (!activeSheet || !activeSheet.id) {
      return null;
    }
    const rowCount = getSheetRowCount(activeSheet);
    const columnCount = getSheetColumnCount(activeSheet);
    const lookup = buildCelldataLookup(activeSheet);
    const cells: Array<{ r: number; c: number; v: unknown }> = [];
    lookup.forEach((value, key) => {
      const [row, col] = key.split(":").map((part) => Number(part));
      cells.push({ r: row, c: col, v: value });
    });
    return {
      sheetId: activeSheet.id,
      name: activeSheet.name,
      rowCount,
      columnCount,
      celldata: cells,
    };
  })();

  useEffect(() => {
    if (snapshot === null) {
      const key = JSON.stringify({ state: null, className });
      if (key === lastEmittedKeyRef.current) {
        return;
      }
      lastEmittedKeyRef.current = key;
      onPropsUpdateRef.current?.({ state: null, className });
      if (interactableId) {
        const match = interactableComponentsRef.current.find(
          (c) => c.props?.interactableId === interactableId,
        );
        if (match) {
          updateInteractableComponentProps(match.id, {
            state: null,
            className,
          });
        }
      }
      return;
    }

    const payload = { state: snapshot, className };
    const key = JSON.stringify(payload);
    if (key === lastEmittedKeyRef.current) {
      return;
    }
    lastEmittedKeyRef.current = key;
    onPropsUpdateRef.current?.(payload);

    if (interactableId) {
      const match = interactableComponentsRef.current.find(
        (c) => c.props?.interactableId === interactableId,
      );
      if (match) {
        updateInteractableComponentProps(match.id, payload);
      }
    }
  }, [snapshot, className, interactableId, updateInteractableComponentProps]);

  // No visual UI required; this is just the data bridge
  return <div className={className} aria-hidden />;
}

// ============================================
// Export with withInteractable HOC
// ============================================

export const InteractableSpreadsheet = withInteractable(
  SpreadsheetInteractableWrapper,
  {
    componentName: "SpreadsheetState",
    description:
      "Current active spreadsheet tab data (read-only context). Shows rows, columns, and cell values. Cell types: 'header' (text), 'text' (text), 'number' (value, format). Column headers (A, B, C) and row numbers (1, 2, 3) are in first row/column. Use spreadsheet tools to modify data - this component is for context only.",
    propsSchema: interactableSpreadsheetPropsSchema,
  },
);
