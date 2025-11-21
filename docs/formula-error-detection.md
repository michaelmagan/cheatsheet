# Formula Error Detection in FortuneSheet

## Problem Statement

When writing formulas with errors (like `=1/0` or `=SUMM(A1)`), the `updateSpreadsheetCells` tool was not detecting the errors immediately after calling `calculateFormula()`. All attempts to read the calculated cell data returned either `null` or objects with `undefined` properties.

### Failed Approaches

1. **`workbook.getCellValue(row, column, { id: sheetId })`**
   - Result: Returns `null` immediately after `calculateFormula()`

2. **`sheet.data[row][column]` via `workbook.getSheet()`**
   - Result: Cell object exists but all properties are `undefined`:
     ```javascript
     {
       v: undefined,    // raw value
       m: undefined,    // display value
       f: undefined,    // formula
       ct: undefined    // cell type
     }
     ```

3. **`sheet.celldata.find(entry => entry.r === row)`**
   - Result: Same as approach #2 - object exists but properties are `undefined`
   - Discovery: `celldata` is only used for initial loading, never updated by `calculateFormula()`

## Root Cause

FortuneSheet has a complex data synchronization model:

### Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Internal Context (ctx.luckysheetfile[].data)                │
│ - Updated SYNCHRONOUSLY by calculateFormula()               │
│ - Source of truth for all calculations                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
              (React batches updates asynchronously)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ External API Layer                                           │
│ - workbook.getSheet() → Returns STALE snapshot              │
│ - fortuneSheetStore.getSheetById() → Returns STALE copy     │
│ - workbook.getCellValue() → May read from stale cache       │
└─────────────────────────────────────────────────────────────┘
```

### The Timing Problem

1. `workbook.calculateFormula(sheetId, range)` calls internal `setCellValue()` which updates `ctx.luckysheetfile[sheetIndex].data[row][column]` **synchronously**

2. However, the FortuneSheet React wrapper uses `setContext()` with Immer's `produceWithPatches()` which batches state updates in React's event loop

3. When we immediately call `workbook.getSheet()` or `getCellValue()`, these APIs return data from the external layer which **hasn't been updated yet**

## Solution

### Multi-Source Data Access with Microtask Flushing

The fix involves two key changes:

#### 1. Access Internal Context Directly

Try multiple data sources in priority order:

```typescript
function buildCellEvaluation(workbook, sheetId, row, column) {
  let cell = null;
  let dataSource = "unknown";

  // Approach 1: Try internal context (LIVE data)
  try {
    const context = (workbook as any).context;
    if (context?.luckysheetfile) {
      const sheetIndex = context.luckysheetfile.findIndex(
        (s: any) => s.id === sheetId
      );
      if (sheetIndex !== -1) {
        const internalSheet = context.luckysheetfile[sheetIndex];
        cell = internalSheet.data?.[row]?.[column] ?? null;
        dataSource = "internal_context";
      }
    }
  } catch (e) {
    console.log(`[BUILD EVAL] Could not access internal context:`, e);
  }

  // Approach 2: Try fortuneSheetStore (React store)
  if (!cell || !cell.v) {
    const storeSheet = fortuneSheetStore.getSheetById(sheetId);
    if (storeSheet) {
      cell = storeSheet.data?.[row]?.[column] ?? null;
      dataSource = "fortune_sheet_store";
    }
  }

  // Approach 3: Try workbook.getSheet() (fallback)
  if (!cell || !cell.v) {
    const sheet = workbook.getSheet({ id: sheetId });
    if (sheet) {
      cell = sheet.data?.[row]?.[column] ?? null;
      dataSource = "workbook_getSheet";
    }
  }

  return cell;
}
```

#### 2. Flush React's Event Loop

Wait for React to propagate changes from internal Context to external APIs:

```typescript
async function calculateFormulaAndWait(workbook, sheetId, range) {
  // Trigger calculation - updates internal Context synchronously
  workbook.calculateFormula(sheetId, range);

  // Wait for React's microtask queue to flush
  await Promise.resolve(); // Flush current microtask
  await Promise.resolve(); // Flush any chained microtasks
  await new Promise(resolve => setTimeout(resolve, 0)); // Flush macrotask queue
}
```

### Why This Works

1. **Internal context access**: Bypasses the stale external API layer and reads directly from the live data that `calculateFormula()` updates

2. **Microtask flushing**: Gives React time to propagate changes from the internal Context to the store and external APIs, so fallback approaches work if internal context is inaccessible

3. **Multiple fallbacks**: Ensures robustness - if one data source fails, others provide the calculated values

## Error Detection Flow

Once we have access to the calculated cell data, error detection works through multiple checks:

```typescript
function detectErrorFromCell(cell, rawValue, displayValue) {
  // 1. Check display value (most reliable)
  if (typeof displayValue === "string" &&
      EXCEL_ERROR_PATTERN.test(displayValue.trim())) {
    return displayValue; // e.g., "#DIV/0!"
  }

  // 2. Check raw value
  if (typeof rawValue === "string" &&
      EXCEL_ERROR_PATTERN.test(rawValue.trim())) {
    return rawValue;
  }

  // 3. Check cell type flag
  if (cell?.ct?.t === "e") {
    const display = cell.m ?? cell.v ?? rawValue;
    if (display && EXCEL_ERROR_PATTERN.test(display.trim())) {
      return display;
    }
  }

  return null; // No error detected
}
```

The error pattern recognizes Excel error codes with or without prefix:
```javascript
const EXCEL_ERROR_PATTERN =
  /^#?(NULL!?|DIV\/0!?|VALUE!?|REF!?|NAME\??|NUM!?|N\/A|...)/i;
```

## Error Normalization

Error codes are normalized to standard Excel format:

```typescript
function normalizeErrorCode(errorCode: string): string {
  let normalized = errorCode.trim().toUpperCase();

  // Add # prefix if missing
  if (!normalized.startsWith("#")) {
    normalized = `#${normalized}`;
  }

  // Add ! suffix if missing (except for #NAME? and #N/A)
  if (!normalized.endsWith("!") && !normalized.endsWith("?") &&
      normalized !== "#N/A") {
    if (normalized === "#NAME") {
      normalized = "#NAME?";
    } else {
      normalized = `${normalized}!`;
    }
  }

  return normalized; // e.g., "DIV/0" → "#DIV/0!"
}
```

## Result Format

When formulas contain errors, the tool returns:

```typescript
{
  success: true,  // Cells WERE written successfully
  message: "Successfully wrote 1 cell(s), but 1 formula(s) contain errors...",
  summary: {
    total: 1,
    withoutErrors: 0,
    withErrors: 1
  },
  formulaErrors: {
    count: 1,
    note: "The cells were successfully updated, but the formulas contain errors..."
  },
  firstError: {
    address: "A1",
    formula: "=1/0",
    value: "DIV/0",
    error: {
      type: "division_error",
      code: "#DIV/0!",
      resolution: "Division by zero detected. Check if denominator cell is zero..."
    }
  }
}
```

### Key Design Decision

`success: true` means **cells were written successfully**, not that formulas are valid. This prevents infinite loops where the agent thinks the write operation failed when it actually succeeded but the formula has errors.

## Verification

The fix can be verified with these test cases:

### Division by Zero
```javascript
updateSpreadsheetCells({ cells: [{ address: "A1", value: "=1/0" }] })
// Returns: error.code = "#DIV/0!", error.type = "division_error"
```

### Unknown Function
```javascript
updateSpreadsheetCells({ cells: [{ address: "A1", value: "=SUMM(A2:A5)" }] })
// Returns: error.code = "#NAME?", error.type = "formula_error"
```

### Valid Formula
```javascript
updateSpreadsheetCells({ cells: [{ address: "A1", value: "=SUM(1,2,3)" }] })
// Returns: success: true, withErrors: 0, rawValue: 6
```

## Implementation Files

- **`src/tools/spreadsheet-tools.ts`**: Main implementation
  - `buildCellEvaluation()`: Multi-source data access (lines 349-431)
  - `calculateFormulaAndWait()`: Microtask flushing (lines 440-457)
  - `detectErrorFromCell()`: Error detection logic (lines 278-346)

- **`src/lib/spreadsheet-error-resolver.ts`**: Error handling utilities
  - `normalizeErrorCode()`: Error code normalization (lines 19-38)
  - `determineErrorType()`: Error categorization (lines 46-68)
  - `getErrorSpecificResolution()`: Resolution guidance (lines 76-116)

## Key Learnings

1. **FortuneSheet's data model** has multiple layers with different sync characteristics
2. **React state management** introduces async delays even when underlying calculations are synchronous
3. **Internal APIs** may be necessary when external APIs don't expose live data
4. **Event loop flushing** can bridge the gap between sync internal updates and async external propagation
5. **Defensive fallbacks** ensure robustness across different execution contexts

## References

- FortuneSheet source: `node_modules/@fortune-sheet/core/dist/index.esm.js`
  - Line 67076: `calculateFormula(ctx, id, range)`
  - Line 60440: `setCellValue(ctx, r, c, d, v)` - writes directly to `data[r][c]`
  - Line 60520-60530: Error detection logic in `setCellValue`

- Commit: `cbc3d20` - Fix formula error detection by accessing internal FortuneSheet context
