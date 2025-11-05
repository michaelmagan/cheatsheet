# FortuneSheet Migration TODO

## Phase 2 – Embed FortuneSheet Workbook
- [x] Replace the ReactGrid-based surface in `src/components/ui/spreadsheet-tabs.tsx` with FortuneSheet’s `<Workbook>`.
- [x] Remove custom sheet tabs/toolbar/formula bar that depended on ReactGrid.
- [x] Provide FortuneSheet with minimal in-memory sheet data (no Zustand persistence), ensuring the workbook renders and tabs function via FortuneSheet’s UI.
- [x] Clean up unused imports and suppress legacy handlers that referenced the old grid.

## Phase 3 – State, Hooks, and Tooling
- [x] Introduce an in-memory FortuneSheet state provider (no localStorage persistence for now).
- [x] Wire `<Workbook>` callbacks (`onChange`, `onOp`) to the new state so edits persist during a session.
- [x] Reshape existing hooks (`useSpreadsheetData`, `useMultipleSpreadsheetData`) to FortuneSheet semantics and ensure downstream consumers (graphs, AI tools) compile.
- [x] Update AI spreadsheet tools to operate on the new state structures.
- [x] Remove or archive HyperFormula-specific code paths once FortuneSheet calculations are in place.

Clean Up
- [x] Remove unused packages
- [x] run lint, text, check-types
- [x] Update README and AGENTS reference docs
