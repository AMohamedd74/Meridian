# Data Model Specification

The exact schema may evolve during implementation, but ownership and relationships must remain clear.

## Core entities

### profiles
One current profile per user.

Suggested fields:
- id
- user_id
- values
- interests
- skills
- motivations
- preferences
- constraints
- goals
- dislikes
- uncertainties
- created_at
- updated_at

JSONB is acceptable for evolving profile dimensions.

### conversations
Represents an exploration session.

Fields:
- id
- user_id
- status
- started_at
- completed_at
- created_at
- updated_at

### messages
Conversation messages.

Fields:
- id
- conversation_id
- role
- content
- created_at

Roles:
- user
- assistant

### paths
A generated possible direction.

Fields:
- id
- user_id
- conversation_id
- title
- category
- description
- why_it_fits
- strengths
- uncertainties
- first_experiment
- experiment_duration
- metadata
- created_at

### user_paths
Tracks a user's relationship to a path.

Fields:
- id
- user_id
- path_id
- status
- selected_at
- exploration_score
- created_at
- updated_at

Statuses can include:
- suggested
- selected
- active
- paused
- completed
- abandoned

### experiments
A real-world test associated with a path.

Fields:
- id
- user_id
- path_id
- title
- description
- goal
- duration_days
- status
- started_at
- completed_at
- created_at
- updated_at

### experiment_tasks
Actionable tasks.

Fields:
- id
- experiment_id
- title
- description
- completed
- due_date
- completed_at
- created_at

### check_ins
User reflection after an experiment/week.

Fields:
- id
- user_id
- path_id
- energy
- motivation
- enjoyment
- difficulty
- enjoyed_activities
- disliked_activities
- continue_preference
- reflection
- created_at

### insights
AI-generated observations.

Fields:
- id
- user_id
- path_id
- content
- source_type
- created_at

### roadmaps
Current or historical roadmap versions.

Fields:
- id
- user_id
- path_id
- title
- horizon
- content
- version
- active
- created_at

## Security

Every user-owned table requires RLS.

Do not trust `user_id` supplied by the client. Derive authenticated ownership server-side wherever possible.

## Implementation notes (MVP)

Additions made during implementation, beyond the suggested fields above:

- `conversations.coverage` (0..1) and `conversations.ready_to_complete` — the coach's internal estimate of whether it has enough information to produce a profile and directions. Completion is gated on `ready_to_complete`; there is no fixed question count.
- `profiles.summary` — a short plain-language summary of the profile.
- `paths.why_it_fits`, `paths.strengths`, `paths.uncertainties` are string arrays. `paths.experiment_duration` is a number of days. `paths.metadata` holds `tags`, `path_type` (direct/adjacent/hybrid), `success_criteria`, `thirty_day_direction`, `signals` (rough fit signals, never shown as numbers) and `initial_exploration_level`.
- `experiments.metadata` holds `uncertainty_tested`, `expected_evidence` and `reflection_prompt`.
- `check_ins.analysis` (JSONB, nullable) — the validated AI analysis of the check-in: the evidence (`patterns`, `new_interests`, `friction`, `evidence_for`, `evidence_against`, `open_uncertainties`, `insight`, `learned`), the `direction` decision (including `explanation` and `roadmap_should_change`), and `before`/`after` direction snapshots. Evidence and decision come from separate AI steps (`analyzeCheckIn`, `updateDirection`). Null means the check-in was saved but analysis has not succeeded yet (retryable).
- `insights.headline` (nullable) — present on the highlighted "AI insight"; plain learned items have no headline.
- `roadmaps.content` holds `current_focus`, `next_action`, `this_week`, `thirty_days`, `ninety_days`, `longer_term`.

All AI-generated fields are validated with the schemas in `src/domain/schemas.ts` before persistence.
