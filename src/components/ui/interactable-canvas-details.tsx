"use client";

import { useCanvasStore } from "@/lib/canvas-storage";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

// Interactable that exposes/edit charts of the active canvas only

const chartSchema = z.object({
  id: z.string().describe("Canvas component id (Graph only)"),
  title: z.string().describe("Chart title"),
  type: z.enum(["bar", "line", "pie"]).describe("Chart type"),
});

const canvasDetailsPropsSchema = z.object({
  className: z.string().optional(),
  state: z
    .object({
      charts: z
        .array(chartSchema)
        .describe(
          "Active canvas charts in desired order (Graph components only)",
        ),
    })
    .optional(),
});

type CanvasDetailsProps = z.infer<typeof canvasDetailsPropsSchema> & {
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
};

function CanvasDetailsWrapper(props: CanvasDetailsProps) {
  const { className, state, onPropsUpdate, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();

  const applyingRef = useRef(false);
  const lastEmittedKeyRef = useRef("");
  const onPropsUpdateRef = useRef(onPropsUpdate);
  const interactableComponentsRef = useRef(interactableComponents);

  // Keep refs up to date
  useEffect(() => {
    onPropsUpdateRef.current = onPropsUpdate;
    interactableComponentsRef.current = interactableComponents;
  });

  // Inbound: apply edits to active canvas
  useEffect(() => {
    if (!state) return;
    applyingRef.current = true;
    const s = useCanvasStore.getState();
    const activeId = s.activeCanvasId;
    if (!activeId) {
      applyingRef.current = false;
      return;
    }
    const shards = state.charts ?? [];

    // Reorder based on provided order and update title/type
    // Build a map for quick lookup
    const idToIndex: Record<string, number> = {};
    shards.forEach((c, idx) => (idToIndex[c.id] = idx));

    // Apply updates
    shards.forEach((c) => {
      const current = useCanvasStore
        .getState()
        .getComponents(activeId)
        .find((x) => x.componentId === c.id) as
        | (Record<string, unknown> & { data?: Record<string, unknown> })
        | undefined;

      useCanvasStore.getState().updateComponent(activeId, c.id, {
        title: c.title,
        data: {
          ...(typeof current?.data === "object" && current?.data
            ? (current.data as Record<string, unknown>)
            : {}),
          type: c.type,
          // Keep title in data as well for backward compatibility
          title: c.title,
        },
      });
    });

    // Reorder according to charts order using store helper for stability
    shards.forEach((c, targetIndex) => {
      useCanvasStore.getState().reorderComponent(activeId, c.id, targetIndex);
    });

    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }, [state]);

  // Outbound: publish simplified charts snapshot for active canvas
  const handleStoreUpdate = useCallback(
    (s: ReturnType<typeof useCanvasStore.getState>) => {
      if (applyingRef.current) return;
      const active = s.activeCanvasId
        ? s.canvases.find((c) => c.id === s.activeCanvasId)
        : undefined;
      const charts = (active?.components || [])
        .filter((c) => c._componentType === "Graph")
        .map((c) => ({
          id: c.componentId,
          title:
            (c as { title?: string }).title ??
            (c as { data?: { title?: string } }).data?.title ??
            "",
          type: ((c as { data?: { type?: string } }).data?.type ?? "bar") as
            | "bar"
            | "line"
            | "pie",
        }));
      const payload = { charts };
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
    },
    [className, interactableId, updateInteractableComponentProps],
  );

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(handleStoreUpdate);
    return () => unsubscribe();
  }, [handleStoreUpdate]);

  // Minimal UI (hidden content is fine; needs to be rendered for MCP)
  return (
    <div className={className} aria-hidden>
      {/* CanvasDetails interactable (no visible UI) */}
    </div>
  );
}

export const InteractableCanvasDetails = withInteractable(
  CanvasDetailsWrapper,
  {
    componentName: "CanvasDetails",
    description:
      "Active tab charts (Graph only). To edit charts, update 'state.charts' with desired order, titles, and types.",
    propsSchema: canvasDetailsPropsSchema,
  },
);
