/**
 * Claude Service - Handles all interactions with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { ContextManager } from '../utils/contextManager';

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
   * Validate a field in real-time
   */
  async validateField(field, userText, concept, context) {
    const messages = [{
      role: 'user',
      content: `Concept: ${concept}
Field: ${field}
User's current text: "${userText}"

Analyze this attempt. Respond in JSON:
{
  "status": "approved" | "needs_revision" | "analyzing",
  "issues": [string],
  "strengths": [string],
  "suggestion": string | null
}`
    }];

    try {
      const response = await this.makeRequest(messages, {
        systemPrompt: this.getValidationSystemPrompt(field),
        maxTokens: 1024
      });

      return JSON.parse(this.extractJSON(response.content));
    } catch (error) {
      console.error('Validation failed:', error);
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

Your role:
1. Validate understanding thoroughly - accept nothing vague or memorized
2. Catch misconceptions immediately
3. Ask probing questions when explanations are incomplete
4. Encourage struggle as part of learning
5. Be specific in feedback - general praise is useless

Field being taught: ${field}

CRITICAL: Only approve when the explanation demonstrates genuine understanding in the student's own words.`;
  }

  getValidationSystemPrompt(field) {
    return `You are validating a user's explanation for the "${field}" field.
Analyze quickly and provide structured feedback.
Focus on factual accuracy and clarity.`;
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
