"use client";

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import type { Row, Selection } from "@/types/spreadsheet";
import { Spreadsheet } from "@/components/tambo/spreadsheet";
import { updateSpreadsheetSelection } from "@/lib/spreadsheet-selection-context";
import { cn } from "@/lib/utils";
import { DELETE_CONFIRMATION_TIMEOUT, DND_ACTIVATION_DISTANCE } from "@/lib/constants";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
  GripVerticalIcon,
} from "lucide-react";
import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Tab Item Component
const SortableTabItem: React.FC<{
  tab: { id: string; name: string };
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  isPendingDelete: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onEditingNameChange: (name: string) => void;
}> = ({
  tab,
  isActive,
  isEditing,
  editingName,
  isPendingDelete,
  canDelete,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onEditingNameChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      role="tab"
      aria-selected={isActive}
      aria-label={`${tab.name} tab`}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "group px-3 py-1.5 text-xs whitespace-nowrap flex items-center gap-1 rounded-t transition-all duration-150",
        isActive
          ? "bg-background text-foreground font-medium border border-b-0 border-border shadow-sm"
          : "text-muted-foreground/80 hover:text-foreground hover:bg-background/60 dark:hover:bg-background/40 border border-transparent hover:border-border/50",
        isDragging && "shadow-lg ring-2 ring-primary/20"
      )}
    >
      {isEditing ? (
        <>
          <input
            autoFocus
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveRename();
              if (e.key === "Escape") onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-b border-border/50 focus:outline-none text-xs w-24"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveRename();
            }}
            className="ml-1 p-0.5 hover:text-foreground"
            title="Save"
          >
            <CheckIcon className="h-3 w-3" />
          </button>
        </>
      ) : (
        <>
          <GripVerticalIcon className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" aria-hidden="true" />
          <span>{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent/50 rounded transition-all"
            title="Rename"
            aria-label="Rename tab"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          {canDelete &&
            (isPendingDelete ? (
              <div className="ml-1 flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/50 rounded text-xs text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                <span className="font-medium">Delete?</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmDelete();
                  }}
                  className="p-0.5 hover:text-red-900 dark:hover:text-red-100 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                  title="Confirm delete"
                  aria-label="Confirm delete"
                >
                  <CheckIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelDelete();
                  }}
                  className="p-0.5 hover:text-red-900 dark:hover:text-red-100 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                  title="Cancel delete"
                  aria-label="Cancel delete"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                title="Delete tab"
                aria-label="Delete tab"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            ))}
        </>
      )}
    </div>
  );
};

export const SpreadsheetTabs: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const {
    tabs,
    activeTabId,
    createTab,
    updateTab,
    removeTab,
    setActiveTab,
    addColumn,
    removeColumn,
    addRow,
    removeRow,
    reorderTab,
  } = useSpreadsheetTabsStore();

  const [isLoading, setIsLoading] = React.useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DND_ACTIVATION_DISTANCE,
      },
    })
  );

  const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
  const [pendingDeleteTabId, setPendingDeleteTabId] = React.useState<
    string | null
  >(null);
  const [editingName, setEditingName] = React.useState("");
  const deleteTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize default tab only if persistence is empty
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check immediately - Zustand persist middleware rehydrates synchronously
    const currentTabs = useSpreadsheetTabsStore.getState().tabs;
    const currentActiveId = useSpreadsheetTabsStore.getState().activeTabId;

    // Only create default tab if store is truly empty (never been persisted)
    if (currentTabs.length === 0) {
      createTab("Sheet 1");
    } else if (!currentActiveId && currentTabs.length > 0) {
      setActiveTab(currentTabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateTab = React.useCallback(() => {
    setIsLoading(true);
    createTab();
    setTimeout(() => setIsLoading(false), 300);
  }, [createTab]);

  const startRenameTab = React.useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (!tab) return;
      setEditingTabId(id);
      setEditingName(tab.name);
      setPendingDeleteTabId(null);
    },
    [tabs],
  );

  const saveRenameTab = React.useCallback(() => {
    if (!editingTabId) return;
    const name = editingName.trim();
    if (name) {
      updateTab(editingTabId, { name });
    }
    setEditingTabId(null);
  }, [editingTabId, editingName, updateTab]);

  const handleDeleteTab = React.useCallback(
    (id: string, confirmed = false) => {
      if (confirmed) {
        removeTab(id);
        setPendingDeleteTabId(null);
        // Clear any pending timeout
        if (deleteTimeoutRef.current) {
          clearTimeout(deleteTimeoutRef.current);
          deleteTimeoutRef.current = null;
        }
      } else {
        setPendingDeleteTabId(id);
        // Clear any existing timeout
        if (deleteTimeoutRef.current) {
          clearTimeout(deleteTimeoutRef.current);
        }
        // Set new timeout
        deleteTimeoutRef.current = setTimeout(() => {
          setPendingDeleteTabId((current) =>
            current === id ? null : current,
          );
          deleteTimeoutRef.current = null;
        }, DELETE_CONFIRMATION_TIMEOUT);
      }
    },
    [removeTab],
  );

  // Use a selector to subscribe to the active tab's data
  const activeTab = useSpreadsheetTabsStore((state) =>
    state.tabs.find((t) => t.id === state.activeTabId)
  );

  // Handle spreadsheet changes - simple callback to update store
  const handleSpreadsheetChange = React.useCallback((newRows: Row[]) => {
    if (activeTabId) {
      updateTab(activeTabId, { rows: newRows });
    }
  }, [activeTabId, updateTab]);

  // Handle selection changes
  const handleSelectionChange = React.useCallback((selection: Selection | null) => {
    if (activeTabId && activeTab && selection) {
      // Adjust for header row (row 0) and header column (col 0)
      // Since the grid has headers, we need to subtract 1 from indices
      const adjustedSelection = {
        start: {
          row: Math.max(0, selection.start.row - 1),
          col: Math.max(0, selection.start.col - 1),
        },
        end: {
          row: Math.max(0, selection.end.row - 1),
          col: Math.max(0, selection.end.col - 1),
        },
      };
      updateSpreadsheetSelection(activeTabId, adjustedSelection, activeTab.rows as unknown as import("@silevis/reactgrid").Row[]);
    }
  }, [activeTabId, activeTab]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTab(active.id as string, newIndex);
      }
    }
  }, [tabs, reorderTab]);

  return (
    <div
      className={cn("w-full h-full flex flex-col", className)}
      {...props}
    >
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-background/95 border border-border rounded-lg shadow-lg backdrop-blur-sm">
          <svg
            className="animate-spin h-4 w-4 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-foreground">Loading...</span>
        </div>
      )}

      {/* Spreadsheet content */}
      <div
        role="tabpanel"
        aria-label={activeTab ? `${activeTab.name} spreadsheet` : "Spreadsheet"}
        className={cn(
          "flex-1 overflow-auto relative",
          "[&::-webkit-scrollbar]:w-[6px]",
          "[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600",
          "[&::-webkit-scrollbar:horizontal]:h-[4px]",
        )}
      >
        {!activeTab ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No active tab
          </div>
        ) : (
          <Spreadsheet
            columns={activeTab.columns}
            rows={activeTab.rows}
            editable={activeTab.editable}
            onChange={handleSpreadsheetChange}
            onSelectionChange={handleSelectionChange}
            onAddColumn={activeTabId ? () => addColumn(activeTabId) : undefined}
            onRemoveColumn={activeTabId ? (columnId: string) => removeColumn(activeTabId, columnId) : undefined}
            onAddRow={activeTabId ? () => addRow(activeTabId) : undefined}
            onRemoveRow={activeTabId ? (rowId: string | number) => removeRow(activeTabId, rowId) : undefined}
          />
        )}
      </div>

      {/* Tabs at bottom (Google Sheets style) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          role="tablist"
          aria-label="Spreadsheet tabs"
          className={cn(
            "flex items-center overflow-x-auto px-2 py-1 gap-1 border-t border-border bg-muted/30 dark:bg-muted/20",
            "[&::-webkit-scrollbar]:w-[6px]",
            "[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600",
            "[&::-webkit-scrollbar:horizontal]:h-[4px]",
          )}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                isActive={activeTabId === tab.id}
                isEditing={editingTabId === tab.id}
                editingName={editingName}
                isPendingDelete={pendingDeleteTabId === tab.id}
                canDelete={tabs.length > 1}
                onSelect={() => {
                  setActiveTab(tab.id);
                  setPendingDeleteTabId(null);
                }}
                onStartRename={() => startRenameTab(tab.id)}
                onSaveRename={saveRenameTab}
                onCancelRename={() => setEditingTabId(null)}
                onDelete={() => handleDeleteTab(tab.id)}
                onConfirmDelete={() => handleDeleteTab(tab.id, true)}
                onCancelDelete={() => setPendingDeleteTabId(null)}
                onEditingNameChange={setEditingName}
              />
            ))}
          </SortableContext>

          {/* New tab button */}
          <button
            onClick={handleCreateTab}
            className="ml-2 p-1 hover:bg-accent hover:text-foreground rounded transition-colors border border-transparent hover:border-border/50"
            aria-label="Create new sheet"
            title="New sheet"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </DndContext>
    </div>
  );
};

export default SpreadsheetTabs;
