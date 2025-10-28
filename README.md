# Generative UI Analytics Template

This is a generative UI analytics template.

Generate graphs with natural language and use natural language to interact with and manage the UI.

## Features

- Generate graphs inside the chat
- Drag and drop onto a canvas
- Edit canvases with natural language in the chat

## Demo

<video src="./2025-08-30-tambo-analytics.mp4" controls width="720"></video>

## Get Started

1. Run `gh repo clone tambo-ai/tambo-analytics-template` for a new project

2. `cd tambo-analytics-template`

3. `npm install`

4. `npx tambo init`
   - or rename `example.env.local` to `.env.local` and set:

     ```env
     NEXT_PUBLIC_TAMBO_API_KEY=your-api-key
     ```

5. Run `npm run dev` and go to `localhost:3000` to use the app!

## Roadmap

- Test with SQL mcp servers
- Add a Component for executing SQL
- Add a component for executing Python Transformations

## App structure at a glance

- **Next.js app**: Pages under `src/app/`.
  - `src/app/page.tsx`: landing page.
  - `src/app/chat/page.tsx`: main chat interface.

- **Component registration and chat wiring**: See `src/lib/tambo.ts` and `src/app/chat/page.tsx`.

- **Generatable components (created by chat)**: Components the AI can instantiate in the thread, e.g. `src/components/tambo/graph.tsx`, registered in `src/lib/tambo.ts`.

- **Editable/readable components (stateful UI the chat can modify or inspect)**:
  - Canvas state in `src/lib/canvas-storage.ts` (Zustand) with canvases and items.
  - Canvas UI and interactions in `src/components/ui/components-canvas.tsx` and related interactable components like `interactable-tabs.tsx`, `interactable-canvas-details.tsx`.
  - The chat can update existing components or read current canvas state via the registered tools/hooks that back the chat experience.

For more detailed documentation, visit [Tambo's official docs](https://tambo.co/docs).

## How it works

Register components the AI can render, with schemas for safe props:

```tsx
// src/lib/tambo.ts (excerpt)
import { Graph, graphSchema } from "@/components/tambo/graph";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import type { TamboComponent } from "@tambo-ai/react";

export const components: TamboComponent[] = [
  {
    name: "Graph",
    description: "Render charts (bar/line/pie)",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCards",
    description: "Selectable list of info",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
];
```

Wire the chat and the editable canvas UI:

```tsx
// src/app/chat/page.tsx (excerpt)
"use client";
import { TamboProvider } from "@tambo-ai/react";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import ComponentsCanvas from "@/components/ui/components-canvas";
import { InteractableTabs } from "@/components/ui/interactable-tabs";
import { InteractableCanvasDetails } from "@/components/ui/interactable-canvas-details";
import { components, tools } from "@/lib/tambo";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Chat() {
  const mcpServers = useMcpServers();
  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
    >
      <TamboMcpProvider mcpServers={mcpServers}>
        <div className="flex h-full">
          <MessageThreadFull contextKey="tambo-template" />
          <div className="hidden md:block w-[60%]">
            <InteractableTabs interactableId="Tabs" />
            <InteractableCanvasDetails interactableId="CanvasDetails" />
            <ComponentsCanvas className="h-full" />
          </div>
        </div>
      </TamboMcpProvider>
    </TamboProvider>
  );
}
```

## Customizing

### Change what components the AI can control

You can see how the `Graph` component is registered with tambo in `src/lib/tambo.ts`:

```tsx
const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema, // zod schema for the component props
  },
  // Add more components
];
```

You can find more information about the options [here](https://tambo.co/docs/concepts/registering-components)

P.S. We use Tambo under the hood to manage chat state, which components the AI can render, and which components the AI can interact with. Tambo is 100% open source — see the repository at [tambo-ai/tambo](https://github.com/tambo-ai/tambo).
