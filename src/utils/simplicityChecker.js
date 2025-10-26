/**
 * Simplicity Checker - Enforces ELI5 (Explain Like I'm 5) level explanations
 *
 * This is the CORE of true Feynman mastery. If you can't explain it simply,
 * you don't truly understand it.
 */

/**
 * Common jargon patterns that indicate technical language
 */
const JARGON_PATTERNS = {
  // Academic/Technical indicators
  academicWords: [
    'utilize', 'leverage', 'implement', 'facilitate', 'methodology',
    'paradigm', 'framework', 'optimize', 'algorithm', 'parameter',
    'infrastructure', 'architecture', 'protocol', 'interface'
  ],

  // Science jargon
  scienceTerms: [
    'quantum', 'molecular', 'cellular', 'electromagnetic', 'thermodynamic',
    'photosynthesis', 'metabolism', 'chromosomes', 'isotope'
  ],

  // Math/Computer Science jargon
  techTerms: [
    'polynomial', 'exponential', 'logarithmic', 'recursive', 'iterative',
    'binary', 'hexadecimal', 'compilation', 'instantiation'
  ],

  // Business jargon
  businessTerms: [
    'synergy', 'leverage', 'bandwidth', 'ecosystem', 'scalable',
    'holistic', 'actionable', 'stakeholder'
  ],

  // Phrases that sound academic
  academicPhrases: [
    'in essence', 'fundamentally speaking', 'it is important to note',
    'one must consider', 'thereby', 'thus', 'hence', 'whereby'
  ]
};

/**
 * Simple, everyday words that should be used instead
 */
const SIMPLE_ALTERNATIVES = {
  'utilize': 'use',
  'facilitate': 'help',
  'implement': 'do',
  'leverage': 'use',
  'optimize': 'make better',
  'methodology': 'way',
  'paradigm': 'way of thinking',
  'infrastructure': 'basic setup',
  'thereby': 'so',
  'thus': 'so',
  'hence': 'so',
  'whereby': 'where'
};

/**
 * Everyday objects/concepts that make great analogies
 */
const EVERYDAY_CONCEPTS = [
  // Kitchen
  'cooking', 'recipe', 'oven', 'mixing', 'stirring', 'cutting', 'boiling',
  'refrigerator', 'freezer', 'microwave', 'blender', 'ingredients',

  // Toys/Games
  'lego', 'blocks', 'puzzle', 'dominos', 'marbles', 'playing cards',
  'board game', 'dice', 'spinning top', 'balloon', 'bouncing ball',

  // Nature
  'water flowing', 'river', 'rain', 'wind', 'trees growing', 'seeds',
  'snowball', 'ice melting', 'clouds', 'sunshine', 'gravity pulling',

  // Everyday activities
  'walking', 'running', 'riding a bike', 'climbing stairs', 'opening doors',
  'pushing', 'pulling', 'throwing', 'catching', 'stacking',

  // Family/Social
  'talking to friends', 'sharing toys', 'taking turns', 'helping mom',
  'playing with siblings', 'birthday party', 'making friends'
];

class SimplicityChecker {

  /**
   * Check if text contains jargon
   * Returns: { hasJargon: boolean, jargonFound: string[], suggestions: {} }
   */
  detectJargon(text) {
    const lowerText = text.toLowerCase();
    const jargonFound = [];
    const suggestions = {};

    // Check all jargon patterns
    Object.values(JARGON_PATTERNS).flat().forEach(term => {
      const pattern = new RegExp(`\\b${term}\\b`, 'i');
      if (pattern.test(lowerText)) {
        jargonFound.push(term);
        if (SIMPLE_ALTERNATIVES[term]) {
          suggestions[term] = SIMPLE_ALTERNATIVES[term];
        }
      }
    });

    return {
      hasJargon: jargonFound.length > 0,
      jargonFound,
      suggestions
    };
  }

  /**
   * Calculate reading level (Flesch-Kincaid Grade Level)
   * Target: < 6th grade (preferably 3rd-4th grade)
   */
  calculateReadingLevel(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countTotalSyllables(text);

    if (sentences.length === 0 || words.length === 0) {
      return { level: 0, score: 0 };
    }

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch-Kincaid Grade Level formula
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    // Flesch Reading Ease (0-100, higher is easier)
    const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    return {
      gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
      readingEase: Math.max(0, Math.min(100, Math.round(readingEase))),
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
    };
  }

  /**
   * Count syllables in text
   */
  countTotalSyllables(text) {
    return text.split(/\s+/)
      .filter(w => w.length > 0)
      .reduce((total, word) => total + this.countSyllables(word), 0);
  }

  /**
   * Count syllables in a single word (approximate)
   */
  countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;

    // Adjust for silent e
    if (word.endsWith('e')) count--;

    // Adjust for y at end
    if (word.endsWith('y') && count > 1) count--;

    return Math.max(1, count);
  }

  /**
   * Check sentence length
   * Target: < 15 words per sentence, ideally < 12
   */
  analyzeSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
    const maxLength = Math.max(...sentenceLengths, 0);
    const tooLong = sentenceLengths.filter(len => len > 15).length;

    return {
      avgLength: Math.round(avgLength * 10) / 10,
      maxLength,
      tooLongCount: tooLong,
      isSimple: avgLength <= 12 && maxLength <= 20
    };
  }

  /**
   * Check if explanation uses everyday concepts/analogies
   */
  usesEverydayAnalogies(text) {
    const lowerText = text.toLowerCase();
    const found = EVERYDAY_CONCEPTS.filter(concept =>
      lowerText.includes(concept)
    );

    // Look for analogy indicators
    const analogyIndicators = [
      'like', 'imagine', 'think of', 'similar to', 'just like',
      'as if', 'pretend', 'picture this', 'it\'s like when'
    ];

    const hasAnalogy = analogyIndicators.some(indicator =>
      lowerText.includes(indicator)
    );

    return {
      usesEverydayConcepts: found.length > 0,
      conceptsFound: found,
      hasAnalogyStructure: hasAnalogy,
      score: (found.length > 0 ? 0.6 : 0) + (hasAnalogy ? 0.4 : 0)
    };
  }

  /**
   * Check if text sounds conversational (not academic/formal)
   */
  isConversational(text) {
    const lowerText = text.toLowerCase();

    // Conversational indicators (GOOD)
    const conversationalPhrases = [
      'you know', 'think about', 'imagine', 'let\'s say', 'like when',
      'remember when', 'it\'s kinda like', 'basically', 'pretty much',
      'sort of', 'kind of'
    ];

    // Formal indicators (BAD)
    const formalPhrases = [
      'therefore', 'furthermore', 'moreover', 'consequently',
      'in conclusion', 'it is important to note', 'one must consider',
      'it should be noted', 'as previously mentioned'
    ];

    const conversationalCount = conversationalPhrases.filter(p => lowerText.includes(p)).length;
    const formalCount = formalPhrases.filter(p => lowerText.includes(p)).length;

    // Check for contractions (conversational)
    const contractions = (text.match(/\w+'\w+/g) || []).length;

    return {
      isConversational: conversationalCount > formalCount,
      conversationalPhrases: conversationalCount,
      formalPhrases: formalCount,
      hasContractions: contractions > 0,
      score: Math.min(1, (conversationalCount + contractions * 0.5) / 3)
    };
  }

  /**
   * MAIN VALIDATION: Comprehensive simplicity check
   * Returns a score from 0-100 (100 = perfect ELI5)
   */
  calculateSimplicityScore(text) {
    const jargon = this.detectJargon(text);
    const readingLevel = this.calculateReadingLevel(text);
    const sentenceLength = this.analyzeSentenceLength(text);
    const analogies = this.usesEverydayAnalogies(text);
    const conversational = this.isConversational(text);

    // Scoring weights
    const scores = {
      noJargon: jargon.hasJargon ? 0 : 25,          // 25 points: NO jargon allowed
      readingLevel: this.scoreReadingLevel(readingLevel.gradeLevel), // 25 points
      sentenceLength: sentenceLength.isSimple ? 20 : 10, // 20 points
      analogies: analogies.score * 15,               // 15 points
      conversational: conversational.score * 15      // 15 points
    };

    const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0));

    return {
      score: totalScore,
      details: {
        jargon,
        readingLevel,
        sentenceLength,
        analogies,
        conversational
      },
      breakdown: scores,
      passed: totalScore >= 70 // Need 70+ to pass
    };
  }

  /**
   * Score reading level (0-25 points)
   */
  scoreReadingLevel(gradeLevel) {
    if (gradeLevel <= 4) return 25;      // Perfect: 4th grade or below
    if (gradeLevel <= 6) return 20;      // Good: 5th-6th grade
    if (gradeLevel <= 8) return 10;      // Acceptable: 7th-8th grade
    if (gradeLevel <= 10) return 5;      // Poor: high school
    return 0;                             // Fail: college level
  }

  /**
   * Generate specific feedback for improving simplicity
   */
  generateFeedback(simplicityResult) {
    const feedback = [];
    const { details, score } = simplicityResult;

    // Jargon feedback
    if (details.jargon.hasJargon) {
      feedback.push({
        type: 'error',
        title: '🚫 Too Technical',
        message: `You used technical terms: ${details.jargon.jargonFound.slice(0, 3).join(', ')}`,
        suggestion: 'Try explaining without these words. What would you tell your neighbor?',
        examples: Object.entries(details.jargon.suggestions).slice(0, 3).map(
          ([term, simple]) => `Instead of "${term}", try "${simple}"`
        )
      });
    }

    // Reading level feedback
    if (details.readingLevel.gradeLevel > 6) {
      feedback.push({
        type: 'warning',
        title: '📚 Too Complex',
        message: `Reading level: ${details.readingLevel.gradeLevel}th grade (target: 4th-6th grade)`,
        suggestion: 'Use shorter words and simpler sentences.',
        tip: `Average ${details.readingLevel.avgWordsPerSentence} words/sentence - try for 10-12`
      });
    }

    // Sentence length feedback
    if (!details.sentenceLength.isSimple) {
      feedback.push({
        type: 'warning',
        title: '📏 Sentences Too Long',
        message: `Longest sentence: ${details.sentenceLength.maxLength} words`,
        suggestion: 'Break long sentences into shorter ones. Each sentence should be one simple idea.',
        tip: 'Target: 10-15 words per sentence'
      });
    }

    // Analogy feedback
    if (!details.analogies.hasAnalogyStructure) {
      feedback.push({
        type: 'hint',
        title: '💡 Use an Analogy',
        message: 'Explain this like something familiar',
        suggestion: 'Try: "It\'s like..." or "Imagine..." or "Think of..."',
        examples: [
          'Like a snowball rolling downhill...',
          'Imagine a coin spinning in the air...',
          'Think of a recipe where each ingredient matters...'
        ]
      });
    }

    // Conversational feedback
    if (!details.conversational.isConversational) {
      feedback.push({
        type: 'hint',
        title: '💬 Sound More Natural',
        message: 'This sounds too formal or academic',
        suggestion: 'Write like you\'re talking to a friend. Use "you", "we", "like", "kinda"',
        tip: 'Contractions are good! (it\'s, don\'t, can\'t)'
      });
    }

    // Overall encouragement
    if (score >= 70) {
      feedback.unshift({
        type: 'success',
        title: '✅ Great Simplicity!',
        message: `Simplicity score: ${score}/100`,
        suggestion: 'This is at the right level - clear and understandable!'
      });
    }

    return feedback;
  }

  /**
   * Get example transformations to show user
   */
  getExampleTransformations(concept) {
    const examples = {
      'quantum computing': {
        bad: 'Quantum computers leverage superposition states where qubits exist in multiple configurations simultaneously',
        good: 'Imagine a coin spinning in the air - it\'s both heads AND tails at the same time until it lands. Quantum computers use this trick to check many answers at once.'
      },
      'compound interest': {
        bad: 'Interest calculated on the principal sum plus accumulated interest from previous periods',
        good: 'Like a snowball rolling downhill - it picks up snow, and that new snow helps it pick up even MORE snow. Your money grows faster and faster!'
      },
      'machine learning': {
        bad: 'Algorithms that iteratively optimize parameters through gradient descent to minimize loss functions',
        good: 'Teaching a computer by showing it mistakes - like training a puppy! When it gets something wrong, you say "no, try again" until it learns.'
      }
    };

    return examples[concept.toLowerCase()] || null;
  }
}

export default new SimplicityChecker();
