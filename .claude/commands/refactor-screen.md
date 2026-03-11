---
description: Safely refactor a screen with minimal regression risk, preserving behavior and validating build.
---

Refactor this screen using a phased, low-risk approach.

Workflow:
1. Inspect the target screen and all directly related hooks/services/components.
2. Explain the current structure, data flow, and likely pain points.
3. Identify:
   - visual clutter
   - oversized responsibilities
   - repeated logic
   - performance risks
   - regression risks
4. Propose a phased refactor plan before editing.
5. Implement only the smallest high-value phase.
6. Preserve:
   - business logic
   - route contracts
   - Supabase contracts
   - tenant/professional scoping
7. After changes:
   - run build
   - summarize changed files
   - list regression risks
   - provide a manual QA checklist

Rules:
- Prefer small, reviewable diffs
- Do not perform broad rewrites
- Do not silently change behavior
- Do not weaken multi-tenant safety
- If the screen is too large, extract cohesive UI blocks into components with minimal behavioral change

Expected output:
1. Current diagnosis
2. Refactor plan
3. Implemented phase
4. Build result
5. Risks and manual QA