import React, { useState, useEffect } from 'react';
import TeachingPane from './components/TeachingPane/TeachingPane';
import PracticeSheetPane from './components/PracticeSheetPane/PracticeSheetPane';
import DemoPlayer from './components/DemoPlayer/DemoPlayer';
import { StateManager } from './utils/stateManager';
import './styles/App.css';

function App() {
  const [appState, setAppState] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize or restore state
    const initializeApp = async () => {
      try {
        const restored = StateManager.restoreState();
        if (restored) {
          setAppState(restored);
        } else {
          // Check if user wants to see demo on first visit
          const hasSeenDemo = localStorage.getItem('feynman_seen_demo');
          if (!hasSeenDemo) {
            setShowDemo(true);
          }
          // Initialize fresh state
          setAppState(StateManager.createInitialState());
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppState(StateManager.createInitialState());
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Auto-save state changes
    if (appState && !isLoading) {
      StateManager.saveState(appState);
    }
  }, [appState, isLoading]);

  const handleDemoComplete = (startLearning) => {
    localStorage.setItem('feynman_seen_demo', 'true');
    setShowDemo(false);
    if (startLearning) {
      setAppState(StateManager.createInitialState());
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Feynman Learning System...</p>
      </div>
    );
  }

  if (showDemo) {
    return <DemoPlayer onComplete={handleDemoComplete} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Feynman Learning System</h1>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowDemo(true)}
          >
            Watch Demo
          </button>
        </div>
      </header>

      <main className="app-main">
        <TeachingPane
          state={appState}
          onStateUpdate={setAppState}
        />
        <PracticeSheetPane
          state={appState}
          onStateUpdate={setAppState}
        />
      </main>
    </div>
  );
}

export default App;
