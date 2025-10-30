/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { spreadsheetTools } from "@/tools/spreadsheet-tools";
import { tabTools } from "@/tools/tab-tools";
import { graphComponent } from "@/components/tambo/graph-component";

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically interact with the spreadsheet.
 */

export const tools: TamboTool[] = [
  ...spreadsheetTools,
  ...tabTools,
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Note: Spreadsheet is NOT in this array - it's auto-created with each tab and only accessible
 * via the InteractableSpreadsheet (AI cannot create spreadsheets inline, only interact with existing ones)
 */
export const components: TamboComponent[] = [
  // Spreadsheet is intentionally NOT registered as a component
  // It's automatically created with each tab/canvas
  graphComponent,
];
