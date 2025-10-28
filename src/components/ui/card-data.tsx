"use client";

import { cn } from "@/lib/utils";
import { useTamboComponentState } from "@tambo-ai/react";
import * as React from "react";
import { useId } from "react";
import { z } from "zod";

// Define option type for individual options in the multi-select
export type DataCardItem = {
  id: string;
  label: string;
  value: string;
  description?: string;
  url?: string;
};

// Define the component state type
export type DataCardState = {
  selectedValues: string[];
};

// Define the component props schema with Zod
export const dataCardSchema = z.object({
  title: z.string().describe("Title displayed above the data cards"),
  options: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for this card"),
        label: z.string().describe("Display text for the card title"),
        value: z.string().describe("Value associated with this card"),
        description: z
          .string()
          .optional()
          .describe("Optional summary for the card"),
        url: z
          .string()
          .optional()
          .describe("Optional URL for the card to navigate to"),
      }),
    )
    .describe("Array of selectable cards to display"),
});

// Define the props type based on the Zod schema
export type DataCardProps = z.infer<typeof dataCardSchema> & {
  className?: string;
};

/**
 * DataCard Component
 *
 * A component that displays options as clickable inline checkbox buttons
 * with the ability to select multiple items.
 */
export const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(
  ({ title, options = [], className }, ref) => {
    // Generate a unique ID if one isn't provided
    const generatedId = useId();
    const id = generatedId;

    // Initialize Tambo component state with unique ID
    const [state, setState] = useTamboComponentState<DataCardState>(
      `data-card-${id}`,
      { selectedValues: [] },
    );

    // Handle option selection
    const handleToggleCard = (value: string) => {
      if (!state) return;

      const selectedValues = [...state.selectedValues];
      const index = selectedValues.indexOf(value);

      // Toggle selection
      if (index > -1) {
        // Remove if already selected
        selectedValues.splice(index, 1);
      } else {
        selectedValues.push(value);
      }

      // Update component state
      setState({ selectedValues });
    };

    // Function to toggle all items
    const toggleAllItems = (checked: boolean) => {
      if (!options || !Array.isArray(options)) return;

      const selectedValues = checked
        ? options.map((option) => option.value)
        : [];
      setState({ selectedValues });
    };

    // Check if all items are selected - with null safety
    const allSelected =
      options &&
      Array.isArray(options) &&
      options.length > 0 &&
      options.every(
        (option) => state && state.selectedValues.includes(option.value),
      );

    // Ensure options is an array
    const safeOptions = Array.isArray(options) ? options : [];

    return (
      <div ref={ref} className={cn("w-full", className)}>
        {title && (
          <h2 className="text-lg font-medium text-gray-700 mb-3">{title}</h2>
        )}

        <div className="flex flex-wrap gap-2">
          {safeOptions.map((card) => (
            <div key={`${id}-${card.id}`} className="relative group">
              <button
                className={cn(
                  "py-2 px-2.5 rounded-2xl text-xs transition-colors",
                  "border border-flat",
                  "flex items-center gap-1.5",
                  state && state.selectedValues.includes(card.value)
                    ? "bg-accent text-accent-foreground"
                    : "bg-background hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => handleToggleCard(card.value)}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    state && state.selectedValues.includes(card.value)
                      ? "border-accent-foreground bg-accent"
                      : "border-muted-foreground",
                  )}
                >
                  {state && state.selectedValues.includes(card.value) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <span className="font-medium">{card.label}</span>
              </button>

              {/* Tooltip displayed on hover */}
              {(card.description || card.url) && (
                <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity bottom-full left-0 mb-2 px-3 py-2 bg-black text-white text-xs rounded shadow-lg max-w-xs">
                  <div className="relative">
                    {card.description && <div>{card.description}</div>}
                    {card.url && (
                      <div className="mt-1 text-green-400 text-xs truncate">
                        {card.url}
                      </div>
                    )}
                    {/* Tooltip arrow */}
                    <div className="absolute bottom-0 left-3 -mb-2 transform translate-x-1/2 rotate-45 w-2 h-2 bg-black"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {safeOptions.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              className={cn(
                "py-1 px-2 rounded-md text-xs transition-colors",
                "border border-flat",
                allSelected
                  ? "bg-accent text-accent-foreground"
                  : "bg-background hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={() => toggleAllItems(!allSelected)}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}
      </div>
    );
  },
);

DataCard.displayName = "DataCard";

export default DataCard;
