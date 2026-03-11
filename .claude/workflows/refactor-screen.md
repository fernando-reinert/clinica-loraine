# Refactor Screen Workflow

## Objective
Refactor a screen safely without breaking existing behavior.

## When to use
- Screen is visually polluted
- File is too large
- Responsibilities are mixed
- Navigation feels unstable
- Repeated logic is spreading across the screen

## Steps
1. Read the screen and related hooks/services/components
2. Diagnose structure, UX issues, and performance risks
3. Separate problems into:
   - UI clarity
   - component extraction
   - state management
   - data flow
   - performance
4. Propose a phased plan
5. Implement only one phase
6. Run build
7. Provide manual QA

## Guardrails
- No broad rewrites
- No hidden behavior changes
- No route/data contract changes unless required
- No weakening tenant isolation
- No unnecessary abstraction

## Deliverable
- diagnosis
- phase plan
- implemented phase
- build result
- risks
- QA checklist