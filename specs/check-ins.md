# Check-ins & Adaptive Direction Specification

## Objective

Collect real-world evidence and use it to update the user's model and roadmap.

## Check-in questions

Collect:
- energy
- motivation
- enjoyment
- difficulty
- activities enjoyed
- activities disliked
- desire to continue
- free-text reflection

## Analysis

The AI should identify:
- repeated patterns,
- new interests,
- friction,
- evidence supporting the current path,
- evidence against the current path,
- unresolved uncertainty.

## Update

After a check-in, the system may update:
- structured profile,
- exploration level,
- insights,
- current experiment,
- roadmap,
- direction.

The system should not change the user's selected direction without a clear explanation.

## Example

Before:
Fashion Entrepreneurship — 64%

New evidence:
User enjoyed design and customer conversations but disliked manufacturing logistics.

Possible update:
Creative Entrepreneurship — 72%

Explanation:
"Your recent experiments suggest that the creative and strategic side of fashion energizes you more than manufacturing operations."

## Acceptance criteria

- [ ] User can submit a check-in.
- [ ] Check-in persists.
- [ ] AI analysis is generated.
- [ ] New insight is persisted.
- [ ] Roadmap can be updated.
- [ ] User sees why the plan changed.
- [ ] Errors are recoverable.
