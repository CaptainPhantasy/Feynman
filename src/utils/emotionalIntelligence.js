/**
 * Emotional Intelligence Layer - Detect and respond to user frustration
 */

/**
 * Analyze user behavior for frustration indicators
 */
export function detectFrustration(behaviorHistory, currentAttempt, previousAttempts) {
  const indicators = {
    multipleDeletions: checkDeletionPattern(behaviorHistory),
    decreasingLength: checkDecreasingLength(previousAttempts, currentAttempt),
    longPauses: checkLongPauses(behaviorHistory),
    repeatedRevisions: checkRepeatedRevisions(previousAttempts),
    similarAttempts: checkSimilarAttempts(previousAttempts)
  };

  const score = calculateFrustrationScore(indicators);

  return {
    frustrated: score >= 3,
    indicators,
    score,
    level: getFrustrationLevel(score)
  };
}

/**
 * Check for multiple deletion patterns
 */
function checkDeletionPattern(behaviorHistory) {
  const recentActions = behaviorHistory.slice(-10);
  const deletions = recentActions.filter(action =>
    action.type === 'deletion' || action.type === 'clear'
  );

  return deletions.length >= 3;
}

/**
 * Check if attempts are getting shorter (giving up)
 */
function checkDecreasingLength(previousAttempts, currentAttempt) {
  if (previousAttempts.length < 2) return false;

  const recent = previousAttempts.slice(-3);
  const lengths = recent.map(a => a.length);
  lengths.push(currentAttempt.length);

  // Check if each is shorter than previous
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= lengths[i - 1]) return false;
  }

  return true;
}

/**
 * Check for unusually long pauses
 */
function checkLongPauses(behaviorHistory) {
  const recentActions = behaviorHistory.slice(-5);

  const longPauses = recentActions.filter(action =>
    action.type === 'pause' && action.duration > 30000 // >30 seconds
  );

  return longPauses.length >= 2;
}

/**
 * Check for repeated revisions on same attempt
 */
function checkRepeatedRevisions(previousAttempts) {
  return previousAttempts.length >= 4;
}

/**
 * Check if attempts are very similar (stuck in loop)
 */
function checkSimilarAttempts(previousAttempts) {
  if (previousAttempts.length < 2) return false;

  const recent = previousAttempts.slice(-3);

  for (let i = 1; i < recent.length; i++) {
    const similarity = calculateSimilarity(recent[i - 1], recent[i]);
    if (similarity > 0.7) return true; // >70% similar
  }

  return false;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Calculate frustration score
 */
function calculateFrustrationScore(indicators) {
  return Object.values(indicators).filter(Boolean).length;
}

/**
 * Get frustration level description
 */
function getFrustrationLevel(score) {
  if (score >= 4) return 'high';
  if (score >= 3) return 'moderate';
  if (score >= 2) return 'mild';
  return 'none';
}

/**
 * Generate encouraging response based on frustration level
 */
export function generateEncouragement(frustrationLevel, field, attemptCount) {
  const encouragements = {
    high: [
      `I can see you're working hard on this. Let's take a different angle - ${getAlternativeApproach(field)}`,
      `This is a tough one, and that's okay. Struggle means learning is happening. Let me help break this down differently.`,
      `You've made ${attemptCount} attempts - that's serious effort. Let's try thinking about this from a completely new perspective.`
    ],
    moderate: [
      `You're making progress! This field is challenging, which means you're learning deeply. Keep going.`,
      `I notice you're refining your understanding - that's exactly how mastery works. Let's keep building on this.`,
      `Good effort so far. Let me give you a more specific hint about what we're looking for.`
    ],
    mild: [
      `You're on the right track. Let's clarify one specific part.`,
      `Almost there - just need to sharpen one aspect of your explanation.`,
      `Good thinking. Now let's make it even more precise.`
    ],
    none: [
      `Good start. Let's refine this.`,
      `Interesting approach. Here's what to consider.`,
      `Let's dig deeper into this.`
    ]
  };

  const options = encouragements[frustrationLevel] || encouragements.none;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get alternative teaching approach for field
 */
function getAlternativeApproach(field) {
  const approaches = {
    definition: 'what would you tell a friend who asked you what this is?',
    mechanism: 'imagine explaining the step-by-step process to a child',
    example: 'think of a specific, real situation where you\'ve seen this',
    analogy: 'what everyday thing does this remind you of?',
    why_matters: 'why should someone care about understanding this?',
    misconception: 'what mistake do people commonly make about this?',
    integration: 'how does this connect to something you already know well?'
  };

  return approaches[field] || 'try explaining it in a completely different way';
}

/**
 * Should we provide encouragement now?
 */
export function shouldEncourage(frustrationAnalysis, lastEncouragementTime) {
  if (!frustrationAnalysis.frustrated) return false;

  // Don't spam encouragement
  const timeSinceLastEncouragement = Date.now() - (lastEncouragementTime || 0);
  const minInterval = 60000; // 1 minute

  return timeSinceLastEncouragement >= minInterval;
}

/**
 * Track behavior for frustration detection
 */
export class BehaviorTracker {
  constructor() {
    this.history = [];
  }

  recordAction(type, data = {}) {
    this.history.push({
      type,
      timestamp: Date.now(),
      ...data
    });

    // Keep only recent history (last 50 actions)
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  recordTyping(length) {
    this.recordAction('typing', { length });
  }

  recordDeletion(amount) {
    this.recordAction('deletion', { amount });
  }

  recordPause(duration) {
    this.recordAction('pause', { duration });
  }

  recordClear() {
    this.recordAction('clear');
  }

  recordSubmit(content) {
    this.recordAction('submit', { length: content.length });
  }

  getHistory() {
    return this.history;
  }

  clear() {
    this.history = [];
  }
}
