import { useState, useMemo, useCallback } from "react";

/**
 * Formula function information structure
 * This should match the FunctionInfo type from formula-autocomplete.ts
 */
export interface FunctionInfo {
  name: string;
  signature: string;
  description: string;
  category?: string;
  example?: string;
}

/**
 * Hook return value interface
 */
export interface AutocompleteResult {
  isOpen: boolean;
  suggestions: FunctionInfo[];
  selectedIndex: number;
  selectNext: () => void;
  selectPrevious: () => void;
  selectCurrent: () => string;
  close: () => void;
}

/**
 * Extract the word being typed at the cursor position
 * Returns the partial function name if the cursor is positioned to type one
 *
 * @param text - Full input text
 * @param position - Current cursor position
 * @returns The word at cursor or empty string
 */
function extractWordAtCursor(text: string, position: number): string {
  // Find the start of the current word (look backwards from cursor)
  let start = position - 1;
  while (start >= 0 && /[A-Za-z_]/.test(text[start])) {
    start--;
  }
  start++; // Move to first character of word

  // Find the end of the current word (look forwards from cursor)
  let end = position;
  while (end < text.length && /[A-Za-z_]/.test(text[end])) {
    end++;
  }

  return text.slice(start, end);
}

/**
 * Check if the cursor is in a valid position for function name autocomplete
 * Valid positions are:
 * - Immediately after "=" (start of formula)
 * - After operators: +, -, *, /, ^, &, >, <, =
 * - After opening parenthesis (
 * - After comma ,
 * Invalid positions:
 * - Inside string literals (between quotes)
 * - Inside existing function names that are already complete
 * - After closing parenthesis without an operator
 * - Inside function parentheses (argument lists)
 *
 * @param text - Formula text
 * @param position - Cursor position
 * @returns true if autocomplete should be shown
 */
function isInFunctionContext(text: string, position: number): boolean {
  // Must start with "=" for formulas
  if (!text.startsWith("=")) {
    return false;
  }

  // Don't show autocomplete if cursor is at position 0 or before "="
  if (position <= 1) {
    return true; // Allow autocomplete right after "="
  }

  // Check if we're inside a string literal
  let inString = false;
  let stringChar = "";
  for (let i = 1; i < position; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        // Check if escaped
        if (i > 0 && text[i - 1] !== "\\") {
          inString = false;
          stringChar = "";
        }
      }
    }
  }

  // Don't show autocomplete inside strings
  if (inString) {
    return false;
  }

  // Check if cursor is inside function parentheses
  // Count opening and closing parentheses before cursor position
  const beforeCursor = text.slice(0, position);
  const openParens = (beforeCursor.match(/\(/g) || []).length;
  const closeParens = (beforeCursor.match(/\)/g) || []).length;

  if (openParens > closeParens) {
    // Inside function arguments, don't show autocomplete
    return false;
  }

  // Look at the character immediately before the current word
  const currentWord = extractWordAtCursor(text, position);
  const wordStart = position - currentWord.length;

  // If we have no current word and cursor is not after a valid trigger, don't show
  if (currentWord.length === 0 && wordStart > 1) {
    const charBefore = text[wordStart - 1];
    // Valid trigger characters: operators, parentheses, comma
    const validTriggers = /[=+\-*/^&><,(]/;
    if (!validTriggers.test(charBefore)) {
      return false;
    }
  }

  // Check if we're after a function name that's already complete
  // (i.e., there's a parenthesis right after the word)
  const charAfterWord = text[position];
  if (charAfterWord === "(") {
    // If there's already an opening paren, the function name is complete
    return false;
  }

  return true;
}

/**
 * Search for functions matching the query
 * This is a placeholder that will use searchFunctions from formula-functions.ts once available
 *
 * @param query - Search query (partial function name)
 * @returns Array of matching functions
 */
function searchFunctions(query: string): FunctionInfo[] {
  // TODO: Replace this with import from formula-functions.ts when available
  // import { searchFunctions } from "@/lib/formula-functions";

  // For now, return a mock list of common Excel functions
  const mockFunctions: FunctionInfo[] = [
    {
      name: "SUM",
      category: "Math",
      description: "Adds all the numbers in a range",
      signature: "SUM(number1, [number2], ...)",
      example: "=SUM(A1:A10)",
    },
    {
      name: "AVERAGE",
      category: "Statistical",
      description: "Returns the average of its arguments",
      signature: "AVERAGE(number1, [number2], ...)",
      example: "=AVERAGE(A1:A10)",
    },
    {
      name: "COUNT",
      category: "Statistical",
      description: "Counts the number of cells that contain numbers",
      signature: "COUNT(value1, [value2], ...)",
      example: "=COUNT(A1:A10)",
    },
    {
      name: "MAX",
      category: "Statistical",
      description: "Returns the largest value in a set",
      signature: "MAX(number1, [number2], ...)",
      example: "=MAX(A1:A10)",
    },
    {
      name: "MIN",
      category: "Statistical",
      description: "Returns the smallest value in a set",
      signature: "MIN(number1, [number2], ...)",
      example: "=MIN(A1:A10)",
    },
    {
      name: "IF",
      category: "Logical",
      description: "Returns one value if a condition is true and another if false",
      signature: "IF(logical_test, value_if_true, [value_if_false])",
      example: "=IF(A1>10, \"High\", \"Low\")",
    },
    {
      name: "VLOOKUP",
      category: "Lookup",
      description: "Searches for a value in the first column and returns a value in the same row",
      signature: "VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
      example: "=VLOOKUP(A1, B1:D10, 2, FALSE)",
    },
    {
      name: "CONCATENATE",
      category: "Text",
      description: "Joins several text strings into one",
      signature: "CONCATENATE(text1, [text2], ...)",
      example: "=CONCATENATE(A1, \" \", B1)",
    },
    {
      name: "LEN",
      category: "Text",
      description: "Returns the number of characters in a text string",
      signature: "LEN(text)",
      example: "=LEN(A1)",
    },
    {
      name: "ROUND",
      category: "Math",
      description: "Rounds a number to a specified number of digits",
      signature: "ROUND(number, num_digits)",
      example: "=ROUND(A1, 2)",
    },
  ];

  // Case-insensitive search
  const lowerQuery = query.toLowerCase();

  if (!lowerQuery) {
    // Return all functions if query is empty, limited to 10
    return mockFunctions.slice(0, 10);
  }

  // Filter and sort by relevance
  const matches = mockFunctions.filter((fn) =>
    fn.name.toLowerCase().includes(lowerQuery)
  );

  // Sort: exact prefix matches first, then other matches
  matches.sort((a, b) => {
    const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
    const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);

    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // Both start with query or both don't, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  // Limit to 10 suggestions
  return matches.slice(0, 10);
}

/**
 * Custom hook for formula autocomplete functionality
 *
 * Provides intelligent autocomplete suggestions for formula functions based on:
 * - Current input value and cursor position
 * - Context awareness (inside strings, after operators, etc.)
 * - Keyboard navigation state
 *
 * @param inputValue - Current value of the formula input
 * @param cursorPosition - Current cursor position in the input
 * @returns Autocomplete state and control functions
 *
 * @example
 * ```tsx
 * const autocomplete = useFormulaAutocomplete(formula, cursorPos);
 *
 * // Show dropdown if autocomplete.isOpen
 * // Display autocomplete.suggestions
 * // Highlight autocomplete.selectedIndex
 * // Navigate with autocomplete.selectNext/selectPrevious
 * // Insert with autocomplete.selectCurrent()
 * ```
 */
export function useFormulaAutocomplete(
  inputValue: string,
  cursorPosition: number
): AutocompleteResult {
  // Track manual close action separately
  const [manuallyClosedKey, setManuallyClosedKey] = useState<string>("");

  // Compute suggestions based on input and cursor position
  const computedSuggestions = useMemo(() => {
    // Check if we should show autocomplete
    if (!isInFunctionContext(inputValue, cursorPosition)) {
      return [];
    }

    // Extract the current word being typed
    const currentWord = extractWordAtCursor(inputValue, cursorPosition);

    // Search for matching functions
    const matches = searchFunctions(currentWord);

    return matches;
  }, [inputValue, cursorPosition]);

  // Create a unique key for the current suggestions
  const suggestionsKey = useMemo(() => {
    return `${inputValue}-${cursorPosition}-${computedSuggestions.length}`;
  }, [inputValue, cursorPosition, computedSuggestions.length]);

  // Derive if the dropdown was manually closed for this specific query
  const isManuallyClosed = manuallyClosedKey === suggestionsKey;

  // Derive isOpen from suggestions (can be overridden by manual close)
  const isOpen = computedSuggestions.length > 0 && !isManuallyClosed;

  // Track selected index and the key it's associated with
  const [selectionState, setSelectionState] = useState({
    index: 0,
    forKey: suggestionsKey,
  });

  // Derive the selected index - reset to 0 when suggestions change
  const selectedIndex = selectionState.forKey === suggestionsKey ? selectionState.index : 0;

  // Navigation: select next suggestion
  const selectNext = useCallback(() => {
    setSelectionState((prev) => ({
      index: prev.index < computedSuggestions.length - 1 ? prev.index + 1 : 0,
      forKey: suggestionsKey,
    }));
  }, [computedSuggestions.length, suggestionsKey]);

  // Navigation: select previous suggestion
  const selectPrevious = useCallback(() => {
    setSelectionState((prev) => ({
      index: prev.index > 0 ? prev.index - 1 : computedSuggestions.length - 1,
      forKey: suggestionsKey,
    }));
  }, [computedSuggestions.length, suggestionsKey]);

  // Selection: return the currently selected function name
  const selectCurrent = useCallback((): string => {
    if (computedSuggestions.length === 0 || selectedIndex < 0) {
      return "";
    }

    const selected = computedSuggestions[selectedIndex];
    return selected ? selected.name : "";
  }, [computedSuggestions, selectedIndex]);

  // Close autocomplete dropdown
  const close = useCallback(() => {
    setManuallyClosedKey(suggestionsKey);
  }, [suggestionsKey]);

  return {
    isOpen,
    suggestions: computedSuggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    selectCurrent,
    close,
  };
}
