# FortuneSheet Migration Plan

Created: 2025-10-31  
Owner: Engineering

This plan breaks the migration from the current ReactGrid-based spreadsheet to [FortuneSheet](https://github.com/ruilisi/fortune-sheet) into manageable phases. Each phase lists the key tasks, expected deliverables, and validation steps so we can sequence pull requests without destabilizing other features.

---

## Phase 0 – Preparation & Dependency Baseline

**Goals**
- Introduce FortuneSheet packages without wiring them into the UI.
- Document current spreadsheet responsibilities and capture baseline behaviour for regression tracking.

**Tasks**
- Add `@fortune-sheet/react` (and FortuneSheet peer dependencies) to `package.json`.
- Capture current spreadsheet behaviour: covering editing, selection, formula bar, tab management, AI tooling usage, and chart data hooks.
- Flag modules that will be deprecated once FortuneSheet is live (e.g. `src/lib/formula-engine.ts`, `src/components/ui/formula-bar.tsx`, ReactGrid-specific utilities).

**Validation**
- `npm install` succeeds with the new dependency set.
- Existing spreadsheet continues to function unchanged.

---

## Phase 1 – Introduce FortuneSheet Workbook Skeleton

**Goals**
- Mount a FortuneSheet `<Workbook>` in isolation so we understand its configuration and data requirements.
- Keep the live spreadsheet tabs pointing at the existing ReactGrid while we evaluate FortuneSheet.

**Tasks**
- Create an experimental route that renders `<Workbook data={[{ name: "Sheet1" }]} />` alongside our CSS stack.
- Verify FortuneSheet’s CSS bundling plays well with Tailwind/Next.js (load `@fortune-sheet/react/dist/index.css`).
- Document the minimum sheet payload we need to generate.

**Validation**
- FortuneSheet renders in the sandbox view with working toolbar, formula editing, and tab UI.
- No global style regressions (check typography, resets, etc.).

---

## Phase 2 – Replace Current Spreadsheet Rendering

**Goals**
- Swap the existing `<Spreadsheet>` (ReactGrid) usage inside `SpreadsheetTabs` with FortuneSheet’s `<Workbook>` for read/write operations.
- Remove or disable ReactGrid-specific UI components (formula bar, toolbars) once their FortuneSheet equivalents are in place.

**Tasks**
- Map data from `SpreadsheetTab` (Zustand store) to FortuneSheet `Sheet` objects. For the initial cut, focus on text/number/formula cells, column widths, and tab metadata.
- Render `<Workbook>` inside `src/components/ui/spreadsheet-tabs.tsx` using transformed data.
- Reconcile FortuneSheet’s built-in sheet tabs with our `SortableTabItem` UI:
  - Option A (preferred): Use FortuneSheet tabs and disable our custom tab strip.
- Remove ReactGrid dependencies, cell templates, and standalone formula bar from the rendered tree. Leave the files in place until Phase 4 cleanup.

**Validation**
- Basic editing (text, number, formula) works in the main spreadsheet view.
- Adding/removing rows/columns behaves sensibly through FortuneSheet UI.
- No runtime errors from the old store reacting to FortuneSheet events.

---

## Phase 3 – State Management Migration

**Goals**
- Transition from the custom Zustand spreadsheet store + HyperFormula integration to FortuneSheet’s internal state handling.
- Ensure downstream consumers (AI tools, graph hooks, context helper) stay functional by adapting to the new data source.

**Tasks**
- Decide between:
  - **Full Adoption**: Remove `useSpreadsheetTabsStore` entirely and rely on FortuneSheet callbacks (`onOp`, `onChange`) to persist state.
  - **Hybrid**: Keep a slim Zustand store that mirrors FortuneSheet state for external consumers.
- Implement data synchronisation:
  - Wire `onOp` / `onChange` from `<Workbook>` to update the chosen state store.
  - Provide utility translators between FortuneSheet `Sheet` data and the structures expected by AI tools / graphs.
- Update `useSpreadsheetData`, `useMultipleSpreadsheetData`, and graph utilities to read from the new state representation.
- Remove HyperFormula-specific code (`src/lib/formula-engine.ts`, formula evaluation helpers) once FortuneSheet provides reliable calculations.

**Validation**
- AI spreadsheet tools (in `src/tools/spreadsheet-tools.ts`) operate correctly against the new state.
- Graph component renders datasets using the updated data access hooks.
- Undo/redo and formula evaluation behave as expected via FortuneSheet.

---

## Phase 4 – Feature Parity & UX Polish

**Goals**
- Rebuild or reconfigure features that were handled manually before (AI selection indicator, custom toolbars, delete confirmation, etc.).
- Ensure accessibility, keyboard shortcuts, and styling match product expectations.

**Tasks**
- Re-introduce bespoke UI touches on top of FortuneSheet APIs (e.g., AI “selection visible” badge, delete row/column confirmation flows) using the new API surface.
- Update CSS to align FortuneSheet visuals with our design system (Tailwind tokens, theme colors).
- Audit keyboard shortcuts and assistive tech behaviours; configure FortuneSheet settings or extend components as needed.
- Refresh documentation and component stories/examples to showcase the new integration.

**Validation**
- QA pass across supported browsers and input methods.
- Accessibility review (screen readers, tab order, ARIA attributes).
- Product sign-off on visual/interaction fidelity relative to the previous implementation.

---

## Phase 5 – Cleanup & Removal of Legacy Code

**Goals**
- Remove unused files and dependencies once FortuneSheet is fully in place.

**Tasks**
- Delete ReactGrid-related components (`Spreadsheet`, formula templates, utilities) and HyperFormula integration code that is no longer referenced.
- Drop unused schema/types (`@/types/spreadsheet`, etc.) after ensuring no other modules depend on them.
- Prune npm dependencies (`@silevis/reactgrid`, `hyperformula`, etc.) and regenerate lockfiles.
- Update README / internal docs to note the new architecture.

**Validation**
- `npm run lint`, `npm run check-types`, and `npm run build` succeed.
- `git grep` confirms removal of old package imports.

---

## Risks & Mitigations

- **Data Model Divergence** – FortuneSheet’s sheet schema differs from our current store. Don't write translations. Just create a new store, and ignore the old store... (does not need to be backwards compatible.)
- **Feature Regression** – Some bespoke features (AI hooks, selection context, charts) rely on exact state shapes. Mitigation: migrate those consumers in Phase 3 before removing the old store.
- **Bundle Size & Performance** – FortuneSheet is heavier. That's fine. Ignore that for now.
- **Styling Conflicts** – FortuneSheet ships global CSS. Mitigation: audit CSS precedence in Phase 1 and wrap styles with Tailwind tokens in a new phase 5.

---

## Appendix – Key Files Touching the Current Spreadsheet

- `src/components/ui/spreadsheet-tabs.tsx`
- `src/components/tambo/spreadsheet.tsx`
- `src/components/ui/formula-bar.tsx`, `src/components/ui/formula-autocomplete*`
- `src/lib/spreadsheet-tabs-store.ts`, `src/lib/spreadsheet-utils.ts`
- `src/lib/formula-engine.ts`, `src/lib/formula-functions.ts`
- `src/tools/spreadsheet-tools.ts`
- `src/hooks/useSpreadsheetData.ts`, `useMultipleSpreadsheetData.ts`
- `src/components/tambo/graph.tsx`
- `src/lib/spreadsheet-context-helper.ts`

Use this list to scope code searches during each phase.

