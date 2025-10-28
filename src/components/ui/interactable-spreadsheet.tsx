"use client";

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useEffect, useRef } from "react";
import { interactableSpreadsheetPropsSchema } from "@/schemas/spreadsheet-schemas";

// ============================================
// Types
// ============================================

type InteractableSpreadsheetProps = {
  className?: string;
  state?: {
    tabId: string;
    name: string;
    rows: Array<{ rowId: string | number; cells: unknown[]; height?: number }>;
    columns: Array<{ columnId: string; width?: number; resizable?: boolean; reorderable?: boolean }>;
    editable: boolean;
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

  // ============================================
  // OUTBOUND: Publish active tab's spreadsheet state to AI
  // ============================================
  useEffect(() => {
    const handleStoreUpdate = (storeState: ReturnType<typeof useSpreadsheetTabsStore.getState>) => {
      const activeTab = storeState.tabs.find((t) => t.id === storeState.activeTabId);

      // If no active tab, send null
      const payload = activeTab
        ? {
            tabId: activeTab.id,
            name: activeTab.name,
            rows: activeTab.rows,
            columns: activeTab.columns,
            editable: activeTab.editable,
          }
        : null;

      const key = JSON.stringify(payload);
      if (key === lastEmittedKeyRef.current) return;
      lastEmittedKeyRef.current = key;

      onPropsUpdateRef.current?.({ state: payload, className });

      if (interactableId) {
        const match = interactableComponentsRef.current.find(
          (c) => c.props?.interactableId === interactableId,
        );
        if (match) {
          updateInteractableComponentProps(match.id, {
            state: payload,
            className,
          });
        }
      }
    };

    const unsubscribe = useSpreadsheetTabsStore.subscribe(handleStoreUpdate);
    return () => unsubscribe();
  }, [className, interactableId, updateInteractableComponentProps]);

  // ============================================
  // Initial publish
  // ============================================
  useEffect(() => {
    const storeState = useSpreadsheetTabsStore.getState();
    const activeTab = storeState.tabs.find((t) => t.id === storeState.activeTabId);

    const initial = activeTab
      ? {
          tabId: activeTab.id,
          name: activeTab.name,
          rows: activeTab.rows,
          columns: activeTab.columns,
          editable: activeTab.editable,
        }
      : null;

    const key = JSON.stringify(initial);
    lastEmittedKeyRef.current = key;
    onPropsUpdateRef.current?.({ state: initial, className });

    if (interactableId) {
      updateInteractableComponentProps(interactableId, {
        state: initial,
        className,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // Resolve runtime id and publish snapshot
  // ============================================
  useEffect(() => {
    if (!interactableId) return;
    const match = interactableComponentsRef.current.find(
      (c) => c.props?.interactableId === interactableId,
    );
    if (!match) return;

    const storeState = useSpreadsheetTabsStore.getState();
    const activeTab = storeState.tabs.find((t) => t.id === storeState.activeTabId);

    const snapshot = activeTab
      ? {
          tabId: activeTab.id,
          name: activeTab.name,
          rows: activeTab.rows,
          columns: activeTab.columns,
          editable: activeTab.editable,
        }
      : null;

    updateInteractableComponentProps(match.id, {
      state: snapshot,
      className,
    });
    lastEmittedKeyRef.current = JSON.stringify(snapshot);
  }, [interactableId, updateInteractableComponentProps, className]);

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
