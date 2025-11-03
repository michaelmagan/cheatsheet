---
description: "Research and create implementation plan"
argument-hint: "<feature request>"
model: inherit
allowed-tools: [Task, AskUserQuestion, Read, Glob, Grep, WebSearch, WebFetch]
---

Create a comprehensive implementation plan for the following feature request:

**Feature Request:** $ARGUMENTS

Before I start planning, I want to make sure I understand what we're building. Let me ask some clarifying questions:

[Ask natural questions like a developer would ask a product person to understand scope, requirements, constraints, user needs, edge cases, and any technical preferences or concerns. Focus on what's unclear or ambiguous about the request.]

---

**Step 2: Confirm Understanding**

[After user provides clarifications, summarize the feature requirements and get confirmation]

---

**Step 3: Create Planning Todo List**

Use TodoWrite to create a planning todo list:
- Clarify requirements (mark as completed)
- Initial codebase research
- Parallel deep research (will break down into subtasks)
- Synthesize plan document

---



**Step 4: Parallel Deep Research**

Update todo list with 2-8 specific research tasks based on initial findings. Mark "Parallel deep research" as in_progress.

Launch multiple research agents in parallel (in a SINGLE message with multiple Task calls):

```
/task researcher "Research how to implement [specific aspect] using [technology X].
Find: key APIs, best practices, implementation patterns, gotchas.
Include documentation links."

/task researcher "Deep dive into [specific part of codebase].
Analyze: current implementation, what needs to change, dependencies to consider."

[Include 2-8 Task calls in one message based on complexity]
```

After all agents complete, mark research tasks as completed.

---

**Step 5: Synthesize Plan**

Mark "Synthesize plan document" as in_progress.

Calle the `planner` agent with the research context needed to generatel the pnal

Create the implementation plan document at `.claude/.plans/[feature-name].md` with all research findings:

Create a focused plan with this structure:

# Feature: [Feature Name]

## Overview

[2-3 sentences: what will be built and why]

## Key Design Decisions

- **Decision 1**: [Brief rationale]
- **Decision 2**: [Brief rationale]
- **Decision 3**: [Brief rationale]

## Architecture

[Mermaid diagram or brief description of data flow]

- Keep the mermaid diagrams simple.
- Split into multiple diagrams.
- Go from highlevel to deatiled.

## Component Schema/Interface

[Show the key prop schema or interface - this helps validate the design]

```typescript
// Example of what AI will generate
{
  prop1: "value",
  prop2: { ... }
}
```

## File Structure

```
src/
  ├── components/
  │   ├── new-file.tsx (NEW)
  │   └── existing-file.tsx (MODIFIED)
  ├── hooks/
  │   └── useCustomHook.ts (NEW)
```

## Implementation Phases

### Phase 1: [Phase Name]

[1 sentence: what this phase accomplishes]

**Files:**

- `path/to/file1.ts` (NEW) - [Brief description]
- `path/to/file2.tsx` (MODIFIED) - [Brief description]

**Key Implementation Details:**

- Task 1: [Specific actionable task]
- Task 2: [Specific actionable task]

[Include pseudocode ONLY for the most complex/critical logic:]

```pseudo
function complexOperation(data):
  // Parse and validate
  coords = parseA1Notation(range)

  // Transform data
  cells = extractCells(coords)
  values = cells.map(cell => getValue(cell))

  // Subscribe to changes
  subscribe(store, () => refetch())
```

### Phase 2: [Phase Name]

[Continue pattern...]

## Out of Scope (v1)

List features explicitly excluded from v1 to keep implementation focused. Include brief rationale for each.

- **Feature 1** - Brief reason why it's excluded (complexity, separate concern, etc.)
- **Feature 2** - Brief reason why it's excluded
- **Feature 3** - Brief reason why it's excluded

---

**GUIDELINES:**

**DO:**

- Keep plans concise and scannable
- Show example data/schemas to ground the design
- Include pseudocode only for complex/non-obvious logic
- Focus on WHAT needs to be done, not every line of code
- Break into logical phases (typically 3-5 phases)
- Mark files that can be done in parallel
- Include single "Out of Scope (v1)" section listing all excluded features with rationale

**DON'T:**

- Include time estimates or effort levels
- Write out full code implementations with imports
- Duplicate scope boundaries (combine "avoid" and "future" into single "Out of Scope" section)
- Add extensive testing sections (just note key testing considerations)
- Repeat obvious tasks (e.g., "import React")

**PSEUDOCODE USAGE:**
Show pseudocode for:

- Complex algorithms or transformations
- Non-obvious data flows
- Critical state management patterns
- Edge case handling that needs clarity

Skip pseudocode for:

- Simple CRUD operations
- Standard React patterns
- Obvious utility functions

Save the plan to `.plans/[feature-name].md` in the root directory using the Write tool.