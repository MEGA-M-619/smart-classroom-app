/**
 * SmartClass AI Studio — structured generators (no external API required).
 * Set OPENAI_API_KEY to enable live LLM responses in a future iteration.
 */

function bulletList(items) {
  return items.map((item) => `• ${item}`).join('\n');
}

export function generateAIContent(type, payload = {}) {
  const topic = payload.topic || payload.title || 'the course topic';
  const grade = payload.gradeLevel || 'undergraduate';
  const duration = payload.duration || '50 minutes';

  switch (type) {
    case 'lesson-plan':
      return {
        title: `Lesson Plan: ${topic}`,
        content: [
          `## Learning objectives\n${bulletList([
            `Explain core concepts of ${topic}`,
            'Apply knowledge through guided practice',
            'Reflect on real-world connections',
          ])}`,
          `## Agenda (${duration})\n${bulletList([
            '5 min — Warm-up & prior knowledge check',
            '15 min — Concept introduction with examples',
            '20 min — Collaborative activity',
            '8 min — Formative check for understanding',
            '2 min — Exit ticket & preview next class',
          ])}`,
          `## Differentiation\n${bulletList([
            'Scaffolded handout for emerging learners',
            'Extension challenge for advanced students',
            'Optional video recap for absent students',
          ])}`,
          `## Assessment\nQuick quiz (3 questions) + participation rubric.`,
        ].join('\n\n'),
        meta: { type, grade, duration },
      };

    case 'quiz':
      return {
        title: `Quiz: ${topic}`,
        content: [
          '1. Multiple choice — Define the primary concept (4 options)',
          '2. Short answer — Explain one real-world application',
          '3. Problem solving — Apply the method to a new scenario',
          '4. True/False — Identify a common misconception',
          '5. Essay (bonus) — Compare two approaches and justify your choice',
          '\n**Answer key guidance:** Focus on reasoning, not memorization. Partial credit for structured explanations.',
        ].join('\n'),
        meta: { type, questionCount: 5 },
      };

    case 'assignment':
      return {
        title: `Assignment: ${topic}`,
        content: [
          `**Overview:** Students demonstrate mastery of ${topic} through applied work.`,
          `**Deliverables:**\n${bulletList([
            'Written report (800–1200 words) OR working prototype',
            'Reflection on challenges and learning outcomes',
            'Peer review of one classmate submission',
          ])}`,
          `**Rubric (100 pts):**\n${bulletList([
            'Concept accuracy — 30 pts',
            'Application & examples — 30 pts',
            'Clarity & organization — 20 pts',
            'Reflection & citations — 20 pts',
          ])}`,
          `**Due:** Suggested in 7–10 days with one checkpoint midway.`,
        ].join('\n\n'),
        meta: { type, points: 100 },
      };

    case 'feedback':
      return {
        title: 'AI Feedback Assistant',
        content: [
          `**Strengths observed:** Clear effort on ${topic}. Structure is easy to follow.`,
          '**Areas to improve:** Deepen analysis with evidence; connect ideas across sections.',
          '**Next steps:** Revise the introduction thesis, add one counter-argument, and resubmit.',
          '**Encouragement:** You are on track — targeted revision can raise this submission a full grade band.',
        ].join('\n\n'),
        meta: { type, tone: 'constructive' },
      };

    case 'study-plan':
      return {
        title: 'Personalized Study Plan',
        content: [
          `**Focus this week:** ${topic}`,
          `**Daily plan:**\n${bulletList([
            'Mon — Review lecture notes (30 min)',
            'Tue — Practice problems set A (45 min)',
            'Wed — Group study / discussion (40 min)',
            'Thu — Practice problems set B (45 min)',
            'Fri — Self-quiz + flashcards (30 min)',
          ])}`,
          '**Smart tip:** Pair low-attendance days with short 15-min review sessions to stay consistent.',
        ].join('\n\n'),
        meta: { type },
      };

    case 'insights':
      return {
        title: 'Classroom Insights',
        content: [
          '**Engagement pulse:** Submission rates are strongest early in the week.',
          '**Risk signals:** Students with 2+ absences and missing assignments need outreach.',
          '**Recommendation:** Schedule a review session before the next major deadline.',
          '**Differentiator:** SmartClass Smart Pulse flags at-risk learners before grades slip.',
        ].join('\n\n'),
        meta: { type },
      };

    default:
      return {
        title: 'SmartClass AI',
        content: 'Select a generator type: lesson-plan, quiz, assignment, feedback, study-plan, or insights.',
        meta: { type: 'help' },
      };
  }
}
