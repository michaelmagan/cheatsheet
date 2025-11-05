"use client";

import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";

export default function FortuneDemoPage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-6 bg-background text-foreground">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">FortuneSheet Sandbox</h1>
        <p className="text-sm text-muted-foreground">
          Temporary development route for evaluating the FortuneSheet workbook
          during migration. The workbook below uses the default configuration
          with a single blank sheet.
        </p>
      </section>

      <div className="flex-1 min-h-0">
        <div className="h-[640px] w-full rounded-lg border border-border bg-white shadow-sm">
          <Workbook
            data={[
              {
                id: "sheet-1",
                name: "Sheet1",
                row: 36,
                column: 18,
                status: 1,
                order: 0,
                hide: 0,
                showGridLines: 1,
                defaultRowHeight: 19,
                defaultColWidth: 73,
                config: {},
                celldata: [
                  {
                    r: 0,
                    c: 0,
                    v: {
                      v: "Hello FortuneSheet",
                      m: "Hello FortuneSheet",
                    },
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
