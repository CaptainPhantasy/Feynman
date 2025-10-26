/**
 * Continuation Code System - Encode/decode state for session recovery
 * Target: <1000 characters for easy sharing
 */

/**
 * Encode state to base64 continuation code
 */
export function encodeState(state) {
  try {
    // Extract only essential data
    const essential = {
      v: state.version,
      c: state.concept,
      m: state.currentModule,
      f: Object.entries(state.fields).reduce((acc, [key, field]) => {
        acc[key] = {
          v: field.value,
          s: field.status,
          u: field.unlocked
        };
        return acc;
      }, {}),
      t: state.tokenCount,
      st: state.startTime
    };

    // Convert to JSON and encode
    const json = JSON.stringify(essential);
    const encoded = btoa(json);

    // Add human-readable prefix
    const prefix = generatePrefix(state.concept);

    return `${prefix}-${encoded}`;
  } catch (error) {
    console.error('Failed to encode state:', error);
    throw new Error('State encoding failed');
  }
}

/**
 * Decode base64 continuation code to state
 */
export function decodeState(code) {
  try {
    // Remove prefix
    const parts = code.split('-');
    const encoded = parts[parts.length - 1];

    // Decode and parse
    const json = atob(encoded);
    const essential = JSON.parse(json);

    // Reconstruct full state
    return {
      version: essential.v,
      concept: essential.c,
      modules: [],
      currentModule: essential.m || 0,
      fields: Object.entries(essential.f).reduce((acc, [key, field]) => {
        acc[key] = {
          value: field.v,
          status: field.s,
          unlocked: field.u,
          attempts: [],
          revisionHistory: []
        };
        return acc;
      }, {}),
      conversationHistory: [],
      tokenCount: essential.t || 0,
      startTime: essential.st,
      lastUpdate: Date.now(),
      checkpoints: [],
      emotionalState: {
        frustrationIndicators: [],
        encouragementGiven: 0
      }
    };
  } catch (error) {
    console.error('Failed to decode state:', error);
    throw new Error('Invalid continuation code');
  }
}

/**
 * Generate human-readable prefix from concept
 */
export function generatePrefix(concept) {
  if (!concept) return 'FLS';

  // Take first 3 consonants of concept
  const consonants = concept.replace(/[aeiou\s]/gi, '').substring(0, 3).toUpperCase();

  // Add random 2-digit number for uniqueness
  const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');

  return `FLS-${consonants}${num}`;
}

/**
 * Validate continuation code format
 */
export function validateCode(code) {
  const pattern = /^FLS-[A-Z]{0,3}\d{2}-.+$/;
  return pattern.test(code);
}

/**
 * Get state size estimation
 */
export function getCodeSize(state) {
  try {
    const code = encodeState(state);
    return code.length;
  } catch (error) {
    return -1;
  }
}

/**
 * Create shareable continuation URL (for future use)
 */
export function createShareableURL(state) {
  const code = encodeState(state);
  const baseURL = window.location.origin;
  return `${baseURL}?continue=${encodeURIComponent(code)}`;
}

/**
 * Parse continuation code from URL
 */
export function parseURLCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('continue');
}
