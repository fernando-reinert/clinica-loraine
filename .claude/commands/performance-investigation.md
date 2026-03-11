---
description: Investigate React performance issues, duplicate fetches, rerenders, remounts, and perceived reload behavior.
---

Investigate performance and stability issues in the specified area.

Workflow:
1. Inspect the target screen and all related hooks/services.
2. Map:
   - render triggers
   - effect dependencies
   - async fetch flows
   - loading state transitions
   - navigation mount/unmount behavior
3. Identify:
   - unnecessary rerenders
   - duplicate API calls
   - duplicate signed URL generation
   - expensive effects
   - full-screen loading resets
   - perceived F5/reload behavior on return navigation
4. Propose the smallest safe fix.
5. Implement only justified changes.
6. Avoid adding memoization without evidence.
7. After changes:
   - run build
   - summarize root cause
   - explain the fix
   - provide manual verification steps

Rules:
- Preserve current business behavior
- Do not redesign UI unless strictly necessary
- Do not refactor unrelated files
- Prefer stability and simplicity over cleverness

Expected output:
1. Root cause analysis
2. Minimal fix plan
3. Implemented fix
4. Build result
5. Remaining risks and manual verification