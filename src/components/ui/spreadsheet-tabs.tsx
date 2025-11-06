"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { Workbook, type WorkbookInstance } from "@fortune-sheet/react";
import type { Op } from "@fortune-sheet/core";
import {
  normalizeSheetForFortuneSheet,
  sheetHasInvalidMetrics,
  useFortuneSheet,
} from "@/lib/fortune-sheet-store";

type SpreadsheetTabsProps = React.HTMLAttributes<HTMLDivElement>;

const SpreadsheetTabs: React.FC<SpreadsheetTabsProps> = ({
  className,
  ...props
}) => {
  const {
    sheets,
    setSheets,
    registerWorkbook,
    setLastOps,
    replaceSheets,
  } = useFortuneSheet();
  const workbookRef = React.useRef<WorkbookInstance | null>(null);
  const [workbookKey, setWorkbookKey] = React.useState(0);
  const appliedFontRanges = React.useRef<
    Map<string, { rows: number; columns: number; applied: boolean }>
  >(new Map());

  const handleWorkbookRef = React.useCallback(
    (instance: WorkbookInstance | null) => {
      workbookRef.current = instance;
      registerWorkbook(instance);
    },
    [registerWorkbook]
  );

  React.useEffect(() => {
    return () => {
      workbookRef.current = null;
      registerWorkbook(null);
    };
  }, [registerWorkbook]);

  const handleChange = React.useCallback(
    (next: typeof sheets) => {
      setSheets(next);
    },
    [setSheets]
  );

  const handleOp = React.useCallback(
    (ops: Op[]) => {
      setLastOps(ops);
    },
    [setLastOps]
  );

  React.useEffect(() => {
    const workbook = workbookRef.current;
    const candidateSheets =
      (workbook &&
        typeof workbook.getAllSheets === "function" &&
        workbook.getAllSheets()) ||
      sheets;

    if (!Array.isArray(candidateSheets) || candidateSheets.length === 0) {
      return;
    }

    if (candidateSheets.some(sheetHasInvalidMetrics)) {
      const normalized = candidateSheets.map((sheet) =>
        normalizeSheetForFortuneSheet(sheet),
      );
      replaceSheets(normalized);
      setWorkbookKey((key) => key + 1);
    }
  }, [sheets, replaceSheets]);

  React.useEffect(() => {
    const workbook = workbookRef.current;
    if (!workbook) {
      return;
    }

    sheets.forEach((sheet) => {
      const sheetId = sheet.id;
      if (!sheetId) {
        return;
      }

      const rowCount =
        typeof sheet.row === "number" && Number.isFinite(sheet.row) && sheet.row > 0
          ? sheet.row
          : Array.isArray(sheet.data)
            ? sheet.data.length
            : 0;
      const firstRow = Array.isArray(sheet.data) ? sheet.data[0] : undefined;
      const columnCount =
        typeof sheet.column === "number" &&
        Number.isFinite(sheet.column) &&
        sheet.column > 0
          ? sheet.column
          : Array.isArray(firstRow)
            ? firstRow.length
            : 0;

      if (rowCount === 0 || columnCount === 0) {
        return;
      }

      const previousRange = appliedFontRanges.current.get(sheetId);
      if (
        previousRange &&
        rowCount <= previousRange.rows &&
        columnCount <= previousRange.columns
      ) {
        return;
      }

      if (previousRange && !previousRange.applied) {
        appliedFontRanges.current.set(sheetId, {
          rows: rowCount,
          columns: columnCount,
          applied: false,
        });
        return;
      }

      const sheetHasCustomFont = (() => {
        if (Array.isArray(sheet.celldata)) {
          for (const cell of sheet.celldata) {
            const value = cell?.v;
            if (value && typeof value === "object" && value.ff != null) {
              return true;
            }
          }
        }
        if (Array.isArray(sheet.data)) {
          for (const row of sheet.data) {
            if (!Array.isArray(row)) {
              continue;
            }
            if (row.some((cell) => cell && typeof cell === "object" && cell.ff != null)) {
              return true;
            }
          }
        }
        return false;
      })();

      if (!previousRange) {
        if (sheetHasCustomFont) {
          appliedFontRanges.current.set(sheetId, {
            rows: rowCount,
            columns: columnCount,
            applied: false,
          });
          return;
        }

        const targetRange = {
          row: [0, rowCount - 1] as [number, number],
          column: [0, columnCount - 1] as [number, number],
        };

        try {
          workbook.setCellFormatByRange("ff", "Arial", targetRange, { id: sheetId });
          appliedFontRanges.current.set(sheetId, {
            rows: rowCount,
            columns: columnCount,
            applied: true,
          });
        } catch (error) {
          console.error("Failed to apply default Arial font for sheet", sheetId, error);
        }

        return;
      }

      const newRanges: { row: [number, number]; column: [number, number] }[] = [];

      if (rowCount > previousRange.rows) {
        newRanges.push({
          row: [previousRange.rows, rowCount - 1],
          column: [0, columnCount - 1],
        });
      }

      if (columnCount > previousRange.columns && previousRange.rows > 0) {
        newRanges.push({
          row: [0, previousRange.rows - 1],
          column: [previousRange.columns, columnCount - 1],
        });
      }

      if (newRanges.length === 0) {
        return;
      }

      try {
        for (const range of newRanges) {
          const [rowStart, rowEnd] = range.row;
          const [colStart, colEnd] = range.column;
          if (rowStart > rowEnd || colStart > colEnd) {
            continue;
          }
          workbook.setCellFormatByRange("ff", "Arial", range, { id: sheetId });
        }
        appliedFontRanges.current.set(sheetId, {
          rows: rowCount,
          columns: columnCount,
          applied: true,
        });
      } catch (error) {
        console.error("Failed to apply default Arial font for sheet", sheetId, error);
      }
    });
  }, [sheets]);

  return (
    <div
      className={cn("w-full h-full flex flex-col", className)}
      style={{ minHeight: 400 }}
      {...props}
    >
      <Workbook
        key={workbookKey}
        ref={handleWorkbookRef}
        data={sheets}
        onChange={handleChange}
        onOp={handleOp}
      />
    </div>
  );
};

export default SpreadsheetTabs;
