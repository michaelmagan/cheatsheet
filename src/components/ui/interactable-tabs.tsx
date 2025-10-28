"use client";

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
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

    const store = useSpreadsheetTabsStore.getState();

    // Process tabs: create new ones or update existing ones
    if (state.tabs) {
      state.tabs.forEach((aiTab) => {
        const existingTab = store.tabs.find((t) => t.id === aiTab.id);
        if (existingTab) {
          // Update existing tab name if changed
          if (existingTab.name !== aiTab.name) {
            store.updateTab(aiTab.id, { name: aiTab.name });
          }
        } else {
          // Create new tab if it doesn't exist
          store.createTab(aiTab.name);
        }
      });
    }

    // Set active tab if specified
    if (state.activeTabId !== undefined && state.activeTabId !== store.activeTabId) {
      store.setActiveTab(state.activeTabId);
    }
  }, [state]);

  // ============================================
  // OUTBOUND: Publish tab metadata to AI
  // ============================================
  const publishState = useCallback(() => {
    try {
      const store = useSpreadsheetTabsStore.getState();

      if (!store || !Array.isArray(store.tabs)) {
        return;
      }

      const payload = {
        tabs: store.tabs.map((tab) => ({
          id: tab.id,
          name: tab.name,
        })),
        activeTabId: store.activeTabId,
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
  }, [interactableId, updateInteractableComponentProps]);

  useEffect(() => {
    const unsubscribe = useSpreadsheetTabsStore.subscribe(publishState);
    return () => unsubscribe();
  }, [publishState]);

  // ============================================
  // Initial publish
  // ============================================
  useEffect(() => {
    // Delay initial publish to ensure store is ready
    const timer = setTimeout(() => {
      publishState();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
