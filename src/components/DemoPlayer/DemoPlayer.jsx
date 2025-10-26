import React, { useState, useEffect, useRef } from 'react';
import demoScript from '../../../shared/demo_script.json';
import './DemoPlayer.css';

function DemoPlayer({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [fieldValues, setFieldValues] = useState({
    definition: '',
    mechanism: ''
  });

  const timerRef = useRef(null);
  const stepRef = useRef(0);

  useEffect(() => {
    startDemo();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  const startDemo = () => {
    playNextStep();
  };

  const playNextStep = () => {
    if (stepRef.current >= demoScript.sequence.length) {
      return; // Demo complete
    }

    const step = demoScript.sequence[stepRef.current];
    executeStep(step);

    if (step.duration && step.action !== 'show_cta') {
      const delay = (step.duration * 1000) / speed;
      timerRef.current = setTimeout(() => {
        if (!isPaused) {
          setCurrentStep(stepRef.current + 1);
        }
      }, delay);
    }
  };

  useEffect(() => {
    if (currentStep > 0 && !isPaused) {
      playNextStep();
    }
  }, [currentStep, isPaused]);

  const executeStep = (step) => {
    switch (step.action) {
      case 'user_types':
        simulateTyping(step.field, step.typed_text, step.typing_speed);
        break;

      case 'user_deletes':
        setFieldValues(prev => ({
          ...prev,
          [step.field]: ''
        }));
        break;

      case 'user_pause':
        // Just a visual pause, handled by duration
        break;

      default:
        // Other actions handled in render
        break;
    }
  };

  const simulateTyping = (field, text, speed) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setFieldValues(prev => ({
          ...prev,
          [field]: text.substring(0, index)
        }));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1000 / (speed / 10));
  };

  const getCurrentMessage = () => {
    const relevantSteps = demoScript.sequence.slice(0, currentStep + 1).reverse();

    const latestTeaching = relevantSteps.find(s =>
      ['show_welcome', 'claude_teaching_start', 'claude_feedback', 'claude_teaching'].includes(s.action)
    );

    return latestTeaching?.content || '';
  };

  const getFieldStatus = (fieldName) => {
    const relevantSteps = demoScript.sequence.slice(0, currentStep + 1).reverse();
    const latestFeedback = relevantSteps.find(s => s.field === fieldName && s.action === 'claude_feedback');

    if (latestFeedback) {
      return latestFeedback.feedback_type;
    }

    const isUnlocked = relevantSteps.find(s => s.field === fieldName);
    return isUnlocked ? 'pending' : 'locked';
  };

  const handleSkip = () => {
    onComplete(false);
  };

  const handleStartLearning = () => {
    onComplete(true);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const currentAction = demoScript.sequence[currentStep];
  const showCTA = currentAction?.action === 'show_cta';

  return (
    <div className="demo-player">
      <div className="demo-header">
        <div className="demo-title">
          <span className="demo-badge">Demo</span>
          <h2>How the Feynman Learning System Works</h2>
        </div>
        <div className="demo-controls">
          <div className="speed-controls">
            <label>Speed:</label>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={togglePause}>
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button className="btn-secondary" onClick={handleSkip}>
            Skip Demo
          </button>
        </div>
      </div>

      <div className="demo-content">
        {/* Teaching Pane Simulation */}
        <div className="demo-teaching-pane">
          <h3>Claude's Teaching</h3>
          <div className="demo-messages">
            <div className="demo-message">
              <div className="message-header">
                <span>🤖 Claude</span>
              </div>
              <div className="message-content">
                {getCurrentMessage()}
              </div>
              {currentAction?.show_thinking && (
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="text-small text-muted">Thinking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Practice Sheet Simulation */}
        <div className="demo-practice-pane">
          <h3>Your Practice Sheet</h3>
          <div className="demo-fields">
            {['definition', 'mechanism'].map(fieldName => {
              const status = getFieldStatus(fieldName);
              const value = fieldValues[fieldName] || '';

              return (
                <div key={fieldName} className={`demo-field ${status}`}>
                  <div className="field-header">
                    <h4>{fieldName}</h4>
                    <span className="status-badge">{status}</span>
                  </div>
                  <div className="field-input">
                    <textarea
                      value={value}
                      readOnly
                      placeholder={status === 'locked' ? 'Locked' : 'Type your explanation...'}
                    />
                  </div>
                  {currentAction?.field === fieldName && currentAction?.feedback_type && (
                    <div className={`demo-feedback ${currentAction.feedback_type}`}>
                      {currentAction.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCTA && (
        <div className="demo-cta-overlay">
          <div className="demo-cta-content">
            <h2>Ready to Master Your Own Concept?</h2>
            <p>
              You've seen how the system catches misconceptions, provides specific feedback,
              and guides you through struggle to genuine understanding.
            </p>
            <div className="cta-buttons">
              <button className="btn-primary btn-large" onClick={handleStartLearning}>
                Start Your Learning
              </button>
              <button className="btn-secondary" onClick={handleSkip}>
                Watch Again Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="demo-progress">
        <div
          className="demo-progress-bar"
          style={{ width: `${(currentStep / demoScript.sequence.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default DemoPlayer;
