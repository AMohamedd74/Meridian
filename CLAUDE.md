# Purpose App — Claude Code Instructions

## Product

Purpose is an AI-powered life and career direction application for people who feel stuck, overwhelmed, or uncertain about what to do next.

The product helps users:
1. Tell their story through an adaptive AI conversation.
2. Build a structured personal profile.
3. Explore exactly three possible directions.
4. Choose one direction to test.
5. Receive a practical roadmap and real-world experiments.
6. Reflect on what happened.
7. Update their profile and direction based on evidence.

The product does **not** claim to discover a user's objectively correct career or "true purpose."

The core product loop is:

CONFUSION → CONVERSATION → UNDERSTANDING → 3 DIRECTIONS → CHOICE → EXPERIMENT → FEEDBACK → UPDATED DIRECTION → ACTION

## Source of truth

Priority order:
1. Product requirements in `/specs`
2. Figma design for visual/UX decisions
3. Technical architecture in `/specs/architecture.md`
4. Existing code and established project conventions

If a requirement is ambiguous, choose the smallest reasonable implementation that supports the MVP.

Do not invent major product requirements.

If implementation reveals that a requirement must change, update the relevant spec before changing behavior.

## Figma

The existing Figma-generated template is the source of truth for the visual design.

Preserve:
- Layout
- Typography
- Spacing
- Component hierarchy
- Colors
- Responsive behavior
- Interactions represented in the design

Do not redesign the UI unless explicitly asked.

Visual language:
- Near-black backgrounds
- Dark charcoal surfaces
- White primary text
- Gray secondary text
- Neon/electric blue accent
- Subtle blue glow
- Minimal
- Premium
- Futuristic
- Calm
- Apple-inspired

Avoid:
- Gaming/cyberpunk aesthetics
- Excessive gradients
- Stock imagery
- Cartoon illustrations
- Generic corporate dashboard patterns
- Excessive animation

## Engineering principles

- TypeScript everywhere.
- Keep components small and reusable.
- Keep AI/business logic outside React components.
- Never expose API keys to the browser.
- Validate all AI-generated structured data.
- Treat AI output as untrusted input.
- Use server-side AI calls.
- Use Supabase Row Level Security for user-owned data.
- Do not store unnecessary sensitive information.
- Prefer simple solutions over premature abstractions.
- Avoid unnecessary dependencies.
- Every important async operation needs loading, success, and failure states.
- Never leave users on an infinite spinner.

## AI safety and product boundaries

The AI is a life/career exploration coach, not a psychologist or therapist.

The AI must:
- Express uncertainty.
- Treat recommendations as hypotheses.
- Explain why a direction may fit.
- Identify what is still unknown.
- Encourage real-world experimentation.
- Update recommendations based on evidence.

The AI must not:
- Diagnose mental health conditions.
- Claim to be a psychologist.
- Claim scientific certainty about personality or destiny.
- Claim to know someone's true purpose.
- Present numerical fit scores as scientifically validated measurements.
- Make high-stakes medical, legal, or financial decisions for users.

## Development workflow

Before implementing a feature:
1. Read the relevant spec.
2. Inspect existing implementation.
3. Reuse existing Figma/template components.
4. Implement the smallest complete version.
5. Add error/loading states.
6. Test the happy path and important failure paths.
7. Verify against the feature's acceptance criteria.

Do not stop at static UI when the feature is specified as functional.

## MVP boundaries

Do not build unless explicitly requested:
- Native mobile apps
- Social network/community
- Human coaching marketplace
- Custom LLM
- Complex multi-agent architecture
- Elaborate gamification
- Advanced notifications
- Marketplace
- Large-scale career database
- Vector database without a demonstrated need

## Definition of done

A feature is complete only when:
- It matches the Figma design closely.
- It is responsive.
- It persists required data.
- It has proper loading/error states.
- It has server-side validation where needed.
- It satisfies its spec acceptance criteria.
- It does not break the existing user flow.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
