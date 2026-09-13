# Onboarding & AI Conversation Specification

## Objective

Understand the user deeply enough to produce useful hypotheses without turning the experience into a static personality questionnaire.

## Experience

The user starts from the landing page and enters an AI conversation.

The conversation should feel like a thoughtful coach.

## Topics to explore

The AI should gather enough information about:

- life story
- interests
- skills
- strengths
- values
- motivations
- energy
- work preferences
- ambitions
- lifestyle preferences
- financial priorities
- risk tolerance
- constraints
- current work
- dislikes
- envy/regret
- moments of absorption
- possible paths already considered

The AI should not ask every topic mechanically.

## Adaptive questioning

Questions should depend on previous answers.

The AI should:
- avoid repeating known information,
- ask follow-ups where uncertainty is high,
- stop when enough information exists,
- keep the conversation manageable.

## Conversation completion

A conversation is complete when the system has enough information to produce:
- structured profile,
- candidate paths,
- uncertainties,
- initial experiments.

The user should not be forced through an arbitrary number of questions.

## Profile extraction

After meaningful user messages, the system may update the structured profile.

The profile is internal application state, not a diagnosis.

## Acceptance criteria

- [ ] User can start a conversation.
- [ ] User and assistant messages render correctly.
- [ ] Messages persist.
- [ ] AI responses are generated server-side.
- [ ] AI can reference prior answers.
- [ ] AI avoids unnecessary repetition.
- [ ] Profile is generated at completion.
- [ ] API failures produce a recoverable UI state.
