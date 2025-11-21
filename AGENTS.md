# Agent Cheat Sheet

AI-powered spreadsheet using **Tambo** (https://tambo.co) + FortuneSheet. See https://docs.tambo.co/llms.txt for full Tambo documentation.

## Tambo Architecture

**Three-Layer System:**
1. **Context Helpers** - Auto-included in every AI message (read-only)
2. **Interactables** - Publish component state via `withInteractable` HOC
3. **Tools** - Functions AI calls to mutate state (in `src/tools/`)

**Configuration:** `src/lib/tambo.ts` registers all components and tools.

**Critical Streaming Gotchas:**
- Props stream token-by-token as LLM generates
- Use `useTamboStreamStatus()` to detect streaming
- Safe destructuring: `const { prop = default } = props || {}`
- Optional chaining: `array?.[0]?.property`

## FortuneSheet Integration

**State:** `src/lib/fortune-sheet-store.tsx` (Zustand store + mounted Workbook)

**Context:**
- `spreadsheet` - Active sheet snapshot as markdown table
- `selection` - Current selection in A1 notation
- `TabsState` - Sheet ids/names/active tab (interactable)

**Tools:** `src/tools/spreadsheet-tools.ts`
- updateCell, updateRange, **updateStyles**, readCell, readRange
- addRow, removeRow, addColumn, removeColumn
- clearRange, sortByColumn

**Key Rules:**
- All operations go through `fortuneSheetStore` (no local state forks)
- Context helpers must tolerate SSR (`return null` when `window` undefined)
- Selection requires mounted Workbook

## Development

**Commands:**
- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run check-types` - TypeScript check

**Style:**
- TypeScript + React (App Router) + functional components
- 2-space indent, PascalCase components, camelCase hooks, kebab-case utils
- FortuneSheet helpers in `src/lib/fortune-sheet-*.ts`

**Commits:**
- Imperative mood (`Add utils`, `Fix context`)
- Mention affected Tambo tools/components explicitly

**Dependency Upgrades:**
- When upgrading Tambo packages or UI components, preserve custom edits
- Key customizations to preserve:
  - `src/components/tambo/message-thread-full.tsx` - GitHub and Tambo buttons in sidebar
  - `src/components/tambo/thread-history.tsx` - Exported `useThreadHistoryContext` hook
- Always review diffs before accepting upstream changes
