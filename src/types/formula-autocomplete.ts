/**
 * Formula autocomplete type definitions
 * Types for formula function autocomplete system
 */

// ============================================
// Function Information Types
// ============================================

/**
 * Information about a formula function for autocomplete
 */
export interface FunctionInfo {
  name: string;                    // Function name (e.g., "SUM", "AVERAGE")
  signature: string;               // Function signature (e.g., "SUM(number1, [number2], ...)")
  description: string;             // Brief description of what the function does
  category?: string;               // Category (e.g., "Math", "Statistical", "Text")
  example?: string;                // Example usage (e.g., "SUM(A1:A10)")
}

// ============================================
// Autocomplete State Types
// ============================================

/**
 * Autocomplete state returned by the hook
 */
export interface AutocompleteState {
  isOpen: boolean;                 // Whether the autocomplete dropdown is open
  suggestions: FunctionInfo[];     // Current list of suggestions
  selectedIndex: number;           // Index of the currently selected suggestion
  position?: { top: number; left: number }; // Position for the dropdown
  query: string;                   // Current search query
}

/**
 * Autocomplete actions for controlling the autocomplete
 */
export interface AutocompleteActions {
  open: (query: string, position?: { top: number; left: number }) => void;
  close: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectFunction: (functionName: string) => void;
  updateQuery: (query: string) => void;
}
