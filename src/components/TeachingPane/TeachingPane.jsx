import React, { useState, useEffect, useRef } from 'react';
import claudeService from '../../services/claudeService';
import { ContextManager } from '../../utils/contextManager';
import { analyzeComplexity } from '../../utils/conceptAnalyzer';
import './TeachingPane.css';

const contextManager = new ContextManager();

function TeachingPane({ state, onStateUpdate }) {
  const [conceptInput, setConceptInput] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [isTeaching, setIsTeaching] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartLearning = async () => {
    if (!conceptInput.trim()) {
      alert('Please enter a concept to learn');
      return;
    }

    setIsResearching(true);
    addMessage('system', `Starting research on "${conceptInput}"...`);

    try {
      // Research phase
      const research = await claudeService.researchConcept(conceptInput);
      addMessage('assistant', `Research complete! I've gathered comprehensive information about ${conceptInput}.`);

      // Analyze complexity
      const complexity = analyzeComplexity(conceptInput, research.research);
      addMessage('assistant', `Complexity analysis: ${complexity.complexity}. ${complexity.recommendation.approach}`);

      // Analyze for modules
      const moduleAnalysis = await claudeService.analyzeConcept(conceptInput, research.research);

      // Update state
      const newState = {
        ...state,
        concept: conceptInput,
        modules: moduleAnalysis.modules || [{ name: conceptInput, description: 'Complete concept', order: 1 }],
        currentModule: 0,
        startTime: Date.now(),
        tokenCount: research.tokenCount
      };

      onStateUpdate(newState);

      // Start teaching
      if (moduleAnalysis.needsModules) {
        addMessage('assistant', `I'll break this into ${moduleAnalysis.modules.length} modules:\n${moduleAnalysis.modules.map((m, i) => `${i + 1}. ${m.name}`).join('\n')}\n\nLet's start with module 1.`);
      }

      addMessage('assistant', `Let's begin! I'll guide you through understanding ${conceptInput} using the Feynman technique. We'll start with the definition.\n\nIn your own words, how would you define ${conceptInput}?`);

      setIsTeaching(true);

    } catch (error) {
      console.error('Research failed:', error);
      addMessage('error', `Failed to start learning: ${error.message}. Please check your API key and try again.`);
    } finally {
      setIsResearching(false);
    }
  };

  const addMessage = (role, content, metadata = {}) => {
    setMessages(prev => [
      ...prev,
      {
        role,
        content,
        timestamp: Date.now(),
        ...metadata
      }
    ]);
  };

  const getContextStatus = () => {
    const advice = contextManager.getCompressionAdvice(state.tokenCount);
    return (
      <div className={`context-status ${advice.level}`}>
        <span className="status-label">Context:</span>
        <span className="status-value">{state.tokenCount.toLocaleString()} tokens</span>
        <span className="status-indicator" title={advice.message}>
          {advice.level === 'normal' && '🟢'}
          {advice.level === 'soft' && '🟡'}
          {advice.level === 'hard' && '🟠'}
          {advice.level === 'emergency' && '🔴'}
        </span>
      </div>
    );
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? This will clear your current progress.')) {
      onStateUpdate({
        ...state,
        concept: null,
        modules: [],
        currentModule: 0,
        fields: Object.keys(state.fields).reduce((acc, key) => {
          acc[key] = {
            value: '',
            status: 'pending',
            unlocked: key === 'definition',
            attempts: [],
            revisionHistory: []
          };
          return acc;
        }, {}),
        conversationHistory: [],
        tokenCount: 0,
        startTime: null
      });
      setMessages([]);
      setConceptInput('');
      setIsTeaching(false);
    }
  };

  return (
    <div className="teaching-pane">
      <div className="pane-header">
        <h2>Claude's Teaching</h2>
        {state.concept && (
          <div className="header-meta">
            {getContextStatus()}
            <button className="btn-secondary btn-small" onClick={handleReset}>
              Start New Concept
            </button>
          </div>
        )}
      </div>

      {!state.concept ? (
        <div className="concept-input-section">
          <h3>What do you want to master?</h3>
          <p className="text-muted">
            Enter any concept, and I'll guide you through understanding it deeply using the Feynman technique.
          </p>

          <div className="input-group">
            <input
              type="text"
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartLearning()}
              placeholder="e.g., Compound Interest, Neural Networks, Photosynthesis..."
              disabled={isResearching}
              autoFocus
            />
            <button
              className="btn-primary"
              onClick={handleStartLearning}
              disabled={isResearching || !conceptInput.trim()}
            >
              {isResearching ? 'Researching...' : 'Start Learning'}
            </button>
          </div>

          <div className="examples">
            <p className="text-small text-muted">Examples:</p>
            <div className="example-chips">
              {['Compound Interest', 'Quantum Entanglement', 'Supply and Demand', 'Recursion'].map(example => (
                <button
                  key={example}
                  className="chip"
                  onClick={() => setConceptInput(example)}
                  disabled={isResearching}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message message-${msg.role}`}>
              <div className="message-header">
                <span className="message-author">
                  {msg.role === 'assistant' ? '🤖 Claude' :
                   msg.role === 'system' ? 'ℹ️ System' :
                   msg.role === 'error' ? '⚠️ Error' : 'You'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {isResearching && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Researching {conceptInput}...</p>
          <p className="text-small text-muted">This may take a few moments</p>
        </div>
      )}
    </div>
  );
}

export default TeachingPane;
