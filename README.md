# Cheat Sheet

[![GitHub](https://img.shields.io/badge/github-michaelmagan/cheatsheet-blue?logo=github)](https://github.com/michaelmagan/cheatsheet)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Tambo AI](https://img.shields.io/badge/Tambo-AI-purple)](https://tambo.co)

An AI-powered, open-source Google Sheets competitor built with [Tambo AI](https://tambo.co).

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

The interactive spreadsheet system is powered by `@silevis/reactgrid` and uses **interactables** and **context helpers** to provide AI with read-only access to state, while mutations happen through dedicated tools:

> **Note on Dependencies:** This project uses `@silevis/reactgrid@4.1.17` with `legacy-peer-deps=true` in `.npmrc` to work around React 19 peer dependency constraints. The library functions correctly with React 19 despite the peer dependency warning. We're considering forking the repository to add official React 19 support.

- **Interactables** (Read-only AI context):
  - `src/components/ui/interactable-tabs.tsx` - Provides tab metadata (names, IDs, active tab)
  - Note: `InteractableSpreadsheet` is not currently used, as context helpers provide the data

- **Context Helpers** (Additional AI context):
  - `src/lib/spreadsheet-context-helper.ts` - Formats active spreadsheet as markdown table for AI
  - `src/lib/spreadsheet-selection-context.ts` - Provides current cell/range selection state

- **AI Tools** (Mutations):
  - `src/tools/spreadsheet-tools.ts` - 13 tools for spreadsheet manipulation (updateCell, createTab, etc.)

- **State & UI**:
  - `src/lib/spreadsheet-tabs-store.ts` - Zustand store managing all spreadsheet data
  - `src/components/ui/spreadsheet-tabs.tsx` - Visual tab interface for users

## App structure at a glance

- **Next.js app**: Pages under `src/app/`.
  - `src/app/page.tsx`: landing page.
  - `src/app/chat/page.tsx`: main chat interface with TamboProvider configuration.

- **How AI accesses spreadsheet state**:
  - **Context Helpers** (`contextHelpers` in TamboProvider): Provide read-only markdown-formatted data
    - `spreadsheetContextHelper` - Active spreadsheet tab data as markdown table
    - `spreadsheetSelectionContextHelper` - Current cell/range selection
  - **Interactables** (`withInteractable` HOC): Components that publish state updates to AI
    - `InteractableTabs` - Tab metadata (currently used in chat page)
    - Note: InteractableSpreadsheet exists but is not currently added to the UI
  - **Tools** (`tools` array in TamboProvider): Functions AI can execute to mutate state
    - 13 spreadsheet tools: updateCell, updateRange, createTab, deleteTab, switchTab, addColumn, removeColumn, addRow, removeRow, readCell, readRange, clearRange, sortByColumn

- **Component registration**: Currently no components are registered in `src/lib/tambo.ts`. The Spreadsheet is NOT a Tambo component - it's a persistent UI element that AI interacts with via tools and context.

For more detailed documentation, visit [Tambo's official docs](https://tambo.co/docs).

Built with [Tambo AI](https://tambo.co) - The framework for building generative UI applications.

## How it works

Register components the AI can render, with schemas for safe props:

```tsx
// src/lib/tambo.ts (excerpt)
import type { TamboComponent } from "@tambo-ai/react";

export const components: TamboComponent[] = [
  // The components array is currently empty in this template.
  // The Spreadsheet is NOT a Tambo component - it's a persistent UI element
  // that AI interacts with via tools and context helpers.

  // ROADMAP: We plan to add back the Graph component, but modified to accept
  // references to spreadsheet ranges instead of raw data values, allowing
  // visualizations to stay in sync with spreadsheet updates.
  //
  // Example future component (not yet implemented):
  // {
  //   name: "Graph",
  //   description: "Render charts from spreadsheet ranges",
  //   component: Graph,
  //   propsSchema: graphSchema, // would include spreadsheet range references
  // },
];
```

Wire the chat with spreadsheet UI using **interactables** and **context helpers**:

```tsx
// src/app/chat/page.tsx (excerpt)
"use client";
import { TamboProvider } from "@tambo-ai/react";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { InteractableTabs } from "@/components/ui/interactable-tabs";
import SpreadsheetTabs from "@/components/ui/spreadsheet-tabs";
import { components, tools } from "@/lib/tambo";
import { spreadsheetContextHelper } from "@/lib/spreadsheet-context-helper";
import { spreadsheetSelectionContextHelper } from "@/lib/spreadsheet-selection-context";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Chat() {
  const mcpServers = useMcpServers();
  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      // Context helpers provide read-only markdown-formatted data to AI
      contextHelpers={{
        spreadsheet: spreadsheetContextHelper,    // Active tab data as markdown
        selection: spreadsheetSelectionContextHelper, // Current selection state
      }}
    >
      <TamboMcpProvider mcpServers={mcpServers}>
        <div className="flex h-full">
          <MessageThreadFull contextKey="tambo-template" />
          <div className="hidden md:block w-[60%]">
            {/* Interactable that publishes tab metadata to AI */}
            <InteractableTabs interactableId="TabsState" />

            {/* Visual spreadsheet UI for users */}
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

The `components` array in `src/lib/tambo.ts` is currently empty. The Spreadsheet component is intentionally NOT registered - it's a persistent UI element that AI interacts with via tools and context helpers.

**Roadmap Note:** We plan to re-add the Graph component, but instead of passing raw data values, it will accept **references to spreadsheet ranges** (e.g., "Sheet1!A1:B10"). This allows visualizations to stay automatically synced with spreadsheet updates, creating a true spreadsheet-like experience.

To add your own components that the AI can render inline in the chat, register them like this:

```tsx
// Example component registration (add to src/lib/tambo.ts)
import { Graph, graphSchema } from "@/components/tambo/graph";
import type { TamboComponent } from "@tambo-ai/react";

const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema, // zod schema for the component props
  },
  // Add more components here
];
```

**Complete Component Example:**

Here's how to create a custom component that works with Tambo:

```tsx
// src/components/tambo/my-component.tsx
"use client";

import * as React from "react";
import { z } from "zod";

// Define the Zod schema with .describe() calls for AI guidance
export const myComponentSchema = z.object({
  title: z.string().describe("The title to display"),
  items: z.array(z.string()).describe("List of items to show"),
  variant: z
    .enum(["default", "compact"])
    .optional()
    .describe("Visual style variant"),
});

// Define TypeScript types from the schema
export type MyComponentProps = z.infer<typeof myComponentSchema>;

// Use forwardRef for proper React component behavior
export const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ title, items, variant = "default" }, ref) => {
    return (
      <div ref={ref} className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <ul className={variant === "compact" ? "space-y-1" : "space-y-2"}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
);
MyComponent.displayName = "MyComponent";

// Then register it in src/lib/tambo.ts:
// import { MyComponent, myComponentSchema } from "@/components/tambo/my-component";
//
// export const components: TamboComponent[] = [
//   {
//     name: "MyComponent",
//     description: "Displays a titled list of items with optional compact variant",
//     component: MyComponent,
//     propsSchema: myComponentSchema,
//   },
// ];
```

[📖 Read the full Components documentation](https://docs.tambo.co/concepts/components)

### Interactables and Context Helpers

**Understanding the Architecture:** This template demonstrates a sophisticated pattern where the spreadsheet is NOT a Tambo component that AI generates. Instead, it's a persistent UI element that AI can observe and manipulate through three complementary mechanisms:

1. **Context Helpers** - Provide formatted read-only data on every message
2. **Interactables** - Expose structured metadata about UI state (tab names, IDs)
3. **Tools** - Enable AI to mutate spreadsheet data

This pattern separates **reading** (context helpers + interactables) from **writing** (tools), creating a clean architecture for complex stateful applications.

[📖 Learn more about Additional Context](https://docs.tambo.co/concepts/additional-context)

#### **Context Helpers** - Automatic Read-Only Context

Context helpers are functions that automatically provide contextual information to the AI with each message. They're called by Tambo automatically (not by the AI) to inject current state as read-only context.

```tsx
// src/lib/spreadsheet-context-helper.ts (simplified)
export const spreadsheetContextHelper = () => {
  const store = useSpreadsheetTabsStore.getState();
  const activeTab = store.tabs.find((t) => t.id === store.activeTabId);

  if (!activeTab) return null;

  // Format as markdown table for AI to read
  let markdown = `# Spreadsheet: ${activeTab.name}\n\n`;
  markdown += `|   | A | B | C |\n`;
  markdown += `|---|---|---|---|\n`;

  activeTab.rows.forEach((row, i) => {
    const values = row.cells.map(cell =>
      cell.type === 'number' ? cell.value : cell.text
    );
    markdown += `| ${i} | ${values.join(' | ')} |\n`;
  });

  return markdown;
};

// Register in TamboProvider:
<TamboProvider
  contextHelpers={{
    spreadsheet: spreadsheetContextHelper,  // Called on every AI message
  }}
>
```

**When to use Context Helpers:**
- Data that changes frequently and AI needs current state on every message
- Data best represented as formatted text (markdown, JSON, etc.)
- Lightweight background information the AI needs to make informed decisions
- Read-only application state (user preferences, current selection, etc.)

[📖 Read the full Context Helpers documentation](https://docs.tambo.co/concepts/additional-context)

#### **Interactables** - Pre-placed AI-Modifiable Components

Interactables are **pre-placed UI components** wrapped with `withInteractable` HOC that can be dynamically modified through natural language. Unlike Tambo components (which AI generates inline), interactables are placed by developers and AI can identify and update them.

```tsx
// src/components/ui/interactable-tabs.tsx (simplified)
import { withInteractable, useTamboInteractable } from "@tambo-ai/react";
import { useSpreadsheetTabsStore } from "@/lib/spreadsheet-tabs-store";

function TabsInteractableWrapper(props: InteractableTabsProps) {
  const { updateInteractableComponentProps } = useTamboInteractable();

  // OUTBOUND: Publish tab metadata to AI whenever store changes
  useEffect(() => {
    const unsubscribe = useSpreadsheetTabsStore.subscribe((store) => {
      const payload = {
        tabs: store.tabs.map(t => ({ id: t.id, name: t.name })),
        activeTabId: store.activeTabId,
      };

      // Update the AI-visible state
      updateInteractableComponentProps(props.interactableId, {
        state: payload
      });
    });
    return unsubscribe;
  }, []);

  return <div aria-hidden />; // No visual UI, just a data bridge
}

export const InteractableTabs = withInteractable(TabsInteractableWrapper, {
  componentName: "TabsState",
  description: "Spreadsheet tab metadata. Use tools to create/delete tabs.",
  propsSchema: interactableTabsPropsSchema,
});

// Add to your UI:
<InteractableTabs interactableId="TabsState" />
```

**When to use Interactables:**
- Pre-placed UI components that AI should be able to identify and modify
- Structured metadata with a defined Zod schema
- Components where AI needs to update props through natural language
- Bidirectional data flow (app → AI and AI → app)

**Note:** In this template, `InteractableTabs` provides tab metadata but doesn't support AI mutations - mutations happen via tools instead. This demonstrates using interactables for read-only structured context.

[📖 Read the full Interactables documentation](https://docs.tambo.co/concepts/components/interactable-components)

**Key Differences:**

| Aspect | Context Helpers | Interactables |
|--------|----------------|---------------|
| Format | String (markdown/JSON) | Structured object with Zod schema |
| When called | Every AI message | On component state change |
| Visual component | No | Optional (this template uses hidden div) |
| Best for | Frequently changing data | Structured metadata |

**Architecture Decision:** This template uses **context helpers** for spreadsheet data (markdown-formatted tables) and **InteractableTabs** for structured tab metadata. While `InteractableSpreadsheet` exists in the codebase, it's not currently added to the UI because context helpers provide sufficient read access with less overhead.

### Spreadsheet Tools

The AI can manipulate spreadsheets through **13 tools** registered in `src/tools/spreadsheet-tools.ts`:

| Tool | Purpose |
|------|---------|
| `updateCell` | Update a single cell's value |
| `updateRange` | Update multiple cells at once |
| `createTab` | Create a new spreadsheet tab |
| `deleteTab` | Delete an existing tab |
| `switchTab` | Switch to a different tab |
| `addColumn` | Add a new column |
| `removeColumn` | Remove a column |
| `addRow` | Add a new row |
| `removeRow` | Remove a row |
| `readCell` | Read a single cell's value |
| `readRange` | Read multiple cells |
| `clearRange` | Clear cell values in a range |
| `sortByColumn` | Sort rows by column values |

These tools provide **write access** while interactables and context helpers provide **read-only access**. This separation creates a clean architecture where AI can understand current state but mutations are explicit and controlled.

[📖 Read the full Tools documentation](https://docs.tambo.co/concepts/tools)

**Creating Custom Tools:**

Tools allow the AI to execute functions and interact with your application state. Here's how to create a custom tool:

```tsx
// Example: src/tools/my-custom-tools.ts
import { z } from "zod";

// 1. Create the tool function
const greetUser = async (name: string, enthusiastic: boolean = false) => {
  try {
    const greeting = enthusiastic
      ? `Hello, ${name}! Great to see you!`
      : `Hello, ${name}.`;

    return {
      success: true,
      message: greeting,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// 2. Define the tool with schema
export const greetUserTool = {
  name: "greetUser",
  description: "Greet a user by name with optional enthusiasm",
  tool: greetUser,
  toolSchema: z
    .function()
    .args(
      z.string().describe("The user's name"),
      z.boolean().optional().describe("Whether to greet enthusiastically (default: false)")
    )
    .returns(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
      })
    ),
};

// 3. Export tools array
export const myCustomTools = [greetUserTool];

// 4. Register in src/lib/tambo.ts:
// import { myCustomTools } from "@/tools/my-custom-tools";
//
// export const tools: TamboTool[] = [
//   ...spreadsheetTools,
//   ...myCustomTools,
// ];
```

Tools follow this pattern:
- **Function**: Async function that performs the action
- **Name**: Unique identifier for the tool
- **Description**: Guides the AI on when to use this tool
- **Schema**: Zod schema defining args with `.describe()` and return type
- **Returns**: Typically `{ success: boolean, message?: string, error?: string }`

P.S. We use Tambo under the hood to manage chat state, which components the AI can render, and which components the AI can interact with. Tambo is 100% open source — see the repository at [tambo-ai/tambo](https://github.com/tambo-ai/tambo).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This template is open source and available under the MIT License.
