# Performance Investigation Workflow

## Objective
Diagnose and fix performance or stability issues with minimal regression risk.

## When to use
- Screen feels like full reload
- Duplicate requests appear
- Navigation back causes reset
- Heavy components rerender too often
- Loading state is disruptive

## Investigation checklist
- Which state changes trigger rerender?
- Which effects run too often?
- Is there remount caused by routing/key changes?
- Are async calls duplicated?
- Are loading states too broad?
- Is memoization missing or overused?
- Is derived state causing churn?

## Fix strategy
1. Confirm the root cause
2. Prefer smallest safe fix
3. Avoid broad refactor
4. Preserve behavior
5. Validate with build and manual QA

## Deliverable
- root cause
- minimal fix
- changed files
- build result
- verification checklist