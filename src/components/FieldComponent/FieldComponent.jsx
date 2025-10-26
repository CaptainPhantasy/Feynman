import React, { useState, useEffect, useRef } from 'react';
import fieldRules from '../../../shared/field_validation_rules.json';
import './FieldComponent.css';

function FieldComponent({ fieldName, field, concept, onUpdate, onValidate, disabled }) {
  const [localValue, setLocalValue] = useState(field.value);
  const [wordCount, setWordCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const rules = fieldRules[fieldName];

  useEffect(() => {
    setLocalValue(field.value);
    updateWordCount(field.value);
  }, [field.value]);

  const updateWordCount = (text) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    updateWordCount(newValue);
    setIsTyping(true);

    // Clear previous timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Debounce: validate after user stops typing for 1 second
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      onUpdate(fieldName, newValue);

      // Trigger real-time validation if there's enough content
      if (wordCount >= rules.min_words) {
        onValidate(fieldName, newValue);
      }
    }, 1000);
  };

  const getStatusIcon = () => {
    if (!field.unlocked) return '🔒';
    if (field.status === 'approved') return '✓';
    if (field.status === 'analyzing') return '⏳';
    if (field.status === 'needs_revision') return '🔄';
    return '📝';
  };

  const getStatusColor = () => {
    if (!field.unlocked) return 'locked';
    if (field.status === 'approved') return 'approved';
    if (field.status === 'analyzing') return 'analyzing';
    if (field.status === 'needs_revision') return 'needs-revision';
    return 'pending';
  };

  const isValid = wordCount >= rules.min_words && wordCount <= rules.max_words;

  return (
    <div className={`field-component ${getStatusColor()}`}>
      <div className="field-header">
        <div className="field-title">
          <span className="field-icon">{getStatusIcon()}</span>
          <h3>{fieldName.replace(/_/g, ' ')}</h3>
        </div>
        <div className="field-meta">
          <span className={`word-count ${!isValid && wordCount > 0 ? 'invalid' : ''}`}>
            {wordCount} / {rules.min_words}-{rules.max_words} words
          </span>
          {field.attempts && field.attempts.length > 0 && (
            <span className="attempt-count">
              Attempt #{field.attempts.length + 1}
            </span>
          )}
        </div>
      </div>

      <div className="field-requirements">
        <p className="text-small text-muted">
          Requirements: {rules.requirements.join(', ')}
        </p>
      </div>

      <textarea
        ref={textareaRef}
        className="field-textarea"
        value={localValue}
        onChange={handleChange}
        disabled={!field.unlocked || disabled}
        placeholder={
          field.unlocked
            ? `Explain the ${fieldName.replace(/_/g, ' ')} in your own words...`
            : `Complete ${getPreviousField(fieldName)} first to unlock`
        }
        rows={6}
      />

      {field.feedback && (
        <div className={`field-feedback ${field.status}`}>
          <p>{field.feedback}</p>
        </div>
      )}

      {isTyping && field.unlocked && (
        <div className="typing-indicator">
          <span className="text-small text-muted">Analyzing as you type...</span>
        </div>
      )}

      {field.status === 'approved' && rules.unlocks && (
        <div className="unlock-notification">
          <span className="text-success">✓ Unlocked: {rules.unlocks}</span>
        </div>
      )}
    </div>
  );
}

function getPreviousField(fieldName) {
  const order = ['definition', 'mechanism', 'example', 'analogy', 'why_matters', 'misconception', 'integration'];
  const index = order.indexOf(fieldName);
  return index > 0 ? order[index - 1].replace(/_/g, ' ') : '';
}

export default FieldComponent;
