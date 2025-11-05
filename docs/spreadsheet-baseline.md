# Current Spreadsheet Baseline (Pre-FortuneSheet)

_Last updated: 2025-10-31_

This note captures the behaviours and touchpoints of the existing ReactGrid-based spreadsheet before we migrate to FortuneSheet. Use it as a reference when validating each migration phase.

## UI Responsibilities

- `src/components/ui/spreadsheet-tabs.tsx` renders the main spreadsheet surface, including:
  - Custom tab strip with drag-and-drop reordering, rename, and delete confirmation.
  - Toolbar actions for adding/removing rows and columns.
  - Secondary UI (AI selection indicator, loading spinner).
- `src/components/tambo/spreadsheet.tsx` wraps `@silevis/reactgrid` with the controlled props coming from the Zustand store.
- `src/components/ui/formula-bar.tsx` provides the Excel-style formula input with autocomplete (`FormulaAutocomplete`, `useFormulaAutocomplete`).
- `src/components/ui/formula-cell-template.tsx` customises formula rendering/editing inside ReactGrid.

## State & Data Flow

- `src/lib/spreadsheet-tabs-store.ts` (Zustand) owns tabs, rows/columns, and the HyperFormula engine map.
  - Actions for tab CRUD, row/column mutations, and cell updates.
  - HyperFormula integration (`updateCellWithFormula`, `recalculateFormulas`).
- `src/lib/formula-engine.ts` wraps HyperFormula creation/evaluation.
- AI tools and hooks:
  - `src/tools/spreadsheet-tools.ts` exposes update helpers that call store actions.
  - `src/lib/spreadsheet-context-helper.ts` formats current sheet as markdown for AI context.
  - `src/hooks/useSpreadsheetData.ts` / `useMultipleSpreadsheetData.ts` expose data ranges to charts and other components.

## Behaviour Snapshot

- Editing:
  - Text, number, and formula cells update through `applyChanges` -> store actions.
  - Formula evaluation relies on HyperFormula and updates stored `FormulaCell.value`.
- Selection & UX:
  - Column/row selection toggles toolbar actions (delete buttons).
  - `updateSpreadsheetSelection` publishes selection context for AI features.
- Tabs:
  - Drag-and-drop reorder, rename via inline input, delete with timeout confirmation.
  - Initial tab auto-creation handled on mount when store is empty.
- External Consumers:
  - Graph component (`src/components/tambo/graph.tsx`) depends on hooks for range reads.
  - Tools rely on row/column IDs (`A`, `B`, `ROW_HEADER`) and 1-indexed row IDs.

## Known Constraints

- Styling and layout rely on Tailwind classes layered over ReactGrid’s CSS.
- Undo/redo managed manually in the store (limited functionality compared with FortuneSheet).
- Formula autocomplete uses a mock list of functions (`useFormulaAutocomplete`) despite having a larger catalogue in `src/lib/formula-functions.ts`.

Keep this document updated if any baseline behaviour changes before the migration completes.

