import React, { useState } from 'react';
import FieldComponent from '../FieldComponent/FieldComponent';
import ProgressTracking from '../ProgressTracking/ProgressTracking';
import claudeService from '../../services/claudeService';
import { BehaviorTracker, detectFrustration } from '../../utils/emotionalIntelligence';
import { exportToPDF } from '../../utils/pdfExport';
import { encodeState } from '../../utils/continuationCode';
import './PracticeSheetPane.css';

const behaviorTracker = new BehaviorTracker();

function PracticeSheetPane({ state, onStateUpdate }) {
  const [validatingField, setValidatingField] = useState(null);

  const handleFieldUpdate = (fieldName, value) => {
    const updatedFields = {
      ...state.fields,
      [fieldName]: {
        ...state.fields[fieldName],
        value
      }
    };

    onStateUpdate({
      ...state,
      fields: updatedFields,
      lastUpdate: Date.now()
    });

    behaviorTracker.recordTyping(value.length);
  };

  const handleFieldValidate = async (fieldName, value) => {
    if (!value.trim() || !state.concept) return;

    setValidatingField(fieldName);

    try {
      // Update field status to analyzing
      updateFieldStatus(fieldName, 'analyzing', null);

      // Check for frustration
      const previousAttempts = state.fields[fieldName].attempts || [];
      const frustration = detectFrustration(
        behaviorTracker.getHistory(),
        value,
        previousAttempts
      );

      // Validate with Claude
      const validation = await claudeService.validateField(
        fieldName,
        value,
        state.concept,
        {
          conversationHistory: state.conversationHistory,
          fieldRules: state.fields,
          previousAttempts,
          frustration
        }
      );

      // Update field with validation result
      updateFieldStatus(fieldName, validation.status, validation.suggestion);

      // If approved, unlock next field
      if (validation.status === 'approved') {
        unlockNextField(fieldName);
      }

      // Record attempt
      recordAttempt(fieldName, value, validation);

      // Update token count
      onStateUpdate({
        ...state,
        tokenCount: state.tokenCount + (validation.tokenCount || 500)
      });

    } catch (error) {
      console.error('Validation error:', error);
      updateFieldStatus(fieldName, 'pending', 'Validation failed. Please try again.');
    } finally {
      setValidatingField(null);
    }
  };

  const updateFieldStatus = (fieldName, status, feedback) => {
    const updatedFields = {
      ...state.fields,
      [fieldName]: {
        ...state.fields[fieldName],
        status,
        feedback
      }
    };

    onStateUpdate({
      ...state,
      fields: updatedFields,
      lastUpdate: Date.now()
    });
  };

  const unlockNextField = (fieldName) => {
    const fieldOrder = ['definition', 'mechanism', 'example', 'analogy', 'why_matters', 'misconception', 'integration'];
    const currentIndex = fieldOrder.indexOf(fieldName);

    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];

      const updatedFields = {
        ...state.fields,
        [nextField]: {
          ...state.fields[nextField],
          unlocked: true
        }
      };

      onStateUpdate({
        ...state,
        fields: updatedFields
      });
    }
  };

  const recordAttempt = (fieldName, value, validation) => {
    const attempts = [...(state.fields[fieldName].attempts || [])];
    attempts.push({
      value,
      timestamp: Date.now(),
      status: validation.status,
      feedback: validation.suggestion
    });

    const updatedFields = {
      ...state.fields,
      [fieldName]: {
        ...state.fields[fieldName],
        attempts
      }
    };

    onStateUpdate({
      ...state,
      fields: updatedFields
    });
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(state);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleGenerateContinuationCode = () => {
    try {
      const code = encodeState(state);
      navigator.clipboard.writeText(code);
      alert(`Continuation code copied to clipboard!\n\nCode: ${code}\n\nUse this to resume your learning session later.`);
    } catch (error) {
      console.error('Failed to generate continuation code:', error);
      alert('Failed to generate continuation code.');
    }
  };

  const isComplete = () => {
    return Object.values(state.fields).every(field => field.status === 'approved');
  };

  const fieldOrder = ['definition', 'mechanism', 'example', 'analogy', 'why_matters', 'misconception', 'integration'];

  return (
    <div className="practice-sheet-pane">
      <div className="pane-header">
        <h2>Your Practice Sheet</h2>
        {state.concept && (
          <p className="concept-title">{state.concept}</p>
        )}
      </div>

      <ProgressTracking state={state} />

      <div className="fields-container">
        {fieldOrder.map(fieldName => (
          <FieldComponent
            key={fieldName}
            fieldName={fieldName}
            field={state.fields[fieldName]}
            concept={state.concept}
            onUpdate={handleFieldUpdate}
            onValidate={handleFieldValidate}
            disabled={validatingField === fieldName}
          />
        ))}
      </div>

      {isComplete() && (
        <div className="completion-actions">
          <h3>🎉 Practice Sheet Complete!</h3>
          <p>You've mastered {state.concept}! Export your practice sheet for future review.</p>
          <div className="action-buttons">
            <button className="btn-success" onClick={handleExportPDF}>
              Export to PDF
            </button>
            <button className="btn-secondary" onClick={handleGenerateContinuationCode}>
              Get Continuation Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PracticeSheetPane;
