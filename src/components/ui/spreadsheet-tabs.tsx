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
