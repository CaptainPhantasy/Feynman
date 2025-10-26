# Feynman Learning System

An AI-powered learning tool that guarantees concept mastery through iterative teaching loops using the Feynman Technique.

## Overview

The Feynman Learning System uses Claude Sonnet 4.5 to guide learners through a rigorous process of understanding any concept deeply. Through real-time validation, misconception detection, and unlimited teaching loops, it ensures you truly understand concepts in your own words.

### Key Features

- **Two-Pane Interface**: Claude's teaching on the left, your practice sheet on the right
- **Progressive Field Unlocking**: Master each aspect before moving forward
- **Real-Time Validation**: Instant feedback as you type
- **Unlimited Teaching Loops**: No arbitrary caps on learning attempts
- **Context Compression**: Intelligent management of conversation history
- **Continuation Codes**: Resume learning sessions across devices
- **PDF Export**: Save your completed practice sheets for review
- **Demo Mode**: See the system in action with compound interest example
- **Emotional Intelligence**: Detects frustration and provides encouragement
- **Module Decomposition**: Complex concepts automatically broken into manageable parts

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CaptainPhantasy/Feynman.git
cd Feynman
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Add your Anthropic API key to `.env`:
```env
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser to `http://localhost:3000`

## Architecture

### Core Components

```
src/
├── components/
│   ├── TeachingPane/          # Claude's teaching interface
│   ├── PracticeSheetPane/     # User's practice fields
│   ├── FieldComponent/        # Individual field with validation
│   ├── ProgressTracking/      # Visual progress indicators
│   └── DemoPlayer/            # Interactive demonstration
├── services/
│   └── claudeService.js       # Anthropic API integration
├── utils/
│   ├── stateManager.js        # State persistence & recovery
│   ├── contextManager.js      # Context compression (3-tier)
│   ├── conceptAnalyzer.js     # Module decomposition engine
│   ├── continuationCode.js    # Session encoding/decoding
│   ├── emotionalIntelligence.js # Frustration detection
│   └── pdfExport.js           # PDF generation
└── shared/
    ├── architecture.json       # System configuration
    ├── field_validation_rules.json # Validation requirements
    └── demo_script.json        # Demo playback sequence
```

### Seven Field System

Each concept is mastered through seven progressive fields:

1. **Definition** - What is it? (factually correct, own words, complete)
2. **Mechanism** - How does it work? (causal accuracy, no misconceptions, concrete)
3. **Example** - Real-world demonstration (concrete scenario, demonstrates mechanism, realistic)
4. **Analogy** - Comparison to familiar concept (maps cleanly, illuminates core principle, accessible)
5. **Why It Matters** - Practical relevance (practical relevance, genuine importance, specific)
6. **Misconception** - Common mistake (common error, explains why wrong, clarifies truth)
7. **Integration** - Connection to existing knowledge (connects to existing, builds knowledge web, demonstrates understanding)

### Context Compression System

Three-tier compression manages token limits:

- **Soft (30K tokens)**: Summarize old exchanges, keep recent conversation
- **Hard (50K tokens)**: Extract essential state, keep last 3 exchanges
- **Emergency (70K tokens)**: Minimal context only, trigger checkpoint

### Continuation Code Format

```
FLS-{ConsonantPrefix}{RandomNum}-{Base64EncodedState}

Example: FLS-CMP17-eyJ2IjoiMS4wLjAiLCJjIjoiQ29tcG91bmQgSW50ZXJlc3QiLCAuLi59
```

Target size: <1000 characters

## Usage

### Learning a New Concept

1. Launch the app and watch the demo (optional)
2. Enter your concept (e.g., "Quantum Entanglement")
3. Claude researches and analyzes complexity
4. Work through each field progressively
5. Receive real-time feedback on each explanation
6. Revise based on Claude's guidance until approved
7. Export completed practice sheet to PDF

### Resuming a Session

1. Click "Load Continuation Code"
2. Paste your continuation code
3. Resume exactly where you left off

### Understanding Field Status

- 🔒 **Locked** - Complete previous field first
- 📝 **Pending** - Ready for your input
- ⏳ **Analyzing** - Claude is reviewing
- 🔄 **Needs Revision** - Specific feedback provided
- ✓ **Approved** - Field mastered, next unlocked

## Configuration

### Environment Variables

```env
# Required
VITE_ANTHROPIC_API_KEY=your_key_here

# Optional (defaults shown)
VITE_API_MODEL=claude-sonnet-4-20250514
VITE_API_MAX_TOKENS=4096
VITE_API_THINKING_BUDGET=2000

# Context Compression Thresholds
VITE_SOFT_THRESHOLD=30000
VITE_HARD_THRESHOLD=50000
VITE_EMERGENCY_THRESHOLD=70000

# Features
VITE_ENABLE_WEB_SEARCH=true
VITE_ENABLE_DEMO=true
```

### Customizing Field Rules

Edit `shared/field_validation_rules.json` to adjust requirements:

```json
{
  "definition": {
    "requirements": ["factually_correct", "own_words", "complete"],
    "min_words": 15,
    "max_words": 150,
    "unlocks": "mechanism"
  }
}
```

## Development

### Build Commands

```bash
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run test suite
```

### Project Structure

- Client-side only (no backend required)
- React 18 + Vite for fast development
- localStorage for state persistence
- Anthropic SDK for Claude integration
- jsPDF for export functionality

### Adding New Fields

1. Add field to `shared/field_validation_rules.json`
2. Update field order in components
3. Add teaching prompts in `claudeService.js`
4. Update PDF export template

## Technical Specifications

### API Integration

- **Model**: claude-sonnet-4-20250514
- **Max Tokens**: 4096 per response
- **Thinking Budget**: 2000 tokens
- **Web Search**: Enabled for research phase
- **Retry Logic**: Exponential backoff (3 attempts)

### Performance

- Initial load: <2s
- Field validation: <1s (real-time)
- Research phase: 5-10s (depends on concept)
- Context compression: <100ms
- PDF generation: <500ms

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Run the test suite:

```bash
npm test
```

### Test Coverage

- Field validation accuracy
- Context compression integrity
- Continuation code encode/decode
- Demo playback completeness
- PDF generation accuracy
- State persistence/recovery

## Troubleshooting

### API Key Issues

**Problem**: "VITE_ANTHROPIC_API_KEY is not set"
**Solution**: Ensure `.env` file exists and contains valid API key

### Context Overflow

**Problem**: "Context must be compressed or checkpointed"
**Solution**: System auto-creates checkpoints at 70K tokens. Use continuation code to resume with fresh context.

### Validation Not Working

**Problem**: Fields stuck in "analyzing" state
**Solution**: Check browser console for API errors. Verify API key and network connection.

### Demo Not Playing

**Problem**: Demo appears frozen
**Solution**: Refresh page and ensure JavaScript is enabled. Try different speed setting.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Based on the Feynman Technique learning method
- Powered by Anthropic's Claude Sonnet 4.5
- Inspired by active learning and metacognition research

## Support

- Documentation: [Project Wiki](https://github.com/CaptainPhantasy/Feynman/wiki)
- Issues: [GitHub Issues](https://github.com/CaptainPhantasy/Feynman/issues)
- Discussions: [GitHub Discussions](https://github.com/CaptainPhantasy/Feynman/discussions)

## Roadmap

- [ ] Multi-language support
- [ ] Collaborative learning mode
- [ ] Spaced repetition scheduling
- [ ] Knowledge graph visualization
- [ ] Mobile app (React Native)
- [ ] Audio explanation mode
- [ ] Integration with note-taking apps

---

Built with ❤️ for deep learning and genuine understanding.
