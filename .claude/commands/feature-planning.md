---
description: Create a senior-level implementation plan for a feature before writing code.
---

Create a production-grade implementation plan for the requested feature.

Workflow:
1. Understand the requested feature in the context of this repository.
2. Inspect the affected architecture and likely files.
3. Map:
   - impacted screens
   - hooks
   - services
   - Supabase tables/types
   - edge functions
   - routing implications
4. Identify:
   - technical risks
   - UX risks
   - release risks
   - data integrity risks
   - tenant isolation risks
5. Propose an incremental delivery plan with phases.
6. For each phase, define:
   - objective
   - affected files
   - implementation notes
   - regression risks
   - validation checklist
7. Do not write code unless explicitly asked after planning.

Rules:
- Optimize for low regression risk
- Prefer incremental delivery
- Preserve current contracts where possible
- Call out assumptions explicitly
- Think in production terms, not only implementation speed

Expected output:
1. Current architecture impact
2. Risks
3. Phased implementation plan
4. Validation plan
5. Recommended first phase