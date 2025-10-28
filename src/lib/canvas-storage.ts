/**
 * canvas-storage.ts
 * Central library for canvas storage operations and data types
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateId } from "@/lib/id-generator";
import { DEDUPLICATION_TIMEOUT } from "@/lib/constants";

// Canvas data model types
export interface CanvasComponent {
  componentId: string;
  _componentType: string;
  _inCanvas?: boolean;
  canvasId?: string;
  [key: string]: unknown;
}

export interface Canvas {
  id: string;
  name: string;
  components: CanvasComponent[];
}

export interface CanvasState {
  canvases: Canvas[];
  activeCanvasId: string | null;
  pendingOperations: Set<string>;
  // Actions
  getCanvases: () => Canvas[];
  getCanvas: (id: string) => Canvas | undefined;
  getComponents: (canvasId: string) => CanvasComponent[];
  createCanvas: (name?: string) => Canvas;
  updateCanvas: (id: string, name: string) => Canvas | null;
  removeCanvas: (id: string) => void;
  setActiveCanvas: (id: string | null) => void;
  reorderCanvas: (canvasId: string, newIndex: number) => void;
  clearCanvas: (id: string) => void;
  addComponent: (canvasId: string, component: CanvasComponent) => void;
  updateComponent: (
    canvasId: string,
    componentId: string,
    props: Record<string, unknown>,
  ) => CanvasComponent | null;
  removeComponent: (canvasId: string, componentId: string) => void;
  moveComponent: (
    sourceCanvasId: string,
    targetCanvasId: string,
    componentId: string,
  ) => CanvasComponent | null;
  reorderComponent: (
    canvasId: string,
    componentId: string,
    newIndex: number,
  ) => void;
}

// Create the store with persistence
export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      canvases: [],
      activeCanvasId: null,
      pendingOperations: new Set<string>(),

      // Get all canvases
      getCanvases: () => get().canvases,

      // Get a specific canvas by ID
      getCanvas: (id: string) => get().canvases.find((c) => c.id === id),

      // Get components for a specific canvas
      getComponents: (canvasId: string) => {
        const canvas = get().canvases.find((c) => c.id === canvasId);
        return canvas?.components || [];
      },

      // Create a new canvas
      createCanvas: (name?: string) => {
        const id = generateId();
        const canvases = get().canvases;
        const canvasName = name || `New Canvas ${canvases.length + 1}`;

        // Auto-create a spreadsheet component for the new canvas
        const spreadsheetId = generateId();
        const spreadsheetComponent: CanvasComponent = {
          componentId: spreadsheetId,
          _componentType: "Spreadsheet",
          _inCanvas: true,
          canvasId: id,
          title: canvasName,
          columns: [
            { columnId: "A", width: 150 },
            { columnId: "B", width: 150 },
            { columnId: "C", width: 150 },
            { columnId: "D", width: 150 },
            { columnId: "E", width: 150 },
          ],
          rows: [
            {
              rowId: 0,
              cells: [
                { type: "header", text: "Column A" },
                { type: "header", text: "Column B" },
                { type: "header", text: "Column C" },
                { type: "header", text: "Column D" },
                { type: "header", text: "Column E" },
              ],
            },
            {
              rowId: 1,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 2,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 3,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 4,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 5,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 6,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 7,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 8,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
            {
              rowId: 9,
              cells: [
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
                { type: "text", text: "" },
              ],
            },
          ],
          editable: true,
        };

        const newCanvas: Canvas = {
          id,
          name: canvasName,
          components: [spreadsheetComponent]
        };

        set((state) => ({
          canvases: [...state.canvases, newCanvas],
          activeCanvasId: id,
        }));

        return newCanvas;
      },

      // Update canvas name
      updateCanvas: (id: string, name: string) => {
        const updatedName = name.trim();
        if (!updatedName) return null;

        let updatedCanvas: Canvas | null = null;

        set((state) => {
          const updatedCanvases = state.canvases.map((c) => {
            if (c.id === id) {
              updatedCanvas = { ...c, name: updatedName };
              return updatedCanvas;
            }
            return c;
          });

          return { canvases: updatedCanvases };
        });

        return updatedCanvas;
      },

      // Remove a canvas
      removeCanvas: (id: string) => {
        set((state) => {
          const updatedCanvases = state.canvases.filter((c) => c.id !== id);
          let activeId = state.activeCanvasId;

          // If we're removing the active canvas, select another one
          if (activeId === id) {
            activeId = updatedCanvases[0]?.id || null;
          }

          return {
            canvases: updatedCanvases,
            activeCanvasId: activeId,
          };
        });
      },

      // Set the active canvas
      setActiveCanvas: (id: string | null) => {
        set({ activeCanvasId: id });
      },

      // Reorder canvases (tabs) by moving the specified canvasId to newIndex
      reorderCanvas: (canvasId: string, newIndex: number) => {
        set((state) => {
          const currentIndex = state.canvases.findIndex(
            (c) => c.id === canvasId,
          );
          if (currentIndex === -1) return state;

          const canvasesCopy = [...state.canvases];
          const [moving] = canvasesCopy.splice(currentIndex, 1);
          const boundedIndex = Math.max(
            0,
            Math.min(canvasesCopy.length, newIndex),
          );
          canvasesCopy.splice(boundedIndex, 0, moving);

          return { canvases: canvasesCopy };
        });
      },

      // Clear all components from a canvas
      clearCanvas: (id: string) => {
        set((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === id ? { ...c, components: [] } : c,
          ),
        }));
      },

      // Add a component to a canvas
      addComponent: (canvasId: string, componentProps: CanvasComponent) => {
        const componentId = componentProps.componentId || generateId();

        // Check for duplicate operations
        const operationKey = `add-${componentId}-${canvasId}`;
        const pendingOps = get().pendingOperations;

        if (pendingOps.has(operationKey)) {
          return;
        }

        // Mark operation as pending
        pendingOps.add(operationKey);
        set({ pendingOperations: new Set(pendingOps) });

        // Update state
        set((state) => {
          // Check if component already exists
          const targetCanvas = state.canvases.find((c) => c.id === canvasId);
          if (
            targetCanvas &&
            targetCanvas.components.some((c) => c.componentId === componentId)
          ) {
            // Remove operation from pending after timeout
            setTimeout(() => {
              const ops = get().pendingOperations;
              ops.delete(operationKey);
              set({ pendingOperations: new Set(ops) });
            }, DEDUPLICATION_TIMEOUT);
            return state;
          }

          const updatedCanvases = state.canvases.map((c) =>
            c.id === canvasId
              ? {
                  ...c,
                  components: [
                    ...c.components,
                    {
                      ...componentProps,
                      componentId,
                      _inCanvas: true,
                      canvasId,
                    },
                  ],
                }
              : c,
          );

          // Remove operation from pending after timeout
          setTimeout(() => {
            const ops = get().pendingOperations;
            ops.delete(operationKey);
            set({ pendingOperations: new Set(ops) });
          }, DEDUPLICATION_TIMEOUT);

          return { canvases: updatedCanvases };
        });
      },

      // Update a component's props
      updateComponent: (
        canvasId: string,
        componentId: string,
        props: Record<string, unknown>,
      ) => {
        let updatedComponent: CanvasComponent | null = null;

        set((state) => {
          const updatedCanvases = state.canvases.map((c) => {
            if (c.id !== canvasId) return c;

            const updatedComponents = c.components.map((comp) => {
              if (comp.componentId !== componentId) return comp;

              updatedComponent = { ...comp, ...props };
              return updatedComponent;
            });

            return { ...c, components: updatedComponents };
          });

          return { canvases: updatedCanvases };
        });

        return updatedComponent;
      },

      // Remove a component from a canvas
      removeComponent: (canvasId: string, componentId: string) => {
        set((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === canvasId
              ? {
                  ...c,
                  components: c.components.filter(
                    (comp) => comp.componentId !== componentId,
                  ),
                }
              : c,
          ),
        }));
      },

      // Move a component from one canvas to another
      moveComponent: (
        sourceCanvasId: string,
        targetCanvasId: string,
        componentId: string,
      ) => {
        // Skip if source and target are the same
        if (sourceCanvasId === targetCanvasId) return null;

        const operationKey = `move-${componentId}-${sourceCanvasId}-${targetCanvasId}`;
        const pendingOps = get().pendingOperations;

        if (pendingOps.has(operationKey)) {
          return null;
        }

        // Mark operation as pending
        pendingOps.add(operationKey);
        set({ pendingOperations: new Set(pendingOps) });

        let movedComponent: CanvasComponent | null = null;

        set((state) => {
          // Find component in source canvas
          const sourceCanvas = state.canvases.find(
            (c) => c.id === sourceCanvasId,
          );
          if (!sourceCanvas) return state;

          const component = sourceCanvas.components.find(
            (c) => c.componentId === componentId,
          );
          if (!component) return state;

          // Check if component already exists in target
          const targetCanvas = state.canvases.find(
            (c) => c.id === targetCanvasId,
          );
          if (
            targetCanvas &&
            targetCanvas.components.some((c) => c.componentId === componentId)
          ) {
            return state;
          }

          // Create updated component
          movedComponent = {
            ...component,
            canvasId: targetCanvasId,
          };

          // Remove from source and add to target
          const updatedCanvases = state.canvases.map((c) => {
            if (c.id === sourceCanvasId) {
              return {
                ...c,
                components: c.components.filter(
                  (comp) => comp.componentId !== componentId,
                ),
              };
            }
            if (c.id === targetCanvasId) {
              return {
                ...c,
                components: [...c.components, movedComponent!],
              };
            }
            return c;
          });

          // Remove operation from pending after timeout
          setTimeout(() => {
            const ops = get().pendingOperations;
            ops.delete(operationKey);
            set({ pendingOperations: new Set(ops) });
          }, DEDUPLICATION_TIMEOUT);

          return { canvases: updatedCanvases };
        });

        return movedComponent;
      },

      // Reorder a component within a canvas
      reorderComponent: (
        canvasId: string,
        componentId: string,
        newIndex: number,
      ) => {
        set((state) => {
          const updatedCanvases = state.canvases.map((c) => {
            if (c.id !== canvasId) return c;

            // Find the component
            const componentIndex = c.components.findIndex(
              (comp) => comp.componentId === componentId,
            );
            if (componentIndex === -1) return c;

            // Create a new components array
            const newComponents = [...c.components];

            // Remove component from current position
            const [component] = newComponents.splice(componentIndex, 1);

            // Clamp newIndex to array bounds
            const boundedIndex = Math.max(
              0,
              Math.min(newComponents.length, newIndex),
            );

            // Insert at new position
            newComponents.splice(boundedIndex, 0, component);

            return {
              ...c,
              components: newComponents,
            };
          });

          return { canvases: updatedCanvases };
        });
      },
    }),
    {
      name: "tambo-canvas-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        canvases: state.canvases,
        activeCanvasId: state.activeCanvasId,
      }),
    },
  ),
);
