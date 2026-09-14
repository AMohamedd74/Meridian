# Purpose (Meridian)

An AI-powered life and career direction app for people who feel stuck, overwhelmed or unsure what to do next. The product is called Purpose in the specs and shown as **Meridian** in the app.

Purpose doesn't claim to find anyone's "true purpose" or perfect career. It helps people test possible directions in the real world and update their plans as they learn.

## What it does

```
CONFUSION → CONVERSATION → UNDERSTANDING → 3 DIRECTIONS → CHOICE → EXPERIMENT → FEEDBACK → UPDATED DIRECTION → ACTION
```

1. **Conversation.** An AI coach asks adaptive questions about your story, interests, skills, values, constraints and ambitions. It stops when it has enough to work with, not after a fixed number of questions.
2. **Profile.** The conversation becomes a structured profile. It's internal app state, not a diagnosis.
3. **Three directions.** Exactly three different hypotheses: a direct path, an adjacent one and a hybrid. Each explains why it may fit, what's still unknown, and gives a concrete first experiment.
4. **Choice and roadmap.** Picking a direction creates a small real-world experiment with tasks, plus a roadmap: next action, this week, 30 days, 90 days and longer term. The further out, the less specific.
5. **Dashboard.** Your current direction, exploration level, focus, tasks, insights and recent feedback.
6. **Weekly check-in.** You rate energy, motivation, enjoyment and difficulty, and note what you liked and disliked. The AI weighs evidence for and against the direction, then may update the direction or roadmap, and always explains why.

Numbers such as exploration level and fit signals are rough internal signals, never scientific measurements. The coach isn't a therapist and doesn't diagnose or make high-stakes decisions for anyone.

Full requirements are in [`specs/`](specs/). Start with [`specs/product.md`](specs/product.md).

## Tech stack

- **Next.js 16** (App Router) and **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Supabase**: Postgres, Auth (email magic link) and Row Level Security
- **OpenAI** Responses API with strict structured JSON output, called only from the server
- **Zod** validates all AI output and user input
- **Vitest** for tests

## Getting started

### 1. Prerequisites

- Node.js **20.9 or newer**
- A [Supabase](https://supabase.com) project
- An [OpenAI API key](https://platform.openai.com/api-keys). Optional for local UI work: without one, the app uses a mock AI.

### 2. Install

```bash
npm install
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Where it's used |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Same page. Safe in the browser because RLS protects the data. |
| `OPENAI_API_KEY` | For the real coach | **Server only.** Never prefix it with `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | No | Defaults to `gpt-5.6-terra` |
| `AI_PROVIDER` | No | `openai` or `mock`. Defaults to `openai` when a key is set. The mock is refused in production. |
| `OPENAI_REASONING_EFFORT` | No | For example `low`, for faster replies |
| `OPENAI_CONVERSATION_TIMEOUT_MS` / `OPENAI_GENERATION_TIMEOUT_MS` | No | Default 30000 / 90000 |
| `MOCK_AI_LATENCY_MS` / `MOCK_AI_FAILURE_RATE` | No | Mock AI only. A failure rate of `1` lets you exercise error states. |

`.env.local` is gitignored. Never commit keys, and never put the Supabase service-role key in this app.

### 4. Set up the database

Apply the migration in [`supabase/migrations/`](supabase/migrations/). It creates the 10 tables, indexes, constraints and Row Level Security policies. Use one of these:

- **Supabase CLI:** `supabase link --project-ref <your-ref>` then `supabase db push`
- **Dashboard:** paste the migration file into SQL Editor and run it

### 5. Configure authentication

In the Supabase dashboard → **Authentication**:

- **URL Configuration:** add `http://localhost:3000/**` to Redirect URLs, plus your deployed URL later.
- **Emails:** the built-in email service only sends to project team members and is heavily rate-limited. For real users, set up **custom SMTP** under Authentication → Emails → SMTP Settings.

Sign-up and sign-in use the same flow: enter an email and open the magic link on the same device.

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit and flow tests. Uses the mock AI and an in-memory store, so no keys needed. |

## Testing on your phone

The UI is responsive, so the web app works in a mobile browser. There's no native app.

**Same Wi-Fi as your computer:**

1. Run `npm run dev` and note the **Network** URL it prints, for example `http://192.168.0.10:3000`.
2. Next.js blocks dev requests from other hostnames by default. Add your computer's IP to [`next.config.ts`](next.config.ts), then restart the dev server:
   ```ts
   const nextConfig: NextConfig = {
     allowedDevOrigins: ["192.168.0.10"],
   };
   ```
3. In Supabase → Authentication → URL Configuration, add `http://192.168.0.10:3000/**` to Redirect URLs.
4. Open the Network URL on your phone, and **open the magic-link email on the phone** so the session is created there.

Your IP can change when you reconnect to Wi-Fi. For something stable to share, deploy instead (for example to Vercel). Set the same environment variables there and add the deployed URL to Supabase's Redirect URLs.

## Project structure

```
src/
  app/                 Pages and API routes (App Router)
    api/               JSON endpoints: conversations, paths, tasks, check-ins, dashboard
    auth/              Magic-link confirmation and sign-out
  components/          UI components from the Figma design
  domain/              Framework-free business logic
    schemas.ts         Zod schemas for AI output and user input
    rules.ts           Pure rules (exploration level, progress, completion floor)
  lib/                 Browser API client, Supabase clients, hooks
  server/
    ai/                AI boundary, server only
      prompts.ts       One versioned prompt per step
      client.ts        OpenAI Responses API client (strict JSON schema, store: false)
      openai.ts        Provider: conversationTurn, generateProfile, generatePaths,
                       generateRoadmap, analyzeCheckIn, updateDirection
      service.ts       Validates every response; retries malformed or transient failures once
      mock.ts          Deterministic provider for tests and local development
    repo/              Persistence (Supabase, plus in-memory for tests)
    services/          Workflows: exploration, selection, check-ins, dashboard
  proxy.ts             Session refresh and protected-page redirects
specs/                 Product, data model, AI and feature specifications
supabase/migrations/   Database schema and RLS
```

## How the key rules are enforced

- **API keys stay on the server.** All AI calls happen in `src/server/`. The browser only talks to this app's `/api` routes.
- **Ownership comes from the session.** Routes resolve the user with `supabase.auth.getUser()` and never trust a user ID sent by the client. Every table has RLS, so users can only read or change their own rows.
- **AI output is untrusted.** Every response is checked against a Zod schema. Malformed output is retried once, then returned as a recoverable error, and never saved.
- **No endless spinners.** AI calls have timeouts, and every async screen has loading, success and error states.
- **Nothing half-saved.** Your message is saved only once the coach replies. A check-in is saved first, so its analysis can be retried without re-entering answers.
- **Privacy.** OpenAI requests use `store: false`, and logs never include conversation content.

## Known limitations

- The profile isn't updated after check-ins yet. Check-in learnings are stored as insights instead.
- Protection against generating twice only works within one server process. With several instances, a double-click could generate directions twice.
- No per-user rate limiting on AI calls.
- Analytics events are logged to the console. No analytics provider is connected.
