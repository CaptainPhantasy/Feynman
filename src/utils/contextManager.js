/**
 * Context Manager - Handles context compression and token management
 */

import architecture from '../../shared/architecture.json';

const SOFT_THRESHOLD = parseInt(import.meta.env.VITE_SOFT_THRESHOLD) || architecture.compression_thresholds.soft;
const HARD_THRESHOLD = parseInt(import.meta.env.VITE_HARD_THRESHOLD) || architecture.compression_thresholds.hard;
const EMERGENCY_THRESHOLD = parseInt(import.meta.env.VITE_EMERGENCY_THRESHOLD) || architecture.compression_thresholds.emergency;

export class ContextManager {
  /**
   * Build context for API call with compression if needed
   */
  buildContext(conversationHistory, newMessage) {
    const messages = [...conversationHistory];

    if (newMessage) {
      messages.push(newMessage);
    }

    const tokenEstimate = this.estimateTokens(messages);

    // Apply compression based on thresholds
    if (tokenEstimate >= EMERGENCY_THRESHOLD) {
      return this.emergencyCompress(messages);
    } else if (tokenEstimate >= HARD_THRESHOLD) {
      return this.hardCompress(messages);
    } else if (tokenEstimate >= SOFT_THRESHOLD) {
      return this.softCompress(messages);
    }

    return messages;
  }

  /**
   * Soft compression - Keep structure, summarize old exchanges
   */
  softCompress(messages) {
    if (messages.length <= 10) return messages;

    // Keep first 2 (context setup) and last 6 (recent conversation)
    const recent = messages.slice(-6);
    const old = messages.slice(2, -6);

    const summary = this.summarizeExchanges(old);

    return [
      messages[0], // System context
      messages[1], // Initial teaching
      {
        role: 'user',
        content: `[Previous conversation summary: ${summary}]`
      },
      ...recent
    ];
  }

  /**
   * Hard compression - Extract only essential state
   */
  hardCompress(messages) {
    const state = this.extractState(messages);

    return [
      {
        role: 'user',
        content: this.buildStateContext(state)
      },
      ...messages.slice(-3) // Only keep last 3 exchanges
    ];
  }

  /**
   * Emergency compression - Minimal context only
   */
  emergencyCompress(messages) {
    const state = this.extractState(messages);

    return [
      {
        role: 'user',
        content: `[Context restored from checkpoint]
Concept: ${state.concept}
Current field: ${state.currentField}
Completed fields: ${state.completedFields.join(', ')}
Progress: ${state.approvedCount}/${state.totalFields} fields approved

User's current attempt: "${state.latestAttempt}"`
      }
    ];
  }

  /**
   * Extract learning state from conversation
   */
  extractState(messages) {
    const state = {
      concept: null,
      currentField: null,
      completedFields: [],
      approvedCount: 0,
      totalFields: 7,
      latestAttempt: '',
      misconceptionsCaught: []
    };

    // Parse messages to extract state
    messages.forEach(msg => {
      const content = msg.content;

      // Extract concept
      if (!state.concept && content.includes('Concept:')) {
        const match = content.match(/Concept:\s*"?([^"\n]+)"?/);
        if (match) state.concept = match[1];
      }

      // Extract current field
      if (content.includes('Field:')) {
        const match = content.match(/Field:\s*(\w+)/);
        if (match) state.currentField = match[1];
      }

      // Track approvals
      if (content.includes('APPROVED')) {
        state.approvedCount++;
        if (state.currentField && !state.completedFields.includes(state.currentField)) {
          state.completedFields.push(state.currentField);
        }
      }

      // Track misconceptions
      if (content.toLowerCase().includes('misconception')) {
        const match = content.match(/misconception[:\s]+([^.]+)/i);
        if (match) state.misconceptionsCaught.push(match[1]);
      }

      // Get latest attempt
      if (msg.role === 'user' && content.includes('attempt')) {
        const match = content.match(/attempt.*?:\s*"([^"]+)"/);
        if (match) state.latestAttempt = match[1];
      }
    });

    return state;
  }

  /**
   * Build context from state
   */
  buildStateContext(state) {
    return `Teaching concept: "${state.concept}"

Progress:
- Completed: ${state.completedFields.join(', ')}
- Current: ${state.currentField}
- Approved: ${state.approvedCount}/${state.totalFields}

${state.misconceptionsCaught.length > 0
  ? `Misconceptions caught: ${state.misconceptionsCaught.join('; ')}`
  : ''}

Continue teaching from current position.`;
  }

  /**
   * Summarize conversation exchanges
   */
  summarizeExchanges(messages) {
    const exchanges = [];
    let currentExchange = { field: null, attempts: 0, approved: false };

    messages.forEach(msg => {
      if (msg.content.includes('Field:')) {
        const match = msg.content.match(/Field:\s*(\w+)/);
        if (match) {
          if (currentExchange.field) exchanges.push({...currentExchange});
          currentExchange = { field: match[1], attempts: 0, approved: false };
        }
      }

      if (msg.role === 'user' && msg.content.includes('attempt')) {
        currentExchange.attempts++;
      }

      if (msg.content.includes('APPROVED')) {
        currentExchange.approved = true;
      }
    });

    if (currentExchange.field) exchanges.push(currentExchange);

    return exchanges.map(ex =>
      `${ex.field}: ${ex.attempts} attempts, ${ex.approved ? 'approved' : 'in progress'}`
    ).join('; ');
  }

  /**
   * Estimate token count (rough approximation)
   * Actual: ~4 chars per token for English text
   */
  estimateTokens(messages) {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * Check which threshold we're at
   */
  checkThreshold(tokenCount) {
    if (tokenCount >= EMERGENCY_THRESHOLD) return 'emergency';
    if (tokenCount >= HARD_THRESHOLD) return 'hard';
    if (tokenCount >= SOFT_THRESHOLD) return 'soft';
    return 'normal';
  }

  /**
   * Get compression recommendation
   */
  getCompressionAdvice(tokenCount) {
    const threshold = this.checkThreshold(tokenCount);

    const advice = {
      normal: 'Context is healthy',
      soft: 'Consider compressing old conversation history',
      hard: 'Compression recommended to maintain performance',
      emergency: 'Critical: Context must be compressed or checkpointed'
    };

    return {
      level: threshold,
      message: advice[threshold],
      shouldCompress: threshold !== 'normal',
      mustCompress: threshold === 'emergency'
    };
  }
}
