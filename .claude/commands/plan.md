**Step 1: Clarify Requirements**

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

**Step 4: Initial Codebase Research**

Mark "Initial codebase research" as in_progress, then launch researcher agent:
```
/task general-purpose "Analyze the codebase to understand:
1. What existing technologies/packages are in use (check package.json, imports, etc.)
2. Current architecture patterns
3. High-level list of files that will likely need modification
4. Key integration points

Feature context: [confirmed requirements]"
```

After agent completes, mark task as completed and update todos with specific research areas discovered.

---

**Step 5: Parallel Deep Research**

Update todo list with 2-8 specific research tasks based on initial findings. Mark "Parallel deep research" as in_progress.

Launch multiple research agents in parallel (in a SINGLE message with multiple Task calls):

```
/task general-purpose "Research how to implement [specific aspect] using [technology X].
Find: key APIs, best practices, implementation patterns, gotchas.
Include documentation links."

/task general-purpose "Deep dive into [specific part of codebase].
Analyze: current implementation, what needs to change, dependencies to consider."

[Include 2-8 Task calls in one message based on complexity]
```

After all agents complete, mark research tasks as completed.

---

**Step 6: Synthesize Plan**

Mark "Synthesize plan document" as in_progress.

Create the implementation plan document at `.claude/.plans/[feature-name].md` with all research findings:

**Plan Document Structure:**
- Feature overview and requirements
- Architecture approach
- Implementation phases (ordered steps)
- Files to modify/create (with specific changes)
- Testing strategy
- Potential risks and mitigations

Mark task as completed when plan document is written.
