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
- `components` array: Registers UI components that AI can render (Spreadsheet, Graph, DataCards)
- `tools` array: Registers functions that AI can execute (spreadsheet operations, MCP servers)
- Components use Zod schemas for props validation

**Spreadsheet System**

- Interactive spreadsheet built with `@silevis/reactgrid` library
- Zustand store in `src/lib/spreadsheet-tabs-store.ts` manages spreadsheet tabs and data
- Context system for spreadsheet selection and operations:
  - `src/lib/spreadsheet-selection-context.ts` - Selection state management
  - `src/lib/spreadsheet-context-helper.ts` - Context utilities for spreadsheet operations
- Components:
  - `src/components/tambo/spreadsheet.tsx` - Tambo component registration
  - `src/components/ui/interactable-spreadsheet.tsx` - Main interactive spreadsheet component
  - `src/components/ui/spreadsheet-tabs.tsx` - Tab UI for multiple spreadsheets
- Utility functions in `src/lib/spreadsheet-utils.ts` for data manipulation
- AI tools in `src/tools/spreadsheet-tools.ts` for spreadsheet manipulation

**State Management**

- Zustand store in `src/lib/canvas-storage.ts` manages canvas/tab state
- Zustand store in `src/lib/spreadsheet-tabs-store.ts` manages spreadsheet data
- Components are stored with metadata: `componentId`, `canvasId`, `_componentType`, `_inCanvas`

**MCP (Model Context Protocol)**

- Configure MCP servers at `/mcp-config` route
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

### Environment Setup

Copy `example.env.local` to `.env.local` and add:

- `NEXT_PUBLIC_TAMBO_API_KEY` - Get from tambo.co/dashboard

### Spreadsheet Tools

AI can manipulate spreadsheets through tools in `src/tools/spreadsheet-tools.ts`:

- Create and manage spreadsheet tabs
- Update cell values and ranges
- Read spreadsheet data
- Manage selection and formatting

### Dependencies

Key dependencies:
- `@silevis/reactgrid@^4.1.17` - Spreadsheet grid library
- `recharts` - Chart visualization
- `zustand` - State management
