"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormulaAutocomplete } from "@/hooks/use-formula-autocomplete";
import { FormulaAutocomplete } from "@/components/ui/formula-autocomplete";

// ============================================
// Types
// ============================================

export interface FormulaBarProps {
  cellAddress: string;        // e.g., "B5" or "A1:C3"
  value: string;              // Current cell formula or value
  onValueChange: (newValue: string) => void;  // Callback when user commits edit
  className?: string;
}

// ============================================
// Formula Bar Component
// ============================================

/**
 * Excel-like formula bar that displays above the spreadsheet grid
 * Shows cell address and allows editing of cell values/formulas
 *
 * @component
 * @example
 * ```tsx
 * <FormulaBar
 *   cellAddress="B5"
 *   value="=SUM(A1:A10)"
 *   onValueChange={(newValue) => updateCell(newValue)}
 * />
 * ```
 */
export const FormulaBar = ({ cellAddress, value, onValueChange, className }: FormulaBarProps) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Use autocomplete hook
  const autocomplete = useFormulaAutocomplete(editValue, cursorPosition);

  // Sync edit value with prop value when not editing
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Update cursor position on input change or selection change
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const updateCursor = () => {
      setCursorPosition(input.selectionStart || 0);
    };

    // Track cursor position changes
    input.addEventListener("click", updateCursor);
    input.addEventListener("keyup", updateCursor);
    input.addEventListener("select", updateCursor);

    return () => {
      input.removeEventListener("click", updateCursor);
      input.removeEventListener("keyup", updateCursor);
      input.removeEventListener("select", updateCursor);
    };
  }, []);

  // Calculate dropdown position when autocomplete opens
  React.useEffect(() => {
    if (autocomplete.isOpen && isEditing && inputRef.current && containerRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setDropdownPosition({
        top: inputRect.bottom - containerRect.top + 2, // 2px spacing below input
        left: inputRect.left - containerRect.left,
      });
    }
  }, [autocomplete.isOpen, isEditing]);

  // Handle committing changes
  const handleCommit = React.useCallback(() => {
    if (editValue !== value) {
      onValueChange(editValue);
    }
    setIsEditing(false);
  }, [editValue, value, onValueChange]);

  // Handle canceling changes
  const handleCancel = React.useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  // Handle function insertion from autocomplete
  const handleFunctionSelect = React.useCallback((functionName: string) => {
    const input = inputRef.current;
    if (!input) return;

    const currentValue = editValue;
    const currentPos = input.selectionStart || 0;

    // Find the start of the current word being replaced
    let wordStart = currentPos - 1;
    while (wordStart >= 0 && /[A-Za-z_]/.test(currentValue[wordStart])) {
      wordStart--;
    }
    wordStart++; // Move to first character of word

    // Build the new value with the function name and opening parenthesis
    const before = currentValue.slice(0, wordStart);
    const after = currentValue.slice(currentPos);
    const newValue = before + functionName + "(" + after;
    const newCursorPos = wordStart + functionName.length + 1; // Position after "("

    // Update the value
    setEditValue(newValue);

    // Close autocomplete
    autocomplete.close();

    // Set cursor position after the opening parenthesis
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
    }, 0);
  }, [editValue, autocomplete]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // If autocomplete is open, handle navigation and selection
    if (autocomplete.isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        autocomplete.selectNext();
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        autocomplete.selectPrevious();
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selectedFunction = autocomplete.selectCurrent();
        if (selectedFunction) {
          handleFunctionSelect(selectedFunction);
        }
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        autocomplete.close();
        return;
      }
    }

    // Normal keyboard handling when autocomplete is closed
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }, [autocomplete, handleCommit, handleCancel, handleFunctionSelect]);

  // Handle focus
  const handleFocus = React.useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle blur
  const handleBlur = React.useCallback(() => {
    // Commit changes on blur
    handleCommit();
  }, [handleCommit]);

  // Handle input change
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
    // Update cursor position immediately after change
    const newPosition = e.target.selectionStart || 0;
    setCursorPosition(newPosition);
  }, []);

  // Handle clicking the cell address (focus input)
  const handleCellAddressClick = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center h-10 border-b border-border bg-background relative",
        className
      )}
    >
      {/* Cell Address Display */}
      <div
        onClick={handleCellAddressClick}
        className={cn(
          "flex items-center justify-center min-w-[80px] h-full px-3 border-r border-border",
          "text-sm font-medium text-foreground bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors",
          "select-none"
        )}
        title="Cell address"
      >
        {cellAddress || "\u00A0"}
      </div>

      {/* Formula/Value Input */}
      <div className="flex-1 h-full relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={cellAddress ? "Enter value or formula (start with =)" : "Select a cell"}
          disabled={!cellAddress}
          className={cn(
            "w-full h-full px-3 text-sm bg-transparent border-none outline-none",
            "font-mono text-foreground placeholder:text-muted-foreground/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Show subtle highlight when editing
            isEditing && "bg-blue-50/50 dark:bg-blue-950/20"
          )}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {/* Editing indicator */}
        {isEditing && !autocomplete.isOpen && (
          <div
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "flex items-center gap-2 text-[10px] text-muted-foreground/70"
            )}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">
                Enter
              </kbd>
              <span>save</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">
                Esc
              </kbd>
              <span>cancel</span>
            </span>
          </div>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isEditing && autocomplete.isOpen && (
        <FormulaAutocomplete
          suggestions={autocomplete.suggestions}
          selectedIndex={autocomplete.selectedIndex}
          onSelect={handleFunctionSelect}
          onClose={autocomplete.close}
          position={dropdownPosition}
        />
      )}
    </div>
  );
};

FormulaBar.displayName = "FormulaBar";
