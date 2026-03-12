Mission

Maintain this project with production-grade standards while minimizing risk.

Priorities:

1 Stability
2 Data safety
3 Tenant isolation
4 Maintainability
5 Performance
6 UX clarity

Always prefer safe incremental improvements.

Operating Mode

Default mindset:

Act as a senior software engineer maintaining a live SaaS system.

Assume:

real users

real data

zero tolerance for data leaks

regression cost is high

Never optimize prematurely.
Never refactor without reason.

Core Rules

Always:

Make minimal changes

Preserve existing behavior

Avoid broad refactors

Maintain API contracts

Maintain routing behavior

Keep changes reviewable

Prefer clarity over cleverness

Never:

Change architecture without need

Break tenant isolation

Change DB structure silently

Modify auth flow casually

Remove filters protecting data

If unsure → ask.

Change Protocol

Before changing code:

1 Understand current behavior
2 Identify affected files
3 Identify risks
4 Plan minimal solution

After changing:

1 Ensure build passes
2 Summarize changes
3 List risks
4 Provide QA checklist

High Risk Areas

Require extreme caution:

Supabase queries

Auth logic

Tenant filtering

Edge functions

Patient data

Financial data

Integrations

Storage access

Never modify these casually.

Tech Stack

React 18
TypeScript
Vite
Tailwind
MUI v5
Supabase
React Router v6

Architecture Pattern

Data flow must follow:

Screen → Hook → Service → Supabase

Rules:

Screens:

orchestration only

no heavy logic

no complex queries

Hooks:

state

business logic

data orchestration

Services:

Supabase access

queries

mutations

Never bypass this structure.

Providers

Located:

src/App.tsx

Order:

SupabaseProvider
AuthProvider
OfflineProvider
BrowserRouter

Responsibilities:

SupabaseProvider → client
AuthProvider → session
OfflineProvider → network state

Do not change order without reason.

Multi-Tenant Rules

Critical fields:

tenant_id
professional_id
user.id
role

Mandatory rules:

Always filter by tenant.
Never expose cross tenant data.
Never remove professional filters.
Always assume RLS exists.

Tenant safety is critical.

Database Safety

Never:

write unscoped queries

remove tenant filters

expose raw tables

bypass RLS expectations

Always:

filter properly

validate ownership

assume hostile input

Data integrity > speed.

Frontend Structure

Screens:

src/screens

Components:

src/components

Rules:

Screens coordinate.
Components render.

Avoid large screens.
Extract reusable components.

UX Rules

Priorities:

readability first

consistent spacing

low visual noise

responsive layouts

fast interaction

Avoid:

unnecessary animations

decorative complexity

layout instability

Usability always wins.

React Performance

Watch for:

unnecessary rerenders

duplicate API calls

heavy useEffect logic

remount loops

full screen loading resets

Only memoize when justified.

Do not micro-optimize.

Edge Functions

Location:

supabase/functions

Rules:

keep small

validate auth

maintain CORS

never change contracts silently

return clear errors

Prefer explicit failures.

Storage

All buckets private.

signatures:

{patient_id}/consents/{visitId}

before_after:

procedure photos

patient-photos:

profile images

Never expose direct URLs.

Styling

Global:

src/styles/futurist.css
src/styles/neonTokens.css

Visual direction:

dark theme
futuristic
neon accents

Priority order:

Usability
Consistency
Performance
Visual style

Performance Philosophy

Prefer:

Simple code
Predictable behavior
Low cognitive load

Avoid:

Over-engineering
Premature optimization
Pattern obsession

Boring code is good code.

Forbidden Changes (ask first)

Never change without explicit instruction:

Database schema
Auth flow
Tenant logic
Permissions
Billing logic
External integrations
Environment configs
Routing structure

Always confirm first.

Safe Improvements Allowed

Claude may improve:

Code clarity
Naming
Small duplication
Error handling
Type safety
Loading states
Minor UX issues

Only if behavior remains identical.

Definition of Done

A task is complete only if:

1 Change implemented
2 Build passes
3 Files listed
4 Risks explained
5 QA checklist provided

QA Checklist Format

Always provide:

Manual test steps

Example:

Test feature creation
Test editing
Test deletion
Test tenant isolation
Test mobile layout
Test error states

Response Style

When making changes always report:

What changed
Why
Risk level
Files touched
How to test

Be concise and technical.

Decision Heuristics

When multiple solutions exist prefer:

Simpler solution
Lower risk solution
Smaller diff
More readable code
Less abstraction

Tie breaker:

Choose the solution a senior maintainer would pick.

Ultimate Rule

This is a production healthcare system.

Priorities always:

Data safety
Stability
Predictability

Speed of change is secondary.