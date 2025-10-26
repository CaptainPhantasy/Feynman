# Feynman Learning System - Architecture

## System Overview

The Feynman Learning System is a client-side web application that uses Claude Sonnet 4.5 to facilitate deep learning through iterative teaching loops. The architecture is designed for simplicity, maintainability, and optimal performance.

## Design Principles

1. **Client-Side Only**: No backend infrastructure required
2. **Progressive Enhancement**: Features unlock as user progresses
3. **Fail-Safe State**: Multiple recovery mechanisms
4. **Context Efficiency**: Intelligent compression to maximize learning loops
5. **User Sovereignty**: All data stored locally, user has full control

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  ┌────────────────┐              ┌─────────────────────┐    │
│  │ TeachingPane   │              │ PracticeSheetPane   │    │
│  │                │              │                     │    │
│  │ - Messages     │              │ - FieldComponents   │    │
│  │ - Research     │              │ - Progress          │    │
│  │ - Context Info │              │ - Export            │    │
│  └────────────────┘              └─────────────────────┘    │
│         │                                   │                │
│         └───────────────┬───────────────────┘                │
│                         │                                    │
│                         ▼                                    │
│                 ┌───────────────┐                            │
│                 │ StateManager  │                            │
│                 └───────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Claude Service  │
                │                  │
                │ - Research       │
                │ - Teaching       │
                │ - Validation     │
                └──────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │ Anthropic API    │
                └──────────────────┘
```

## Data Flow

### Learning Session Lifecycle

```
1. User Input (Concept)
   ↓
2. Research Phase (Claude researches concept)
   ↓
3. Complexity Analysis (Determine if modules needed)
   ↓
4. Teaching Loop:
   ├─ User attempts field
   ├─ Real-time validation (Claude analyzes)
   ├─ Feedback provided
   ├─ User revises (if needed)
   └─ Repeat until approved
   ↓
5. Field Approved → Unlock next field
   ↓
6. Repeat 4-5 for all fields
   ↓
7. Complete → Export to PDF
```

### State Management Flow

```
User Action
   ↓
Component Updates Local State
   ↓
Triggers onStateUpdate
   ↓
App.jsx Updates Global State
   ↓
StateManager Auto-Saves to localStorage
   ↓
Component Re-renders with New State
```

## Key Services

### ClaudeService

Handles all interactions with Anthropic's API.

**Responsibilities:**
- Research concepts using extended thinking
- Analyze complexity and suggest modules
- Teach individual fields with Socratic method
- Validate user explanations in real-time
- Manage retry logic and error handling

**Methods:**
```javascript
researchConcept(concept) → { research, tokenCount, usedWebSearch }
analyzeConcept(concept, research) → { needsModules, modules, rationale }
teachField(field, concept, userAttempt, context) → { feedback, tokenCount }
validateField(field, userText, concept, context) → { status, issues, suggestion }
```

### ContextManager

Manages conversation context and implements 3-tier compression.

**Compression Levels:**

1. **Soft (30K tokens)**
   - Keep first 2 messages (context setup)
   - Keep last 6 messages (recent conversation)
   - Summarize middle exchanges

2. **Hard (50K tokens)**
   - Extract essential learning state
   - Keep only last 3 exchanges
   - Rebuild context from state

3. **Emergency (70K tokens)**
   - Minimal context only
   - Trigger automatic checkpoint
   - Generate continuation code

**Methods:**
```javascript
buildContext(conversationHistory, newMessage) → messages[]
extractState(messages) → learningState
checkThreshold(tokenCount) → compressionLevel
getCompressionAdvice(tokenCount) → { level, message, shouldCompress }
```

### StateManager

Handles application state persistence and recovery.

**State Structure:**
```javascript
{
  version: "1.0.0",
  concept: "Compound Interest",
  modules: [],
  currentModule: 0,
  fields: {
    definition: {
      value: "...",
      status: "approved",
      unlocked: true,
      attempts: [],
      revisionHistory: []
    },
    // ... other fields
  },
  conversationHistory: [],
  tokenCount: 12500,
  startTime: 1699564800000,
  lastUpdate: 1699568400000,
  emotionalState: {
    frustrationIndicators: [],
    encouragementGiven: 2
  }
}
```

**Methods:**
```javascript
createInitialState() → state
saveState(state) → boolean
restoreState() → state | null
createCheckpoint(state) → checkpoint
compressState(state) → compressedState
```

## Field Validation System

### Progressive Unlocking

Fields unlock sequentially:
```
definition (always unlocked)
  ↓ approved
mechanism
  ↓ approved
example
  ↓ approved
analogy
  ↓ approved
why_matters
  ↓ approved
misconception
  ↓ approved
integration
  ↓ approved
COMPLETE
```

### Real-Time Validation

1. User types in field
2. After 1 second of inactivity → trigger validation
3. Field status → "analyzing"
4. Claude analyzes attempt
5. Response:
   - `approved` → unlock next field
   - `needs_revision` → specific feedback
   - `analyzing` → still processing

### Validation Criteria

Each field has specific requirements (defined in `field_validation_rules.json`):

```json
{
  "fieldName": {
    "requirements": ["criterion1", "criterion2"],
    "min_words": 15,
    "max_words": 150,
    "unlocks": "nextField"
  }
}
```

## Emotional Intelligence System

### Frustration Detection

Monitors user behavior for signs of frustration:

**Indicators:**
- Multiple deletions (>3 in short period)
- Decreasing attempt length (each attempt shorter)
- Long pauses (>30 seconds between actions)
- Repeated revisions (>4 attempts on same field)
- Similar attempts (>70% similarity between attempts)

**Scoring:**
```
Score = sum of active indicators
Level = none (0-1) | mild (2) | moderate (3) | high (4+)
```

**Response Strategy:**

- **Mild**: Gentle guidance, clarifying questions
- **Moderate**: Alternative explanations, different angles
- **High**: Break down further, normalize struggle, specific hints

### Behavior Tracking

```javascript
BehaviorTracker.recordAction(type, data)
  types: typing, deletion, pause, clear, submit

detectFrustration(history, currentAttempt, previousAttempts)
  → { frustrated, indicators, score, level }

generateEncouragement(level, field, attemptCount)
  → encouragingMessage
```

## Continuation Code System

### Encoding Process

```
1. Extract essential state (concept, fields, progress)
2. JSON.stringify(essential)
3. Base64 encode
4. Add human-readable prefix
5. Result: FLS-{PREFIX}-{BASE64}
```

### Code Format

```
FLS-{3-consonant-concept-abbrev}{2-digit-random}-{base64-state}

Example:
FLS-CMP42-eyJ2IjoiMS4wLjAiLCJjIjoiQ29tcG91bmQgSW50ZXJlc3Qi...
│   │  │  └─ Base64 encoded state
│   │  └─ Random number for uniqueness
│   └─ Concept abbreviation (consonants)
└─ Feynman Learning System prefix
```

### Size Optimization

Target: <1000 characters

Techniques:
- Store only essential data (no history)
- Use short keys (v, c, m, f instead of version, concept, module, fields)
- Omit default values
- Compress status to single letter

## Module Decomposition

### Complexity Analysis

```javascript
Factors:
- timeEstimate: Based on content length and complexity markers
- prerequisites: Count of required background knowledge
- subcomponents: Number of distinct parts
- depth: Levels of explanation needed

Complexity Score:
  timeEstimate:   >30min = 2 points, >15min = 1 point
  prerequisites:  >3 = 2 points, >1 = 1 point
  subcomponents:  >4 = 2 points, >2 = 1 point
  depth:          ≥4 = 2 points, ≥3 = 1 point

Total Score:
  ≥5 = complex (needs modules)
  ≥3 = moderate (single module)
  <3 = simple (single module)
```

### Module Creation

If complex:
1. Identify distinct subcomponents
2. Group related concepts
3. Order by prerequisite dependencies
4. Create module for each (max 5 modules)
5. Each module gets fresh context for clarity

## PDF Export System

### Document Structure

```
┌─────────────────────────────┐
│ Feynman Practice Sheet      │
│ [Concept Name]              │
│ Completed: [Date]           │
├─────────────────────────────┤
│ Definition                  │
│ [User's explanation]        │
├─────────────────────────────┤
│ Mechanism                   │
│ [User's explanation]        │
├─────────────────────────────┤
│ ... (all fields)            │
├─────────────────────────────┤
│ Review Schedule             │
│ ✓ Day 1, 3, 7, 14, 30      │
└─────────────────────────────┘
```

### Generation Process

1. Create jsPDF instance
2. Add title and metadata
3. For each field:
   - Add field name (bold)
   - Add user's content (if approved)
   - Handle pagination
4. Add review schedule
5. Add attribution
6. Save as `feynman-{concept}-{timestamp}.pdf`

## Performance Optimizations

### Context Compression

- Reduces API payload size
- Maintains teaching quality
- Prevents context overflow
- Enables longer learning sessions

### Debounced Validation

- 1-second delay after typing stops
- Prevents excessive API calls
- Better user experience
- Reduced costs

### Auto-Save with Throttling

- Save to localStorage on state change
- Throttled to prevent excessive writes
- Compressed state for smaller storage
- Background operation (non-blocking)

### Checkpoint System

- Automatic at 70K tokens
- Manual via continuation code
- Enables session resume
- Fresh context on restore

## Security Considerations

### API Key Management

- Stored in environment variables
- Never committed to git
- Client-side only (no backend exposure)
- User provides their own key

### Data Privacy

- All data stored locally (localStorage)
- No server communication except Anthropic API
- User can clear data anytime
- No tracking or analytics

### Input Validation

- Sanitize user input before API calls
- Prevent injection attacks
- Validate continuation codes
- Handle malformed data gracefully

## Error Handling

### API Errors

```javascript
try {
  response = await claudeService.teachField(...)
} catch (error) {
  // Retry with exponential backoff (3 attempts)
  // If all fail, show user-friendly error
  // Preserve state for recovery
}
```

### State Corruption

- Version checking on restore
- Migration for old formats
- Fallback to initial state
- User notification of data loss

### Network Issues

- Queue actions for retry
- Show offline indicator
- Preserve user input
- Resume when online

## Testing Strategy

### Unit Tests

- Context compression accuracy
- Continuation code encode/decode
- State management functions
- Utility functions

### Integration Tests

- Field validation flow
- Teaching loop completion
- PDF generation
- Demo playback

### End-to-End Tests

- Complete learning session
- Session resume via continuation code
- Module decomposition
- Export functionality

## Deployment

### Build Process

```bash
npm run build
  → Vite optimizes and bundles
  → Output to /dist
  → Static files ready for hosting
```

### Hosting Requirements

- Static file hosting (no server needed)
- HTTPS required (API calls)
- Modern browser support
- No special configuration

### Recommended Platforms

- Vercel (automatic deployment)
- Netlify (with build plugins)
- GitHub Pages (via Actions)
- Cloudflare Pages

## Future Enhancements

### Planned Features

1. **Spaced Repetition**
   - Track review schedule
   - Send reminders
   - Re-test understanding

2. **Knowledge Graph**
   - Visualize concept relationships
   - Show learning progress
   - Suggest next concepts

3. **Collaborative Learning**
   - Share practice sheets
   - Peer review
   - Group learning sessions

4. **Multi-Modal Learning**
   - Image analysis
   - Audio explanations
   - Video integration

### Scalability Considerations

- Consider backend for multi-user features
- Implement user authentication
- Add database for shared content
- API rate limiting

---

**Document Version**: 1.0.0
**Last Updated**: 2024-10-26
**Maintained By**: Development Team
