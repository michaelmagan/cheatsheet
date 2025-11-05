"use client";

import {
  createBlankSheet,
  fortuneSheetStore,
  useFortuneSheet,
} from "@/lib/fortune-sheet-store";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

// ============================================
// Zod Schemas
// ============================================

const tabMetadataSchema = z.object({
  id: z.string().describe("Unique tab identifier"),
  name: z.string().describe("Display name of the tab"),
});

const tabsStateSchema = z.object({
  tabs: z.array(tabMetadataSchema).describe("All spreadsheet tabs (metadata only)"),
  activeTabId: z.string().nullable().describe("Currently active tab ID"),
});

const interactableTabsPropsSchema = z.object({
  state: tabsStateSchema.optional(),
});

type InteractableTabsProps = z.infer<typeof interactableTabsPropsSchema> & {
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
};

// ============================================
// Interactable Wrapper Component
// ============================================

function TabsInteractableWrapper(props: InteractableTabsProps) {
  const { state, onPropsUpdate, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();
  const { sheets, activeSheetId } = useFortuneSheet();
  const activeTabId = activeSheetId;

  const lastEmittedKeyRef = useRef("");
  const onPropsUpdateRef = useRef(onPropsUpdate);
  const interactableComponentsRef = useRef(interactableComponents);

  // Keep refs up to date
  useEffect(() => {
    onPropsUpdateRef.current = onPropsUpdate;
    interactableComponentsRef.current = interactableComponents;
  });

  // ============================================
  // INBOUND: AI updates tab metadata
  // ============================================
  useEffect(() => {
    if (!state) return;
    if (state.tabs && state.tabs.length > 0) {
      fortuneSheetStore.setSheets((prev) => {
        let didChange = false;
        const renamed = prev.map((sheet) => {
          const incoming = state.tabs?.find((t) => t.id === sheet.id);
          if (incoming && incoming.name && incoming.name !== sheet.name) {
            didChange = true;
            return {
              ...sheet,
              name: incoming.name,
            };
          }
          return sheet;
        });

        let result = renamed;
        const existingIds = new Set(result.map((sheet) => sheet.id));
        state.tabs.forEach((incoming) => {
          if (!incoming.id || existingIds.has(incoming.id)) {
            return;
          }
          didChange = true;
          if (result === renamed) {
            result = [...renamed];
          }
          const order = result.length;
          const newSheet = {
            ...createBlankSheet(
              incoming.name ?? `Sheet ${order + 1}`,
              order,
              { isActive: false }
            ),
            id: incoming.id,
          };
          result.push(newSheet);
          existingIds.add(incoming.id);
        });

        return didChange ? result : prev;
      });
    }

    if (
      state.activeTabId !== undefined &&
      state.activeTabId !== null &&
      state.activeTabId !== fortuneSheetStore.getState().activeSheetId
    ) {
      fortuneSheetStore.setActiveSheet(state.activeTabId);
    }
  }, [state]);

  // ============================================
  // OUTBOUND: Publish tab metadata to AI
  // ============================================
  const publishState = useCallback(() => {
    try {
      const payload = {
        tabs: sheets.map((sheet) => ({
          id: sheet.id ?? "",
          name: sheet.name,
        })),
        activeTabId,
      };

      const key = JSON.stringify(payload);
      if (key === lastEmittedKeyRef.current) return;
      lastEmittedKeyRef.current = key;

      onPropsUpdateRef.current?.({ state: payload });

      if (interactableId) {
        const match = interactableComponentsRef.current.find(
          (c) => c.props?.interactableId === interactableId,
        );
        if (match) {
          updateInteractableComponentProps(match.id, {
            state: payload,
          });
        }
      }
    } catch (error) {
      console.error("Error in publishState:", error);
    }
  }, [activeTabId, interactableId, sheets, updateInteractableComponentProps]);

  useEffect(() => {
    const unsubscribe = fortuneSheetStore.subscribe(publishState);
    publishState();
    return () => unsubscribe();
  }, [publishState]);

  return <div aria-hidden />;
}

// ============================================
// Export with withInteractable HOC
// ============================================

export const InteractableTabs = withInteractable(TabsInteractableWrapper, {
  componentName: "TabsState",
  description:
    "Spreadsheet tab metadata (names and IDs only, no data). Shows which tabs exist and which is active. Use tools to create/delete tabs or modify data.",
  propsSchema: interactableTabsPropsSchema,
});
