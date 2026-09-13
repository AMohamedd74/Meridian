# Three Directions Specification

## Objective

Generate exactly three plausible directions that are worth exploring.

## Important framing

The directions are hypotheses, not definitive career recommendations.

Never use language implying:
- objective destiny,
- perfect career,
- scientific certainty,
- psychological diagnosis.

Preferred language:
- direction
- possibility
- hypothesis
- worth exploring
- may fit
- what we know
- what we don't know

## Required output

Each direction must contain:

- title
- category
- description
- why_it_fits
- relevant_strengths
- uncertainties
- first_experiment
- experiment_duration

## Ranking

Directions should balance:
- user interests
- skills
- values
- motivations
- preferences
- constraints
- stated goals

The system should avoid recommending paths that obviously violate explicit constraints.

## Diversity

The three directions should not simply be three variations of the same career.

Where appropriate, include:
- a direct path,
- an adjacent path,
- a hybrid/unexpected path.

## Exploration score

If displayed, it is an internal heuristic and must not be presented as scientifically validated.

Use labels such as:
- exploration level
- current confidence
- fit signal

## Acceptance criteria

- [ ] Exactly three directions are returned.
- [ ] All required fields exist.
- [ ] Directions are personalized.
- [ ] Each has explicit uncertainty.
- [ ] Each has a concrete first experiment.
- [ ] Output is validated.
- [ ] Results persist.
- [ ] User can select one.
