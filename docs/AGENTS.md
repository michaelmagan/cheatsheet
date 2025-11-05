# Tambo Agents Cheat Sheet

## FortuneSheet Context
- `spreadsheet` helper returns the active sheet snapshot via the FortuneSheet store.
- `selection` helper reports the current FortuneSheet selection in A1 notation.
- `TabsState` interactable mirrors sheet ids and names so agents can target the correct tab.

## Tools
- Spreadsheet tools call into `fortuneSheetStore` and the mounted `Workbook` instance.
- Tab tools create FortuneSheet sheets with `createBlankSheet` and activate them immediately.

## Implementation Notes
- The FortuneSheet provider lives in `src/lib/fortune-sheet-store.tsx`.
- Selection context depends on `Workbook.getSelection()`, so the workbook must be mounted before issuing selection-aware requests.
- FortuneSheet utilities handle range parsing, lookups, and cell formatting.
# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains all Next.js application code. Key areas: `src/app/` for routes, `src/components/ui/` for FortuneSheet UI, `src/lib/fortune-sheet-store.tsx` for workbook state, and `src/tools/` for Tambo agent tools.
- `docs/` holds migration notes and planning artefacts.
- `public/` stores static assets. Avoid mixing runtime data with static files.
- `node_modules/` is managed by npm; do not commit changes there.

## Build, Test, and Development Commands
- `npm run dev` starts the Next.js dev server with hot reload.
- `npm run build` produces a production build; watch for SSR warnings (`TamboProvider must be used within a browser`) and address in follow-up work.
- `npm run lint` runs ESLint across the project. Fix or justify any warnings before committing.
- `npm run check-types` runs TypeScript for type checking. Resolve all errors.

## Coding Style & Naming Conventions
- TypeScript and React (with the App Router) are mandatory; prefer functional components.
- Use 2-space indentation and keep files ASCII unless domain data requires otherwise.
- Name components with `PascalCase`, hooks with `useCamelCase`, utility modules with `kebab-case`.
- Follow existing module boundaries (e.g., FortuneSheet helpers live in `src/lib/fortune-sheet-*.ts`).
- Run `npm run lint` before submitting changes; the repo does not auto-format on commit.

## Testing Guidelines
- No automated test harness is configured yet. When adding tests, colocate them in `src/__tests__/` using Playwright or Vitest and document how to run them.
- Provide manual verification notes in PR descriptions until automated coverage exists.

## Commit & Pull Request Guidelines
- Write commits in the imperative mood (`Add FortuneSheet utils`, `Fix selection context`).
- Keep commits scoped; avoid mixing refactors with feature work.
- Pull requests should include: purpose summary, testing details (commands run, screenshots for UI), and links to relevant issues or docs.
- If changing Tambo agent behaviours or APIs, mention the affected tool/ component names explicitly so reviewers can trace updates.

## Agent-Specific Instructions
- Register new AI tools/components in `src/lib/tambo.ts`.
- Context helpers (spreadsheet, selection) must tolerate SSR absence—return `null` when `window` is undefined.
- FortuneSheet operations must go through the shared provider; avoid local state forks that drift from `fortuneSheetStore`.
