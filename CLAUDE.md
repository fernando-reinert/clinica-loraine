# CLAUDE.md

This file provides operational guidance to Claude Code when working in this repository.

## Mission

Maintain and evolve this codebase with production-grade standards:

- preserve correctness
- minimize regression risk
- improve clarity, performance, and maintainability
- keep changes small, reviewable, and reversible
- protect tenant isolation and data integrity

The project should evolve incrementally with high confidence changes.

---

# Operating Principles

Claude should always:

- Prefer small, low-risk changes over broad refactors
- Preserve existing behavior unless explicitly instructed otherwise
- Avoid speculative rewrites
- Maintain compatibility with current routes, APIs, and contracts
- Treat data isolation and tenant safety as critical

Before editing any file Claude must:

1. Understand current implementation
2. Identify impacted files
3. Identify possible regressions
4. Propose a minimal change plan

After implementing changes Claude must:

- Run build
- Summarize changes
- Provide manual QA checklist

---

# Commands

## Development

```bash
npm run dev
```

## Production build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Edge Functions deploy

```bash
supabase functions deploy <functionName>
```

### Windows note

Use Supabase CLI via Scoop.

```bash
scoop install supabase
supabase link --project-ref vwmzyfjqprutlaevmsjk
```

---

# Architecture Overview

Stack:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- MUI v5
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- React Router v6

---

# Provider Hierarchy

Located in `src/App.tsx`

```
SupabaseProvider
AuthProvider
OfflineProvider
BrowserRouter
```

Responsibilities:

**SupabaseProvider**  
Provides typed Supabase client.

**AuthProvider**  
Manages session and user.

**OfflineProvider**  
Handles network state.

---

# Data Layer Pattern

Data fetching must follow this pattern:

```
Screen → Hook → Service → Supabase
```

Screens must not contain complex Supabase queries.

Hooks:

```
src/hooks/
```

Services:

```
src/services/
```

---

# Multi-Tenant Safety Rules

The application is multi-tenant.

Critical fields:

- tenant_id
- professional_id
- user.id
- role

Rules:

- Never weaken tenant isolation
- Never remove professional filters
- Never expose cross-tenant data
- Always assume RLS policies exist

---

# Frontend Rules

Screens:

```
src/screens/
```

Components:

```
src/components/
```

Guidelines:

- Screens orchestrate logic
- Components render UI
- Avoid large screen files
- Extract reusable components

UX priorities:

- reduce visual clutter
- maintain consistent spacing
- prioritize readability
- avoid unnecessary visual effects
- improve responsiveness

---

# React Performance Rules

Claude must watch for:

- unnecessary rerenders
- duplicate API calls
- expensive effects
- navigation remount issues
- full screen loading resets

Use memoization only when justified.

---

# Edge Function Rules

Edge functions live in:

```
supabase/functions/
```

Rules:

- keep functions small
- maintain auth checks
- maintain CORS configuration
- do not change integration contracts silently
- fail clearly with descriptive errors

---

# Storage Buckets

All buckets are private.

**signatures**

```
{patient_id}/consents/{visitId}/
```

**before_after**

Procedure sticker photos.

**patient-photos**

Patient profile photos.

---

# Styling System

Global styles:

```
src/styles/futurist.css
src/styles/neonTokens.css
```

Visual language:

- futuristic
- neon accents
- dark theme

But usability always takes priority over decoration.

---

# Definition of Done

A task is only complete when:

1. Requested change implemented
2. Build passes
3. Files changed are summarized
4. Regression risks are explained
5. Manual QA checklist is provided