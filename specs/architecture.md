# Technical Architecture

## 1. Architecture

Preferred stack when not already dictated by the repository:

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- OpenAI API
- Vercel

Preserve an existing reasonable stack rather than migrating unnecessarily.

## 2. High-level flow

Browser
→ Next.js UI
→ Server-side application/API
→ AI service and Supabase
→ PostgreSQL

API keys must never be exposed to the browser.

## 3. Suggested application layers

### UI
React components and pages.

### Application
Server actions/API routes responsible for orchestrating workflows.

### Domain
Business logic:
- profile generation
- path generation
- path selection
- experiment generation
- check-in analysis
- direction updates

### Infrastructure
- Supabase client
- AI provider client
- analytics
- external services

Keep domain logic independent from React where practical.

## 4. AI service boundary

Create explicit functions/services such as:

- `generateProfile`
- `updateProfile`
- `generateCandidatePaths`
- `rankPaths`
- `generatePathExplanation`
- `generateExperiment`
- `generateRoadmap`
- `analyzeCheckIn`
- `updateDirection`

Prompts should be centralized/versioned and easy to modify.

### Implementation (MVP)

`src/server/ai/` — server-only:
- `prompts.ts` — one versioned prompt per operation.
- `client.ts` — OpenAI Responses API with strict JSON-schema output derived from the Zod schemas in `src/domain/schemas.ts`; `store: false`; per-call timeouts.
- `openai.ts` — the provider: `conversationTurn`, `generateProfile`, `generatePaths`, `generateRoadmap` (experiment + roadmap together, so tasks and "this week" stay consistent), `analyzeCheckIn` (evidence only), `updateDirection` (decision only).
- `service.ts` — validates every output; retries once on malformed output or transient errors (not timeouts/auth).
- `mock.ts` — deterministic provider for tests and local development without a key; refused in production.

`generateExperiment`, `rankPaths` and `generatePathExplanation` are folded into `generateRoadmap` and `generatePaths` for the MVP. Profile updates after check-ins are not yet implemented; check-in learnings are stored as insights.

The coach decides when the conversation is complete, with a floor of 3 user messages so a single message can't produce a profile.

## 5. AI output

Prefer structured JSON schemas.

Validate AI output before persistence.

If invalid:
- retry where appropriate,
- otherwise return a recoverable error,
- never persist malformed AI output.

## 6. Authentication

Use Supabase Auth when available.

Required MVP capabilities:
- sign in/sign up or magic link
- sign out
- protected authenticated experience
- persistent user progress

## 7. Authorization

All user-owned records must be protected with Supabase Row Level Security.

A user must never be able to read or mutate another user's:
- profile
- conversations
- messages
- paths
- experiments
- tasks
- check-ins
- insights
- roadmap

## 8. Observability

Log useful server-side failures without logging sensitive conversation content unnecessarily.

Track product events defined in `analytics.md`.

## 9. Scalability principle

Optimize for clarity and iteration speed, not scale.

Do not introduce:
- microservices
- queues
- vector databases
- event buses
- multi-agent systems

unless a demonstrated MVP requirement needs them.
