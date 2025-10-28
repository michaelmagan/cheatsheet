# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npx tambo init` - Initialize Tambo configuration (creates .env.local)

## Architecture Overview

This is a Next.js application built with the Tambo AI framework for generative UI and Model Context Protocol (MCP) integration.

### Core Architecture

**Tambo Integration (`src/lib/tambo.ts`)**

- Central configuration for Tambo components and tools
- `components` array: Registers UI components that AI can render (Graph, DataCards)
- `tools` array: Registers functions that AI can execute (canvas operations, MCP servers)
- Components use Zod schemas for props validation

**State Management**

- Zustand store in `src/lib/canvas-storage.ts` manages canvas state
- Canvas system allows multiple workspaces with draggable components
- Components are stored with metadata: `componentId`, `canvasId`, `_componentType`, `_inCanvas`

**Drag & Drop System**

- Uses @dnd-kit for canvas interactions
- Components can be dragged between canvases
- Sortable within canvas using vertical list strategy
- `src/components/ui/components-canvas.tsx` handles all drag/drop logic

**MCP (Model Context Protocol)**

- Configure MCP servers at `/mcp-config` route
- Servers stored in browser localStorage
- Wrapped with `TamboMcpProvider` in chat interface
- Supports SSE and HTTP MCP servers

### Key Files

- `src/lib/tambo.ts` - Component/tool registration
- `src/lib/canvas-storage.ts` - Canvas state management
- `src/tools/canvas-tools.ts` - Canvas manipulation tools for AI
- `src/components/ui/components-canvas.tsx` - Drag/drop canvas UI
- `src/components/ui/graph.tsx` - Chart component using Recharts
- `src/app/chat/page.tsx` - Main chat interface

### Component System

Components registered with Tambo must include:

- `name`: Component identifier
- `description`: AI guidance for when/how to use
- `component`: React component
- `propsSchema`: Zod schema for props validation

### Environment Setup

Copy `example.env.local` to `.env.local` and add:

- `NEXT_PUBLIC_TAMBO_API_KEY` - Get from tambo.co/dashboard

### Canvas Tools

AI can manipulate canvases through tools in `src/tools/canvas-tools.ts`:

- `createCanvas(name)` - Create new canvas
- `getCanvases()` - List all canvases
- `getCanvasComponents(id)` - Get components in canvas

Note: Update/delete canvas tools are commented out due to schema validation issues with Tambo.
