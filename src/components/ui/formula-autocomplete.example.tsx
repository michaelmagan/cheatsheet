/**
 * Example usage of FormulaAutocomplete component
 *
 * This file demonstrates how to integrate the formula autocomplete component
 * with a formula input field, using a custom hook for state management.
 */

"use client";

import * as React from "react";
import { FormulaAutocomplete } from "./formula-autocomplete";
import type { FunctionInfo } from "@/types/formula-autocomplete";

// ============================================
// Example Hook: useFormulaAutocomplete
// ============================================

// Example function database (moved outside component to avoid recreating on every render)
const ALL_FUNCTIONS: FunctionInfo[] = [
  {
    name: "SUM",
    signature: "SUM(number1, [number2], ...)",
    description: "Returns the sum of a series of numbers",
    category: "Math",
    example: "SUM(A1:A10)",
  },
  {
    name: "AVERAGE",
    signature: "AVERAGE(number1, [number2], ...)",
    description: "Returns the average of a series of numbers",
    category: "Statistical",
    example: "AVERAGE(B1:B10)",
  },
  {
    name: "COUNT",
    signature: "COUNT(value1, [value2], ...)",
    description: "Counts the number of cells that contain numbers",
    category: "Statistical",
    example: "COUNT(A1:A10)",
  },
  {
    name: "IF",
    signature: "IF(logical_test, value_if_true, [value_if_false])",
    description: "Returns one value if a condition is true and another if false",
    category: "Logical",
    example: "IF(A1>10, \"High\", \"Low\")",
  },
  {
    name: "VLOOKUP",
    signature: "VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
    description: "Looks up a value in a table and returns a value in the same row",
    category: "Lookup",
    example: "VLOOKUP(A1, B1:D10, 2, FALSE)",
  },
];

/**
 * Custom hook for managing formula autocomplete state
 * This would typically be in /src/hooks/use-formula-autocomplete.ts
 */
function useFormulaAutocomplete() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<FunctionInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [position, setPosition] = React.useState<{ top: number; left: number }>();

  const open = React.useCallback((query: string, pos?: { top: number; left: number }) => {
    // Filter functions based on query
    const filtered = ALL_FUNCTIONS.filter((fn) =>
      fn.name.toLowerCase().startsWith(query.toLowerCase())
    );

    setSuggestions(filtered);
    setSelectedIndex(0);
    setPosition(pos);
    setIsOpen(filtered.length > 0);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(0);
  }, []);

  const selectNext = React.useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % suggestions.length);
  }, [suggestions.length]);

  const selectPrevious = React.useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
  }, [suggestions.length]);

  return {
    isOpen,
    suggestions,
    selectedIndex,
    position,
    open,
    close,
    selectNext,
    selectPrevious,
  };
}

// ============================================
// Example Component: FormulaInput with Autocomplete
// ============================================

/**
 * Example formula input component with autocomplete integration
 */
export function FormulaInputExample() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [formula, setFormula] = React.useState("=");
  const autocomplete = useFormulaAutocomplete();

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormula(value);

    // Check if user is typing a function (after = or after a delimiter)
    if (value.startsWith("=")) {
      const match = value.match(/[A-Z]+$/i);
      if (match) {
        // Get cursor position for dropdown placement
        const input = inputRef.current;
        if (input) {
          const rect = input.getBoundingClientRect();
          autocomplete.open(match[0], {
            top: rect.bottom + 4,
            left: rect.left,
          });
        }
      } else {
        autocomplete.close();
      }
    }
  };

  // Handle function selection
  const handleSelect = (functionName: string) => {
    // Replace the partial function name with the selected function
    const newFormula = formula.replace(/[A-Z]+$/i, functionName + "(");
    setFormula(newFormula);
    autocomplete.close();
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!autocomplete.isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        autocomplete.selectNext();
        break;
      case "ArrowUp":
        e.preventDefault();
        autocomplete.selectPrevious();
        break;
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <input
        ref={inputRef}
        type="text"
        value={formula}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter formula (e.g., =SUM(A1:A10))"
        className="w-full px-4 py-2 border border-border rounded-md font-mono text-sm"
      />

      {/* Autocomplete dropdown */}
      {autocomplete.isOpen && (
        <FormulaAutocomplete
          suggestions={autocomplete.suggestions}
          selectedIndex={autocomplete.selectedIndex}
          onSelect={handleSelect}
          onClose={autocomplete.close}
          position={autocomplete.position}
        />
      )}
    </div>
  );
}

// ============================================
// Example Usage in Formula Bar
// ============================================

/**
 * Example of integrating autocomplete with the FormulaBar component
 */
export function FormulaBarWithAutocomplete() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [cellAddress] = React.useState("A1");
  const [value, setValue] = React.useState("");
  const autocomplete = useFormulaAutocomplete();

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    console.log("Cell value updated:", newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Trigger autocomplete for formulas
    if (newValue.startsWith("=")) {
      const match = newValue.match(/[A-Z]+$/i);
      if (match && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        autocomplete.open(match[0], {
          top: rect.bottom + 4,
          left: rect.left,
        });
      } else {
        autocomplete.close();
      }
    }
  };

  const handleSelect = (functionName: string) => {
    const newValue = value.replace(/[A-Z]+$/i, functionName + "(");
    setValue(newValue);
    autocomplete.close();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (autocomplete.isOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          autocomplete.selectNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          autocomplete.selectPrevious();
          break;
        case "Escape":
          e.preventDefault();
          autocomplete.close();
          break;
      }
    } else if (e.key === "Enter") {
      handleValueChange(value);
    }
  };

  return (
    <div className="relative border-b border-border">
      <div className="flex items-center h-10">
        {/* Cell address */}
        <div className="flex items-center justify-center min-w-[80px] h-full px-3 border-r border-border bg-muted/30">
          <span className="text-sm font-medium">{cellAddress}</span>
        </div>

        {/* Formula input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter value or formula (start with =)"
            className="w-full h-full px-3 text-sm bg-transparent border-none outline-none font-mono"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {autocomplete.isOpen && (
        <FormulaAutocomplete
          suggestions={autocomplete.suggestions}
          selectedIndex={autocomplete.selectedIndex}
          onSelect={handleSelect}
          onClose={autocomplete.close}
          position={autocomplete.position}
        />
      )}
    </div>
  );
}
