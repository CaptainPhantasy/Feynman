import React from 'react';
import './ProgressTracking.css';

function ProgressTracking({ state }) {
  const fields = ['definition', 'mechanism', 'example', 'analogy', 'why_matters', 'misconception', 'integration'];

  const getCompletedCount = () => {
    return fields.filter(field => state.fields[field].status === 'approved').length;
  };

  const getProgressPercentage = () => {
    return (getCompletedCount() / fields.length) * 100;
  };

  const getTimeSpent = () => {
    if (!state.startTime) return '0m';

    const minutes = Math.floor((Date.now() - state.startTime) / 60000);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getFieldIcon = (field) => {
    if (field.status === 'approved') return '✓';
    if (field.status === 'analyzing') return '⏳';
    if (field.status === 'needs_revision') return '🔄';
    if (field.unlocked) return '📝';
    return '🔒';
  };

  const getFieldStatus = (field) => {
    if (!field.unlocked) return 'locked';
    return field.status;
  };

  return (
    <div className="progress-tracking">
      <div className="progress-header">
        <h3>Progress</h3>
        <span className="progress-count">
          {getCompletedCount()} / {fields.length} complete
        </span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <span className="progress-percentage">
          {Math.round(getProgressPercentage())}%
        </span>
      </div>

      <div className="field-progress-list">
        {fields.map((fieldName) => {
          const field = state.fields[fieldName];
          const status = getFieldStatus(field);

          return (
            <div key={fieldName} className={`field-progress-item ${status}`}>
              <span className="field-icon">{getFieldIcon(field)}</span>
              <span className="field-name">{fieldName.replace(/_/g, ' ')}</span>
              {field.attempts && field.attempts.length > 0 && (
                <span className="field-attempts">
                  {field.attempts.length} {field.attempts.length === 1 ? 'attempt' : 'attempts'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {state.startTime && (
        <div className="progress-meta">
          <div className="meta-item">
            <span className="meta-label">Time spent:</span>
            <span className="meta-value">{getTimeSpent()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Context:</span>
            <span className="meta-value">{state.tokenCount.toLocaleString()} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressTracking;
