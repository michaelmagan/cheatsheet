"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { FunctionInfo } from "@/types/formula-autocomplete";

// ============================================
// Types
// ============================================

export interface FormulaAutocompleteProps {
  suggestions: FunctionInfo[];
  selectedIndex: number;
  onSelect: (functionName: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
  className?: string;
}

// ============================================
// Formula Autocomplete Component
// ============================================

/**
 * Autocomplete dropdown component for formula functions.
 *
 * Displays a scrollable list of function suggestions with keyboard navigation
 * and signature hints. Integrates with the formula autocomplete hook.
 *
 * @component
 * @example
 * ```tsx
 * <FormulaAutocomplete
 *   suggestions={functions}
 *   selectedIndex={0}
 *   onSelect={(name) => insertFunction(name)}
 *   onClose={() => setOpen(false)}
 *   position={{ top: 100, left: 50 }}
 * />
 * ```
 */
export const FormulaAutocomplete = React.forwardRef<
  HTMLDivElement,
  FormulaAutocompleteProps
>(({ suggestions, selectedIndex, onSelect, onClose, position, className }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0) {
    return null;
  }

  const selectedFunction = suggestions[selectedIndex];

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 rounded-md border border-border bg-popover shadow-lg",
        "transition-opacity duration-150 ease-in-out",
        "w-80",
        className
      )}
      style={{
        top: position?.top,
        left: position?.left,
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      role="dialog"
      aria-label="Formula function autocomplete"
    >
      {/* Scrollable suggestions list */}
      <div
        ref={listRef}
        className="max-h-[300px] overflow-y-auto p-1"
        role="listbox"
        aria-label="Function suggestions"
      >
        {suggestions.map((func, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={func.name}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={(e) => {
                e.preventDefault();
                onSelect(func.name);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-sm transition-colors",
                "focus:outline-none",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50 text-popover-foreground"
              )}
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
            >
              {/* Function name */}
              <div className="flex items-baseline gap-2">
                <span className="font-semibold font-mono text-sm">
                  {func.name}
                </span>
                {func.category && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {func.category}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {func.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Signature hint for selected function */}
      {selectedFunction && (
        <div className="border-t border-border bg-muted/30 p-2.5">
          {/* Signature */}
          <div className="text-xs font-mono text-foreground mb-1">
            {selectedFunction.signature}
          </div>

          {/* Example (if available) */}
          {selectedFunction.example && (
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium">Example: </span>
              <code className="font-mono">{selectedFunction.example}</code>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">
                Enter
              </kbd>
              <span>or</span>
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">
                Tab
              </kbd>
              <span>to insert</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">
                Esc
              </kbd>
              <span>to close</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

FormulaAutocomplete.displayName = "FormulaAutocomplete";

// ============================================
// Utility Component: Tooltip for Function Info
// ============================================

/**
 * Optional tooltip component for showing function details on hover
 * This can be used separately if you want hover tooltips in addition to the autocomplete
 */
export interface FunctionTooltipProps {
  functionInfo: FunctionInfo;
  children: React.ReactNode;
}

export const FunctionTooltip: React.FC<FunctionTooltipProps> = ({
  functionInfo,
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
            "z-50 w-64 rounded-md border border-border bg-popover p-3 shadow-lg",
            "transition-opacity duration-150 ease-in-out"
          )}
        >
          <div className="font-semibold font-mono text-sm mb-1">
            {functionInfo.name}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {functionInfo.description}
          </div>
          <div className="text-xs font-mono text-foreground">
            {functionInfo.signature}
          </div>
          {functionInfo.example && (
            <div className="text-xs text-muted-foreground mt-2">
              <span className="font-medium">Example: </span>
              <code className="font-mono">{functionInfo.example}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
