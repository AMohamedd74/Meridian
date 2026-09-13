import type {
  CandidatePaths,
  CheckInEvidence,
  CheckInInput,
  ConversationTurn,
  DirectionDecision,
  Plan,
  ProfileContent,
} from "@/domain/schemas";
import type { AIProvider } from "./types";

/**
 * Mock provider for the UI/mocked-data phase. Content is adapted from the
 * Figma template. Lightly adaptive so the flow feels real, but not intelligent.
 */

interface MockOptions {
  latencyMs?: number;
  failureRate?: number;
}

const QUESTIONS = [
  "Tell me about a time when you were completely absorbed in something — when hours felt like minutes. What were you doing?",
  "What do you think you enjoyed most about it — was it creating something tangible, learning deeply about a subject, expressing yourself, or imagining the business behind it?",
  "When you imagine yourself five years from now doing something that genuinely excites you — what does that look like? Don't filter it. Just describe the scene.",
  "What would feel like failure to you? Not in a catastrophic sense — but what outcome would leave you feeling like you didn't fully try?",
  "Are there any real constraints I should keep in mind — money, time, location, people who depend on you?",
];


function snippet(text: string, words = 8): string {
  const parts = text.trim().replace(/\s+/g, " ").split(" ");
  const cut = parts.slice(0, words).join(" ");
  return parts.length > words ? `${cut}…` : cut;
}

export function createMockProvider({ latencyMs = 900, failureRate = 0 }: MockOptions = {}): AIProvider {
  const simulate = async <T>(value: T): Promise<T> => {
    await new Promise((r) => setTimeout(r, latencyMs * (0.7 + Math.random() * 0.6)));
    if (Math.random() < failureRate) throw new Error("Simulated AI failure");
    return value;
  };

  return {
    async conversationTurn({ messages }) {
      // The next question is determined by how many questions have already been asked.
      const asked = messages.filter((m) => m.role === "assistant").length;
      const last = messages.at(-1)?.role === "user" ? messages.at(-1)!.content : null;
      const ready = asked >= QUESTIONS.length;

      let reply: string;
      if (ready) {
        reply = `Thank you — that's really helpful. When you said "${snippet(last ?? "")}", it connected with a lot of what you shared earlier.\n\nI think I have enough to suggest a few directions worth testing. They'll be hypotheses, not answers. Whenever you're ready, we can look at them — or keep talking if there's more you want me to know.`;
      } else if (!last) {
        reply = `Let's start somewhere simple.\n\n${QUESTIONS[0]}`;
      } else {
        const lead = ["Thanks for sharing that.", "Interesting.", "That combination is telling.", "That's honest.", "That helps."][asked];
        reply = `${lead} You mentioned "${snippet(last)}".\n\n${QUESTIONS[asked]}`;
      }

      return simulate<ConversationTurn>({
        reply,
        coverage: Math.min(asked / QUESTIONS.length, 1),
        ready_to_complete: ready,
      });
    },

    async generateProfile() {
      return simulate<ProfileContent>({
        summary:
          "Technically capable, drawn repeatedly to fashion and tangible creative work, and motivated by ownership more than employment.",
        values: ["Autonomy", "Craft", "Ownership"],
        interests: ["Fashion", "Denim", "Technology", "Brand building"],
        skills: ["Software development", "Research", "Visual taste"],
        motivations: ["Building something of your own", "Seeing ideas become tangible"],
        preferences: ["Creative problem-solving", "Self-directed work"],
        constraints: ["Needs a stable income in the short term"],
        goals: ["Build a brand or product within five years"],
        dislikes: ["Staying in a job without personal meaning"],
        uncertainties: [
          "Enjoyment of the operational side of a physical product business",
          "Tolerance for long feedback loops",
          "Interest in selling and customer conversations",
        ],
      });
    },

    async generatePaths() {
      return simulate<CandidatePaths>({
        paths: [
          {
            title: "Build with AI",
            category: "Technology",
            tags: ["Technology", "Entrepreneurship"],
            path_type: "adjacent",
            description:
              "You have the technical ability to build, but you seem increasingly motivated by ownership and creating something of your own.",
            why_it_fits: [
              "You already have the technical skills to build quickly.",
              "You described ownership as more motivating than employment.",
              "Software lets you test ideas cheaply while keeping a stable income.",
            ],
            relevant_strengths: ["Software development", "Research", "Self-direction"],
            uncertainties: ["Do you enjoy selling and talking to customers as much as building?"],
            first_experiment: "Build and attempt to sell a tiny product to 3 people.",
            experiment_duration_days: 14,
            success_criteria: ["A working prototype exists", "You had 3 real sales conversations", "You can say whether selling energized or drained you"],
            thirty_day_direction: "Ship one small product and learn whether customer-facing work suits you.",
            signals: [
              { label: "Autonomy", level: 88 },
              { label: "Creativity", level: 76 },
              { label: "Entrepreneurship", level: 84 },
              { label: "Stability", level: 58 },
            ],
            initial_exploration_level: 55,
          },
          {
            title: "Build a Fashion Brand",
            category: "Creative entrepreneurship",
            tags: ["Creativity", "Entrepreneurship"],
            path_type: "direct",
            description:
              "Your repeated pull toward fashion and creative work may point to a desire to build a world that reflects your aesthetic vision.",
            why_it_fits: [
              "You're repeatedly drawn toward tangible creative work.",
              "You've shown a strong desire for ownership rather than employment.",
              "Fashion keeps appearing in your interests even when discussing unrelated topics.",
              "Your technical background could become an advantage rather than something you leave behind.",
            ],
            relevant_strengths: ["Visual taste", "Research depth", "Technical skills"],
            uncertainties: [
              "We don't yet know whether you enjoy the operational side of running a physical product business.",
              "We're uncertain how you respond to long feedback loops — fashion can take months to validate.",
            ],
            first_experiment: "Design a denim product concept and share it with 5 people.",
            experiment_duration_days: 7,
            success_criteria: ["A concept exists that you'd be proud to show", "5 people gave honest feedback", "You've spoken to at least one manufacturer"],
            thirty_day_direction: "Find out whether you enjoy the actual work of a fashion brand — not just the idea of one.",
            signals: [
              { label: "Creativity", level: 92 },
              { label: "Autonomy", level: 82 },
              { label: "Tangibility", level: 78 },
              { label: "Risk tolerance", level: 64 },
            ],
            initial_exploration_level: 64,
          },
          {
            title: "Technology + Fashion",
            category: "Hybrid",
            tags: ["Hybrid", "Innovation"],
            path_type: "hybrid",
            description:
              "The intersection of your technical background and fashion interest is uncommon. You may not need to choose — you could bridge both worlds.",
            why_it_fits: [
              "It combines the two areas you returned to most often.",
              "Few people have both skill sets, which may be an advantage.",
            ],
            relevant_strengths: ["Software development", "Fashion knowledge", "Curiosity"],
            uncertainties: ["Which side of this would you want to lead — the tech or the fashion?"],
            first_experiment: "Identify one problem in fashion that technology could solve, and validate it with 3 people in the industry.",
            experiment_duration_days: 10,
            success_criteria: ["One clearly defined problem", "3 industry conversations", "A view on which side you want to lead"],
            thirty_day_direction: "Map real problems at the intersection and notice which side pulls you in.",
            signals: [
              { label: "Innovation", level: 90 },
              { label: "Creativity", level: 88 },
              { label: "Autonomy", level: 80 },
              { label: "Complexity", level: 72 },
            ],
            initial_exploration_level: 50,
          },
        ],
      });
    },

    async generateRoadmap({ path, replan }) {
      if (replan) {
        return simulate<Plan>({
          experiment: {
            title: "Create and test a concept without producing inventory",
            objective:
              "Build a digital lookbook or concept campaign to find out whether you enjoy the brand-building side without the operational risk.",
            uncertainty_tested: "Is creative direction and brand building the part that actually energizes you?",
            duration_days: 7,
            expected_evidence: ["How absorbed you felt while creating", "Reactions from people you share it with"],
            reflection_prompt: "Which moments this week felt like hours were minutes?",
            tasks: [
              { title: "Sketch a 6-look concept", description: "Rough is fine. Focus on the story, not polish.", day_offset: 2 },
              { title: "Build a simple lookbook page", description: "Use any tool you like — keep it under a day of work.", day_offset: 4 },
              { title: "Share it with 5 people", description: "Ask what they'd expect the brand to stand for.", day_offset: 6 },
            ],
          },
          roadmap: {
            current_focus: {
              title: "Test the creative side",
              description: "This week is about the brand and the story — not manufacturing.",
            },
            next_action: "Sketch the first three looks.",
            this_week: ["Sketch a concept", "Build a lookbook", "Share with 5 people"],
            thirty_days: "Decide whether creative direction is worth deeper investment.",
            ninety_days: "Possibly launch a small pre-order or collaboration test.",
            longer_term: "Clarify whether you want to lead a brand creatively or partner on operations.",
          },
        });
      }

      return simulate<Plan>({
        experiment: {
          title: path.first_experiment.replace(/\.$/, ""),
          objective: `Find out whether you enjoy the real work behind "${path.title}" — not just the idea of it.`,
          uncertainty_tested: path.uncertainties[0],
          duration_days: path.experiment_duration,
          expected_evidence: ["Which tasks you looked forward to", "Which tasks you avoided", "Feedback from real people"],
          reflection_prompt: "What surprised you about how this week felt?",
          tasks: [
            { title: "Research 10 examples in this space", description: "Note what you admire and what you'd do differently.", day_offset: 1 },
            { title: "Contact 3 people doing this work", description: "Ask what their week actually looks like.", day_offset: 3 },
            { title: "Create a first rough prototype", description: "Something you can show — a sketch, mockup or sample.", day_offset: 5 },
            { title: "Talk to 2 potential customers", description: "Share the prototype and listen more than you pitch.", day_offset: 7 },
          ],
        },
        roadmap: {
          current_focus: {
            title: "Validate your interest",
            description: `This month isn't about committing to ${path.title.toLowerCase()}. It's about finding out whether you actually enjoy the work involved.`,
          },
          next_action: "Research 10 examples in this space.",
          this_week: ["Research", "Reach out to people", "Make something rough"],
          thirty_days: path.metadata.thirty_day_direction,
          ninety_days: "If the signal is strong, run a small paid or public test.",
          longer_term: "A clearer sense of whether this deserves a bigger commitment.",
        },
      });
    },

    async analyzeCheckIn({ checkIn }) {
      const { positive, negative, enjoyed, disliked } = readCheckIn(checkIn);

      return simulate<CheckInEvidence>({
        patterns: [`You felt most engaged while ${enjoyed}.`],
        new_interests: disliked && positive ? ["Creative direction", "Brand strategy"] : [],
        friction: disliked ? [`${disliked[0].toUpperCase()}${disliked.slice(1)} drained your energy.`] : [],
        evidence_for: positive ? [`Energy ${checkIn.energy}/10 and you want to continue.`] : [],
        evidence_against: negative ? ["Low enjoyment or low desire to continue this week."] : [],
        open_uncertainties: ["Whether this holds over a longer period."],
        insight: {
          headline: "Something interesting is emerging.",
          content: disliked
            ? `You've enjoyed ${enjoyed}, but found ${disliked} draining. This may mean the creative and strategic side interests you more than operations.`
            : `You've been most engaged while ${enjoyed}. That's worth leaning into in your next experiment.`,
        },
        learned: [
          checkIn.energy >= 7 ? "You gain energy from hands-on progress." : "Energy is a signal worth watching.",
          ...(disliked ? [`${disliked[0].toUpperCase()}${disliked.slice(1)} costs you energy.`] : []),
        ],
      });
    },

    async updateDirection({ path, checkIn }) {
      const { positive, negative, enjoyed, disliked } = readCheckIn(checkIn);
      const changed = Boolean(disliked) && positive;

      return simulate<DirectionDecision>({
        changed,
        title: changed ? "Creative Entrepreneurship" : path.title,
        explanation: changed
          ? `Your recent experiment suggests you enjoy ${enjoyed} more than ${disliked}. We've shifted the direction toward the creative side — still a hypothesis to test.`
          : negative
            ? "This week gave weaker evidence for this direction. We're keeping it for now, but the next experiment will test it more directly."
            : "This week's evidence supports continuing. Your direction stays the same and the next experiment builds on it.",
        exploration_delta: positive ? 8 : negative ? -10 : 2,
        shifts: changed
          ? [
              { label: "Creative direction", delta: 18 },
              { label: "Brand strategy", delta: 12 },
              { label: "Manufacturing", delta: -14 },
            ]
          : [],
        roadmap_should_change: changed || negative,
      });
    },
  };
}

function readCheckIn(checkIn: CheckInInput) {
  return {
    positive: checkIn.continue_preference === "definitely" && checkIn.enjoyment >= 6,
    negative: checkIn.continue_preference === "probably_not" || checkIn.enjoyment <= 3,
    enjoyed: checkIn.enjoyed_activities.slice(0, 2).join(" and ").toLowerCase() || "parts of the work",
    disliked: checkIn.disliked_activities.slice(0, 2).join(" and ").toLowerCase(),
  };
}
