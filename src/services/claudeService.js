/**
 * Claude Service - Handles all interactions with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { ContextManager } from '../utils/contextManager';
import SimplicityChecker from '../utils/simplicityChecker';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL = import.meta.env.VITE_API_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(import.meta.env.VITE_API_MAX_TOKENS) || 4096;
const THINKING_BUDGET = parseInt(import.meta.env.VITE_API_THINKING_BUDGET) || 2000;

class ClaudeService {
  constructor() {
    if (!API_KEY) {
      throw new Error('VITE_ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.client = new Anthropic({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true // Client-side only, no backend
    });

    this.contextManager = new ContextManager();
  }

  /**
   * Research a concept using web search
   */
  async researchConcept(concept) {
    const messages = [{
      role: 'user',
      content: `Research the concept "${concept}" thoroughly. I need to teach this concept to someone using the Feynman technique. Provide:
1. Core definition and key principles
2. Common misconceptions
3. Prerequisites needed to understand this
4. Real-world applications
5. Complexity estimate (simple/moderate/complex)

Use web search if needed to get accurate, up-to-date information.`
    }];

    try {
      const response = await this.makeRequest(messages, {
        enableWebSearch: true,
        systemPrompt: this.getResearchSystemPrompt()
      });

      return {
        research: response.content,
        tokenCount: response.tokenCount,
        usedWebSearch: response.usedWebSearch
      };
    } catch (error) {
      throw new Error(`Research failed: ${error.message}`);
    }
  }

  /**
   * Analyze concept complexity and determine module breakdown
   */
  async analyzeConcept(concept, research) {
    const messages = [{
      role: 'user',
      content: `Based on this research about "${concept}":

${research}

Analyze the complexity and determine:
1. Should this be broken into multiple modules? (If it has multiple distinct sub-concepts)
2. If yes, what should the modules be?
3. What's the recommended learning order?

Respond in JSON format:
{
  "needsModules": boolean,
  "modules": [{ "name": string, "description": string, "order": number }],
  "rationale": string
}`
    }];

    try {
      const response = await this.makeRequest(messages, {
        systemPrompt: this.getAnalysisSystemPrompt()
      });

      return JSON.parse(this.extractJSON(response.content));
    } catch (error) {
      console.error('Concept analysis failed:', error);
      // Fallback: single module
      return {
        needsModules: false,
        modules: [{ name: concept, description: 'Complete concept', order: 1 }],
        rationale: 'Single cohesive concept'
      };
    }
  }

  /**
   * Teach a specific field
   */
  async teachField(field, concept, userAttempt, context) {
    const { conversationHistory, fieldRules, previousAttempts } = context;

    const messages = this.contextManager.buildContext(conversationHistory, {
      role: 'user',
      content: this.buildTeachingPrompt(field, concept, userAttempt, fieldRules, previousAttempts)
    });

    try {
      const response = await this.makeRequest(messages, {
        systemPrompt: this.getTeachingSystemPrompt(field, concept),
        maxTokens: MAX_TOKENS
      });

      return {
        feedback: response.content,
        tokenCount: response.tokenCount,
        thinking: response.thinking
      };
    } catch (error) {
      throw new Error(`Teaching failed: ${error.message}`);
    }
  }

  /**
   * Validate a field using PYRAMID VALIDATION
   *
   * CRITICAL: Check simplicity BEFORE accuracy!
   * Level 1: Jargon Check (reject technical terms)
   * Level 2: Simplicity Check (reading level, sentence length)
   * Level 3: ELI5 Check (would a 5-year-old understand?)
   * Level 4: Accuracy Check (only now check if it's correct)
   */
  async validateField(field, userText, concept, context) {
    // LEVEL 1: JARGON CHECK (reject technical terms immediately)
    const jargonCheck = SimplicityChecker.detectJargon(userText);
    if (jargonCheck.hasJargon) {
      return {
        status: 'needs_revision',
        validationLevel: 'JARGON_REJECTED',
        issues: [`Too technical: You used "${jargonCheck.jargonFound.slice(0, 3).join('", "')}" `],
        strengths: [],
        suggestion: this.generateJargonFeedback(jargonCheck, concept),
        simplicityScore: 0,
        feedback: SimplicityChecker.generateFeedback({
          score: 0,
          details: { jargon: jargonCheck }
        })
      };
    }

    // LEVEL 2: SIMPLICITY CHECK (reading level, sentence length)
    const simplicityResult = SimplicityChecker.calculateSimplicityScore(userText);

    if (simplicityResult.score < 70) {
      // Failed simplicity test - provide specific feedback
      return {
        status: 'needs_revision',
        validationLevel: 'SIMPLICITY_REJECTED',
        issues: ['Explanation is too complex for ELI5 level'],
        strengths: this.findSimplicityStrengths(simplicityResult),
        suggestion: this.generateSimplicityFeedback(simplicityResult, concept),
        simplicityScore: simplicityResult.score,
        simplicityDetails: simplicityResult.details,
        feedback: SimplicityChecker.generateFeedback(simplicityResult)
      };
    }

    // LEVEL 3: ELI5 CHECK (would a child understand this?)
    const eli5Check = await this.checkELI5Understanding(userText, concept, field);
    if (!eli5Check.passed) {
      return {
        status: 'needs_revision',
        validationLevel: 'ELI5_REJECTED',
        issues: [eli5Check.issue],
        strengths: simplicityResult.score >= 70 ? ['Simple language - good!'] : [],
        suggestion: eli5Check.suggestion,
        simplicityScore: simplicityResult.score,
        feedback: [{
          type: 'warning',
          title: '👶 Five-Year-Old Test Failed',
          message: eli5Check.issue,
          suggestion: eli5Check.suggestion
        }]
      };
    }

    // LEVEL 4: ACCURACY CHECK (only now check if simple explanation is correct)
    const accuracyCheck = await this.checkAccuracy(userText, concept, field, context);

    return {
      status: accuracyCheck.status,
      validationLevel: 'FULL_VALIDATION',
      issues: accuracyCheck.issues,
      strengths: [
        ...this.findSimplicityStrengths(simplicityResult),
        ...accuracyCheck.strengths
      ],
      suggestion: accuracyCheck.suggestion,
      simplicityScore: simplicityResult.score,
      simplicityDetails: simplicityResult.details
    };
  }

  /**
   * Generate feedback for jargon usage
   */
  generateJargonFeedback(jargonCheck, concept) {
    const jargonList = jargonCheck.jargonFound.slice(0, 3);
    const suggestions = Object.entries(jargonCheck.suggestions)
      .slice(0, 3)
      .map(([term, simple]) => `Instead of "${term}", try "${simple}"`)
      .join('\n');

    const exampleTransform = SimplicityChecker.getExampleTransformations(concept);

    let feedback = `⚠️ Too technical! You used: ${jargonList.join(', ')}\n\n`;
    feedback += `🎯 The Feynman Technique Rule: If a 5-year-old wouldn't know this word, don't use it!\n\n`;

    if (suggestions) {
      feedback += `Try:\n${suggestions}\n\n`;
    }

    feedback += `Ask yourself: "How would I explain this to my neighbor who knows nothing about ${concept}?"\n\n`;

    if (exampleTransform) {
      feedback += `Example:\n`;
      feedback += `❌ "${exampleTransform.bad}"\n`;
      feedback += `✅ "${exampleTransform.good}"`;
    }

    return feedback;
  }

  /**
   * Generate feedback for simplicity issues
   */
  generateSimplicityFeedback(simplicityResult, concept) {
    const { details, score } = simplicityResult;
    let feedback = `📚 Simplicity Score: ${score}/100 (need 70+ to pass)\n\n`;

    if (details.readingLevel.gradeLevel > 6) {
      feedback += `⚠️ Reading Level: ${details.readingLevel.gradeLevel}th grade (target: 4th-6th grade)\n`;
      feedback += `Your sentences are too complex. Break them into shorter, simpler pieces.\n\n`;
    }

    if (!details.sentenceLength.isSimple) {
      feedback += `📏 Sentences too long! Longest: ${details.sentenceLength.maxLength} words\n`;
      feedback += `Try: 10-15 words per sentence. Each sentence = one simple idea.\n\n`;
    }

    if (!details.analogies.hasAnalogyStructure) {
      feedback += `💡 Use an analogy! Start with:\n`;
      feedback += `"It's like..."\n`;
      feedback += `"Imagine..."\n`;
      feedback += `"Think of..."\n\n`;
    }

    if (!details.conversational.isConversational) {
      feedback += `💬 Sound more natural!\n`;
      feedback += `Write like you're talking to a friend.\n`;
      feedback += `Use: "you", "we", "like", "kinda"\n`;
      feedback += `Contractions are good: "it's", "don't", "can't"\n\n`;
    }

    const exampleTransform = SimplicityChecker.getExampleTransformations(concept);
    if (exampleTransform) {
      feedback += `\nExample for ${concept}:\n`;
      feedback += `❌ "${exampleTransform.bad}"\n`;
      feedback += `✅ "${exampleTransform.good}"`;
    }

    return feedback;
  }

  /**
   * Find strengths in simplicity (for encouragement)
   */
  findSimplicityStrengths(simplicityResult) {
    const strengths = [];
    const { details } = simplicityResult;

    if (!details.jargon?.hasJargon) {
      strengths.push('✓ No jargon - using everyday words!');
    }

    if (details.analogies?.hasAnalogyStructure) {
      strengths.push('✓ Using analogies - great for understanding!');
    }

    if (details.conversational?.isConversational) {
      strengths.push('✓ Conversational tone - sounds natural!');
    }

    if (details.readingLevel?.gradeLevel <= 6) {
      strengths.push('✓ Reading level perfect for ELI5!');
    }

    return strengths;
  }

  /**
   * Check if a 5-year-old would understand this
   */
  async checkELI5Understanding(userText, concept, field) {
    const messages = [{
      role: 'user',
      content: `Pretend you are a curious, intelligent 5-year-old child.

Someone just explained "${field}" about "${concept}" to you:

"${userText}"

Questions:
1. Do you understand what they're saying?
2. Could you repeat this idea to your friend at the playground?
3. Does it use things you know from your daily life (toys, food, games, family)?
4. Are there any words you don't understand?

Respond in JSON:
{
  "understand": boolean,
  "couldExplainToFriend": boolean,
  "usesKidConcepts": boolean,
  "confusingWords": [string],
  "whatYouThinkItMeans": string
}`
    }];

    try {
      const response = await this.makeRequest(messages, {
        systemPrompt: 'You are a 5-year-old child. Be honest about what you understand and what confuses you.',
        maxTokens: 512
      });

      const result = JSON.parse(this.extractJSON(response.content));

      const passed = result.understand &&
                    result.couldExplainToFriend &&
                    result.usesKidConcepts &&
                    result.confusingWords.length === 0;

      return {
        passed,
        result,
        issue: !passed ? `A 5-year-old said: "${result.whatYouThinkItMeans}"` : null,
        suggestion: !passed ? this.generateELI5Suggestion(result) : null
      };
    } catch (error) {
      console.error('ELI5 check failed:', error);
      // If check fails, be lenient and move to accuracy check
      return { passed: true, result: null, issue: null, suggestion: null };
    }
  }

  /**
   * Generate ELI5 feedback based on child's understanding
   */
  generateELI5Suggestion(eli5Result) {
    let feedback = `🧒 A 5-year-old's response:\n\n`;

    if (!eli5Result.understand) {
      feedback += `"I don't really understand that."\n\n`;
    } else {
      feedback += `They think it means: "${eli5Result.whatYouThinkItMeans}"\n\n`;
    }

    if (eli5Result.confusingWords.length > 0) {
      feedback += `Words they don't know: ${eli5Result.confusingWords.join(', ')}\n\n`;
    }

    feedback += `💡 Try explaining using:\n`;
    feedback += `- Things a kid does every day\n`;
    feedback += `- Toys, games, or playground activities\n`;
    feedback += `- Food or cooking\n`;
    feedback += `- Animals or nature\n\n`;
    feedback += `Remember: If your explanation works for a curious 5-year-old, it works for anyone!`;

    return feedback;
  }

  /**
   * Check accuracy (only called after simplicity passes)
   */
  async checkAccuracy(userText, concept, field, context) {
    const messages = [{
      role: 'user',
      content: `Concept: ${concept}
Field: ${field}
User's simple explanation: "${userText}"

This explanation has already passed simplicity checks (ELI5 level).
Now verify ONLY:
1. Is it factually accurate?
2. Are there misconceptions?
3. Is it complete for this field?

IMPORTANT: Do NOT penalize for being simple!
Simple explanations that are 80% accurate are BETTER than complex 100% accurate ones.

Respond in JSON:
{
  "status": "approved" | "needs_revision",
  "issues": [string],
  "strengths": [string],
  "suggestion": string | null
}`
    }];

    try {
      const response = await this.makeRequest(messages, {
        systemPrompt: this.getAccuracyValidationPrompt(),
        maxTokens: 1024
      });

      return JSON.parse(this.extractJSON(response.content));
    } catch (error) {
      console.error('Accuracy check failed:', error);
      return {
        status: 'analyzing',
        issues: [],
        strengths: [],
        suggestion: null
      };
    }
  }

  /**
   * Make API request with retry logic
   */
  async makeRequest(messages, options = {}) {
    const {
      systemPrompt = '',
      maxTokens = MAX_TOKENS,
      enableWebSearch = false,
      retries = 3
    } = options;

    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const params = {
          model: MODEL,
          max_tokens: maxTokens,
          messages: messages,
          thinking: {
            type: 'enabled',
            budget_tokens: THINKING_BUDGET
          }
        };

        if (systemPrompt) {
          params.system = systemPrompt;
        }

        // Note: Web search would be configured here if available in the API
        // For now, we rely on Claude's training data and extended thinking

        const response = await this.client.messages.create(params);

        // Extract content and thinking
        const content = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        const thinking = response.content
          .filter(block => block.type === 'thinking')
          .map(block => block.thinking)
          .join('\n');

        return {
          content,
          thinking,
          tokenCount: response.usage.input_tokens + response.usage.output_tokens,
          usedWebSearch: false // Would be determined by API response
        };

      } catch (error) {
        lastError = error;

        // Exponential backoff
        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`API request failed, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Build teaching prompt
   */
  buildTeachingPrompt(field, concept, userAttempt, fieldRules, previousAttempts) {
    const rules = fieldRules[field];
    const attempts = previousAttempts.length;

    return `I'm teaching "${concept}" using the Feynman technique.

Field: ${field}
Requirements: ${rules.requirements.join(', ')}

User's attempt #${attempts + 1}: "${userAttempt}"

${attempts > 0 ? `Previous attempts: ${attempts}` : 'This is their first attempt.'}

Analyze this attempt and provide guidance. Be:
- Specific about what's wrong or missing
- Encouraging but honest
- Focused on understanding, not memorization
- Patient with struggle (it's part of learning)

If approved, say clearly "APPROVED" and explain why it's good.
If needs work, explain what specifically needs improvement.`;
  }

  /**
   * System prompts
   */
  getResearchSystemPrompt() {
    return `You are a research assistant helping prepare teaching material for the Feynman technique.
Provide accurate, comprehensive information that will help teach the concept clearly.
Focus on clarity, accuracy, and identifying common misconceptions.`;
  }

  getAnalysisSystemPrompt() {
    return `You are a curriculum designer. Analyze whether concepts need to be broken into multiple modules.
A concept needs modules if it has:
- Multiple distinct sub-concepts
- Complex prerequisites
- Would take >30 minutes to master
Otherwise, keep it as a single module.`;
  }

  getTeachingSystemPrompt(field, concept) {
    return `You are a Socratic teacher using the Feynman technique to ensure deep understanding of "${concept}".

CRITICAL RULE: The student must explain things so simply that a 5-year-old could understand.

Your role:
1. REJECT any jargon, technical terms, or academic language immediately
2. DEMAND everyday analogies (kitchen, playground, toys, nature)
3. Catch misconceptions immediately
4. Push for simpler explanations - "Can you say that even simpler?"
5. Only approve when it's both SIMPLE and ACCURATE

Field being taught: ${field}

Examples of what to REJECT:
❌ "Utilizes quantum mechanical properties" → Too academic
❌ "Interest calculated on principal plus accumulated interest" → Too formal
❌ "Leverages parallel computation paths" → Jargon

Examples of what to APPROVE:
✅ "Like a coin spinning in the air - it's both heads AND tails at once"
✅ "Like a snowball rolling downhill, picking up more and more snow"
✅ "Like checking every hiding spot at the same time instead of one by one"

Remember: If a curious 5-year-old wouldn't understand it, send them back to simplify!`;
  }

  getAccuracyValidationPrompt() {
    return `You are validating the factual accuracy of a user's explanation.

IMPORTANT: This explanation has already passed ELI5 simplicity checks.
Your ONLY job is to verify it's factually correct.

Do NOT penalize for:
- Being too simple
- Using analogies instead of technical terms
- Lacking complex details

DO penalize for:
- Factual errors
- Misconceptions
- Incomplete core ideas

Remember: A simple 80% accurate explanation is BETTER than a complex 100% accurate one!`;
  }

  getValidationSystemPrompt(field) {
    return `You are validating a user's explanation for the "${field}" field.

CRITICAL: Simplicity is MORE important than comprehensiveness.
The explanation must be at ELI5 level (5-year-old understands).

Check in this order:
1. Is it simple enough? (no jargon, everyday words)
2. Would a child understand it?
3. Is it factually accurate?

Reject immediately if too technical or complex.`;
  }

  /**
   * Extract JSON from response that might contain markdown
   */
  extractJSON(text) {
    // Try to find JSON in markdown code blocks
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // Try to find JSON object directly
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return objectMatch[0];
    }

    return text;
  }
}

// Singleton instance
export default new ClaudeService();
