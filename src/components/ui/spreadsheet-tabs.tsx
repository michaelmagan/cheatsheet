"use client";

import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";
import type { Row } from "@/lib/spreadsheet-tabs-store";
import { Spreadsheet } from "@/components/tambo/spreadsheet";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
  ColumnsIcon,
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={cn(
        "group px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap flex items-center gap-1 rounded-t",
        isActive
          ? "bg-background text-foreground font-medium border border-b-0 border-border"
          : "text-muted-foreground hover:bg-background/50",
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
          <span>{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-foreground"
            title="Rename"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          {canDelete &&
            (isPendingDelete ? (
              <div className="ml-1 flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-400/30 rounded text-xs text-destructive dark:text-red-300">
                <span>Delete?</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmDelete();
                  }}
                  className="p-0.5 hover:text-red-900 dark:hover:text-red-100"
                  title="Confirm delete"
                >
                  <CheckIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelDelete();
                  }}
                  className="p-0.5 hover:text-red-900 dark:hover:text-red-100"
                  title="Cancel delete"
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
                className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-foreground"
                title="Delete tab"
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
  const [pendingDeleteTabId, setPendingDeleteTabId] = React.useState<
    string | null
  >(null);
  const [editingName, setEditingName] = React.useState("");

  // Initialize default tab only if persistence is empty
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Give time for persist middleware to rehydrate from localStorage
    const timer = setTimeout(() => {
      const currentTabs = useSpreadsheetTabsStore.getState().tabs;
      const currentActiveId = useSpreadsheetTabsStore.getState().activeTabId;

      // Only create default tab if store is truly empty (never been persisted)
      if (currentTabs.length === 0) {
        createTab("Sheet 1");
      } else if (!currentActiveId && currentTabs.length > 0) {
        setActiveTab(currentTabs[0].id);
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTab = React.useCallback(() => {
    createTab();
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
      } else {
        setPendingDeleteTabId(id);
        setTimeout(() => {
          setPendingDeleteTabId((current) =>
            current === id ? null : current,
          );
        }, 10000);
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
      {/* Spreadsheet content */}
      <div
        className={cn(
          "flex-1 overflow-auto",
          "[&::-webkit-scrollbar]:w-[6px]",
          "[&::-webkit-scrollbar-thumb]:bg-gray-300",
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
          className={cn(
            "flex items-center overflow-x-auto px-2 py-1 gap-1 border-t border-border bg-muted/50",
            "[&::-webkit-scrollbar]:w-[6px]",
            "[&::-webkit-scrollbar-thumb]:bg-gray-300",
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
            className="ml-2 p-1 hover:bg-accent rounded"
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
