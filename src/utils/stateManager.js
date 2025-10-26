/**
 * State Manager - Handles application state persistence and recovery
 */

const STATE_VERSION = '1.0.0';
const STATE_KEY = 'feynman_state';
const CHECKPOINT_KEY = 'feynman_checkpoint';

export class StateManager {
  /**
   * Create initial application state
   */
  static createInitialState() {
    return {
      version: STATE_VERSION,
      concept: null,
      modules: [],
      currentModule: 0,
      fields: {
        definition: { value: '', status: 'pending', unlocked: true, attempts: [], revisionHistory: [] },
        mechanism: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] },
        example: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] },
        analogy: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] },
        why_matters: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] },
        misconception: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] },
        integration: { value: '', status: 'pending', unlocked: false, attempts: [], revisionHistory: [] }
      },
      conversationHistory: [],
      tokenCount: 0,
      startTime: null,
      lastUpdate: Date.now(),
      checkpoints: [],
      emotionalState: {
        frustrationIndicators: [],
        encouragementGiven: 0
      }
    };
  }

  /**
   * Save state to localStorage with compression
   */
  static saveState(state) {
    try {
      const compressed = this.compressState(state);
      localStorage.setItem(STATE_KEY, JSON.stringify(compressed));
      return true;
    } catch (error) {
      console.error('Failed to save state:', error);
      return false;
    }
  }

  /**
   * Restore state from localStorage
   */
  static restoreState() {
    try {
      const stored = localStorage.getItem(STATE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored);

      // Version migration
      if (state.version !== STATE_VERSION) {
        return this.migrateState(state);
      }

      return this.decompressState(state);
    } catch (error) {
      console.error('Failed to restore state:', error);
      return null;
    }
  }

  /**
   * Create checkpoint for recovery
   */
  static createCheckpoint(state) {
    const checkpoint = {
      timestamp: Date.now(),
      state: this.compressState(state),
      tokenCount: state.tokenCount
    };

    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
      return checkpoint;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      return null;
    }
  }

  /**
   * Restore from checkpoint
   */
  static restoreCheckpoint() {
    try {
      const stored = localStorage.getItem(CHECKPOINT_KEY);
      if (!stored) return null;

      const checkpoint = JSON.parse(stored);
      return this.decompressState(checkpoint.state);
    } catch (error) {
      console.error('Failed to restore checkpoint:', error);
      return null;
    }
  }

  /**
   * Compress state for storage
   */
  static compressState(state) {
    // Keep only essential data
    return {
      version: state.version,
      concept: state.concept,
      modules: state.modules,
      currentModule: state.currentModule,
      fields: state.fields,
      // Only keep recent conversation history
      conversationHistory: state.conversationHistory.slice(-10),
      tokenCount: state.tokenCount,
      startTime: state.startTime,
      lastUpdate: state.lastUpdate,
      emotionalState: state.emotionalState
    };
  }

  /**
   * Decompress state from storage
   */
  static decompressState(compressed) {
    return {
      ...compressed,
      checkpoints: []
    };
  }

  /**
   * Migrate state from older versions
   */
  static migrateState(oldState) {
    // Future: Handle version migrations
    console.warn('State version mismatch, creating fresh state');
    return this.createInitialState();
  }

  /**
   * Clear all saved state
   */
  static clearState() {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(CHECKPOINT_KEY);
  }

  /**
   * Export state for debugging
   */
  static exportState(state) {
    return JSON.stringify(state, null, 2);
  }

  /**
   * Calculate state size in bytes
   */
  static getStateSize(state) {
    return new Blob([JSON.stringify(state)]).size;
  }
}
