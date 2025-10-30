# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run check-types` - Run TypeScript type checking
- `npx tambo init` - Initialize Tambo configuration (creates .env.local)

## Architecture Overview

This is a Next.js application built with the Tambo AI framework for generative UI and Model Context Protocol (MCP) integration, featuring an interactive spreadsheet system.

### Core Architecture

**Tambo Integration (`src/lib/tambo.ts`)**

- Central configuration for Tambo components and tools
- `components` array: Currently empty - Spreadsheet is NOT a Tambo component, it's a persistent UI element
- `tools` array: Registers 10 spreadsheet manipulation functions (updateCell, updateRange, etc.)
- AI accesses spreadsheet via context helpers (read) and tools (write), not component registration

**Spreadsheet System**

The spreadsheet uses a three-layer architecture for AI interaction:

1. **Context Helpers** (Read-only automatic context):
   - `src/lib/spreadsheet-context-helper.ts` - Formats active spreadsheet as markdown table
   - `src/lib/spreadsheet-selection-context.ts` - Provides current cell selection
   - Called automatically on every AI message

2. **Interactables** (Structured metadata):
   - `src/components/ui/interactable-tabs.tsx` - Exposes tab metadata (names, IDs, active tab)
   - Uses `withInteractable` HOC to publish state updates to AI
   - Note: `InteractableSpreadsheet` exists but is not currently used

3. **Tools** (Mutations):
   - `src/tools/spreadsheet-tools.ts` - 10 tools for spreadsheet manipulation
   - Tools: updateCell, updateRange, addColumn, removeColumn, addRow, removeRow, readCell, readRange, clearRange, sortByColumn

- State: Zustand store in `src/lib/spreadsheet-tabs-store.ts` manages all spreadsheet data
- UI: `src/components/ui/spreadsheet-tabs.tsx` - Visual tab interface for users
- Grid: Built with `@silevis/reactgrid` library
- Utilities: `src/lib/spreadsheet-utils.ts` for data manipulation

**State Management**

- Zustand store in `src/lib/canvas-storage.ts` manages canvas/tab state
- Zustand store in `src/lib/spreadsheet-tabs-store.ts` manages spreadsheet data
- Components are stored with metadata: `componentId`, `canvasId`, `_componentType`, `_inCanvas`

**MCP (Model Context Protocol)**

- Configure MCP servers via modal component (no dedicated route)
- Configuration UI in `src/components/tambo/mcp-config-modal.tsx`
- Servers stored in browser localStorage
- Wrapped with `TamboMcpProvider` in chat interface
- Supports SSE and HTTP MCP servers

### Key Files

**Core Configuration**
- `src/lib/tambo.ts` - Component/tool registration
- `src/app/chat/page.tsx` - Main chat interface

**Spreadsheet System**
- `src/components/tambo/spreadsheet.tsx` - Tambo spreadsheet component registration
- `src/components/ui/interactable-spreadsheet.tsx` - Interactive spreadsheet UI
- `src/components/ui/spreadsheet-tabs.tsx` - Spreadsheet tab component
- `src/lib/spreadsheet-tabs-store.ts` - Spreadsheet state management
- `src/lib/spreadsheet-selection-context.ts` - Selection state
- `src/lib/spreadsheet-context-helper.ts` - Context utilities
- `src/lib/spreadsheet-utils.ts` - Spreadsheet utility functions
- `src/tools/spreadsheet-tools.ts` - AI tools for spreadsheet manipulation

**Other Components**
- `src/lib/canvas-storage.ts` - Canvas/tab state management
- `src/components/ui/interactable-tabs.tsx` - Tab metadata component for AI
- `src/components/ui/graph.tsx` - Chart component using Recharts

### Component System

Components registered with Tambo must include:

- `name`: Component identifier
- `description`: AI guidance for when/how to use
- `component`: React component
- `propsSchema`: Zod schema for props validation

## Streaming-Aware Component Development

When building Tambo component, props **stream incrementally** as the LLM generates them. Components must handle partial data gracefully.


### Critical Streaming Concepts

**Prop Streaming Behavior:**
- Props arrive token-by-token during generation
- Arrays populate incrementally (length increases over time)
- Nested objects are replaced entirely (not merged)
- Components render multiple times with partial props

**Best Practices:**
1. **Always use `useTamboStreamStatus`** for component-specific streaming status
2. **Safe destructuring with defaults:** `const { prop = default } = props || {}`
3. **Optional chaining for nested access:** `array?.[0]?.property`
4. **Validate minimum required props** before rendering
5. **Show loading states** during streaming for better UX

Read this doc for how to handle this: https://docs.tambo.co/concepts/streaming/component-streaming-status

### Environment Setup

Copy `example.env.local` to `.env.local` and add:

- `NEXT_PUBLIC_TAMBO_API_KEY` - Get from tambo.co/dashboard

### Spreadsheet Tools

AI can manipulate spreadsheets through tools in `src/tools/spreadsheet-tools.ts`:

- Update cell values and ranges
- Add and remove rows and columns
- Read spreadsheet data
- Clear ranges and sort data

### Dependencies

Key dependencies:
- `@silevis/reactgrid@^4.1.17` - Spreadsheet grid library
- `recharts` - Chart visualization
- `zustand` - State management
