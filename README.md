# Cheat Sheet

An AI-powered, open-source Google Sheets competitor built with Tambo AI.

Build and manipulate interactive spreadsheets with natural language, alongside graphs and visualizations.

## Features

- **AI-Powered Spreadsheet Manipulation**: Generate and edit spreadsheets using natural language commands
- **Multi-Tab Support**: Create and manage multiple spreadsheet tabs within a single workspace
- **Cell and Range Updates**: Update individual cells or entire ranges through AI chat interactions
- **Cell Selection**: Select cells and interact with them directly in the interface
- **Real-time Collaboration with AI**: Chat with AI to transform and analyze your data on the fly
- **Model Context Protocol (MCP) Integration**: Connect external data sources and tools via MCP servers

## Roadmap

- **Formula Support**: Add support for spreadsheet formulas (SUM, AVERAGE, IF, VLOOKUP, etc.)
- **Graph Generation**: Generate charts and visualizations based on spreadsheet data
- **Advanced Formatting**: Enhanced visual formatting options for tables (colors, borders, fonts, alignment)
- **Import/Export**: Support for importing and exporting data in various formats (CSV, XLSX, JSON)

## Demo

## Get Started

1. Clone this repository

2. Navigate to the project directory:
   ```bash
   cd spreadsheet-template
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up your environment variables:

   **Option A: Using Tambo CLI (Recommended)**
   ```bash
   npx tambo init
   ```
   This will interactively prompt you for your Tambo API key and create `.env.local` automatically.

   **Option B: Manual Setup**
   ```bash
   cp example.env.local .env.local
   ```
   Then edit `.env.local` and set your API key:
   ```env
   NEXT_PUBLIC_TAMBO_API_KEY=your-api-key-here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to use the app!

## Key Components

### Spreadsheet System

The interactive spreadsheet system is powered by `@silevis/reactgrid` and includes:

- **Spreadsheet Component** (`src/components/tambo/spreadsheet.tsx`): Tambo-registered component for AI interaction
- **Interactive UI** (`src/components/ui/interactable-spreadsheet.tsx`): Full-featured spreadsheet with cell editing
- **Tab Management** (`src/components/ui/spreadsheet-tabs.tsx`): Multi-tab spreadsheet interface
- **State Management** (`src/lib/spreadsheet-tabs-store.ts`): Zustand store for spreadsheet data
- **Selection Context** (`src/lib/spreadsheet-selection-context.ts`): Manage cell/range selection
- **AI Tools** (`src/tools/spreadsheet-tools.ts`): Tools for AI to manipulate spreadsheets

## App structure at a glance

- **Next.js app**: Pages under `src/app/`.
  - `src/app/page.tsx`: landing page.
  - `src/app/chat/page.tsx`: main chat interface.

- **Component registration and chat wiring**: See `src/lib/tambo.ts` and `src/app/chat/page.tsx`.

- **Generatable components (created by chat)**: Components the AI can instantiate in the thread, e.g. `src/components/tambo/spreadsheet.tsx`, `src/components/tambo/graph.tsx`, registered in `src/lib/tambo.ts`.

- **Editable/readable components (stateful UI the chat can modify or inspect)**:
  - Spreadsheet state in `src/lib/spreadsheet-tabs-store.ts` (Zustand) with tabs, cells, and data.
  - Spreadsheet UI in `src/components/ui/interactable-spreadsheet.tsx` with selection context and utilities.
  - Tab metadata in `src/lib/canvas-storage.ts` (Zustand).
  - Tab and spreadsheet interactions via `interactable-tabs.tsx`, `spreadsheet-tabs.tsx`.
  - The chat can update existing components or read current state via registered tools in `src/tools/spreadsheet-tools.ts`.

For more detailed documentation, visit [Tambo's official docs](https://tambo.co/docs).

## How it works

Register components the AI can render, with schemas for safe props:

```tsx
// src/lib/tambo.ts (excerpt)
import { Spreadsheet, spreadsheetSchema } from "@/components/tambo/spreadsheet";
import { Graph, graphSchema } from "@/components/tambo/graph";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import type { TamboComponent } from "@tambo-ai/react";

export const components: TamboComponent[] = [
  {
    name: "Spreadsheet",
    description: "Interactive spreadsheet with tabs and cell editing",
    component: Spreadsheet,
    propsSchema: spreadsheetSchema,
  },
  {
    name: "Graph",
    description: "Render charts (bar/line/pie)",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCards",
    description: "Selectable list of info",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
];
```

Wire the chat with spreadsheet UI:

```tsx
// src/app/chat/page.tsx (excerpt)
"use client";
import { TamboProvider } from "@tambo-ai/react";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { InteractableTabs } from "@/components/ui/interactable-tabs";
import SpreadsheetTabs from "@/components/ui/spreadsheet-tabs";
import { components, tools } from "@/lib/tambo";
import { spreadsheetContextHelper } from "@/lib/spreadsheet-context-helper";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Chat() {
  const mcpServers = useMcpServers();
  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      contextHelpers={{
        spreadsheet: spreadsheetContextHelper,
      }}
    >
      <TamboMcpProvider mcpServers={mcpServers}>
        <div className="flex h-full">
          <MessageThreadFull contextKey="tambo-template" />
          <div className="hidden md:block w-[60%]">
            <InteractableTabs interactableId="TabsState" />
            <SpreadsheetTabs className="h-full" />
          </div>
        </div>
      </TamboMcpProvider>
    </TamboProvider>
  );
}
```

## Customizing

### Change what components the AI can control

You can see how components like `Spreadsheet` and `Graph` are registered in `src/lib/tambo.ts`:

```tsx
const components: TamboComponent[] = [
  {
    name: "Spreadsheet",
    description:
      "An interactive spreadsheet component with tabs, cell editing, and natural language manipulation. Supports multiple sheets and data operations.",
    component: Spreadsheet,
    propsSchema: spreadsheetSchema, // zod schema for the component props
  },
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
  },
  // Add more components
];
```

You can find more information about the options [here](https://tambo.co/docs/concepts/registering-components)

### Spreadsheet Tools

The AI can manipulate spreadsheets through tools registered in `src/tools/spreadsheet-tools.ts`, enabling:
- Creating and managing tabs
- Reading and updating cell values
- Managing selections and ranges
- Data transformations

P.S. We use Tambo under the hood to manage chat state, which components the AI can render, and which components the AI can interact with. Tambo is 100% open source — see the repository at [tambo-ai/tambo](https://github.com/tambo-ai/tambo).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This template is open source and available under the MIT License.
