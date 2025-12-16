# ChatGPT Browser Extension - Project Index

**Repository:** https://github.com/admingistai/Chatgpt_browser_extention
**Version:** 0.0.1 (Phase 0 - Proof of Concept)
**Last Updated:** December 16, 2025

---

## Overview

A Chrome extension that intercepts and captures ChatGPT conversations in real-time. Currently logs captured data to the browser console for development/research purposes.

---

## Project Structure

```
LLM_Conversation_Research_Tool/
├── llm-tracker-extension/      # Chrome extension (main deliverable)
│   ├── manifest.json           # Extension configuration
│   ├── content.js              # Isolated world script
│   ├── interceptor.js          # Main world fetch interceptor
│   └── README.md               # Setup instructions
├── openspec/                   # Design documentation
│   ├── project.md              # Project context (template)
│   ├── AGENTS.md               # AI agent instructions
│   └── changes/                # Change proposals
│       └── add-chatgpt-conversation-capture/
│           ├── proposal.md     # Feature proposal
│           ├── design.md       # Technical design
│           ├── tasks.md        # Implementation tasks
│           └── specs/          # Feature specifications
├── logs/                       # Development logs (gitignored)
├── v0PRD.md                    # Original product requirements
├── CLAUDE.md                   # Claude Code instructions
├── AGENTS.md                   # Agent configuration
└── PROJECT_INDEX.md            # This file
```

---

## Chrome Extension Files

### `manifest.json` (23 lines)
Extension configuration using Manifest V3.

```json
{
  "manifest_version": 3,
  "name": "LLM Tracker (Dev)",
  "version": "0.0.1",
  "content_scripts": [{
    "matches": ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "web_accessible_resources": [{
    "resources": ["interceptor.js"],
    "matches": ["https://chatgpt.com/*", "https://chat.openai.com/*"]
  }]
}
```

**Key Features:**
- Targets `chatgpt.com` and `chat.openai.com`
- Runs at `document_start` for early injection
- Makes `interceptor.js` accessible to main world

---

### `content.js` (77 lines)
Runs in Chrome's **isolated world**. Acts as a bridge between the extension and page context.

**Responsibilities:**
1. Inject `interceptor.js` into the page's main world
2. Listen for `llm-tracker-capture` CustomEvents
3. Pretty-print captured data to console

**Key Functions:**
- `injectInterceptor()` - Creates script element and injects into page
- `setupEventListener()` - Listens for captured conversation events

---

### `interceptor.js` (291 lines)
Runs in the **main world** (page context). Core interception logic.

**Responsibilities:**
1. Wrap `window.fetch` to intercept ChatGPT API calls
2. Parse SSE (Server-Sent Events) response streams
3. Extract user message and assistant response
4. Dispatch data via CustomEvent to content script

**Key Functions:**

| Function | Lines | Purpose |
|----------|-------|---------|
| `parseSSEStream()` | 34-142 | Parse streaming response, handle multiple SSE formats |
| `cleanupResponse()` | 147-171 | Remove JSON metadata artifacts from response text |
| `extractUserMessage()` | 176-195 | Extract user's message from request body |
| `dispatchCapturedData()` | 200-206 | Send captured data to content script |
| `window.fetch` (wrapped) | 211-288 | Intercept fetch calls to ChatGPT API |

**SSE Formats Handled:**
1. Nested patch: `{o: "patch", v: [{p, o, v}, ...]}`
2. Array-only: `{v: [{p, o, v}, ...]}`
3. Direct append: `{p, o: "append", v}`
4. Legacy: `{message: {content: {parts: []}}}`

**API Endpoints Monitored:**
- `/backend-api/conversation` (logged-in users)
- `/backend-anon/f/conversation` (anonymous users)

---

## Data Captured

Each conversation exchange captures:

```javascript
{
  conversationId: "uuid-string",      // ChatGPT conversation ID
  messageId: "uuid-string",           // Specific message ID
  model: "auto" | "gpt-4" | etc,      // Model used
  userMessage: "User's question",     // What the user typed
  assistantResponse: "AI response",   // ChatGPT's reply (cleaned)
  timestamp: 1702684800000,           // Unix timestamp
  _debug: {
    url: "/backend-api/conversation",
    requestAction: "next",
    parentMessageId: "uuid"
  }
}
```

---

## Current Limitations (Phase 0)

| Feature | Status |
|---------|--------|
| Data capture | ✅ Working |
| Console logging | ✅ Working |
| Anonymous user support | ✅ Working |
| Logged-in user support | ✅ Working |
| Data storage | ❌ Not implemented |
| UI (popup/options) | ❌ Not implemented |
| Backend/API | ❌ Not implemented |
| Export functionality | ❌ Not implemented |
| Error recovery | ❌ Basic only |

---

## Installation

### For Development
1. Clone: `git clone https://github.com/admingistai/Chatgpt_browser_extention.git`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → Select `llm-tracker-extension/` folder

### For Users
Download ZIP from GitHub releases and follow steps 2-4 above.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ChatGPT Page                           │
├─────────────────────────────────────────────────────────────┤
│  MAIN WORLD                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  interceptor.js                                      │   │
│  │  - Wraps window.fetch                               │   │
│  │  - Parses SSE streams                               │   │
│  │  - Dispatches CustomEvent                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                    CustomEvent                              │
│                    (llm-tracker-capture)                    │
│                           │                                 │
│                           ▼                                 │
├─────────────────────────────────────────────────────────────┤
│  ISOLATED WORLD                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  content.js                                          │   │
│  │  - Listens for events                               │   │
│  │  - Logs to console                                  │   │
│  │  - (Future: sends to storage/backend)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Statistics

| File | Lines | Purpose |
|------|-------|---------|
| interceptor.js | 291 | Core interception logic |
| content.js | 77 | Bridge script |
| manifest.json | 23 | Extension config |
| README.md | 62 | Documentation |
| **Total** | **453** | |

---

## Future Phases

### Phase 1 - Storage
- Add Chrome storage API (`chrome.storage.local`)
- Implement conversation history
- Add export to JSON/CSV

### Phase 2 - UI
- Popup interface showing recent captures
- Options page for configuration
- Badge showing capture count

### Phase 3 - Backend
- Send data to external API
- User authentication
- Cloud sync

### Phase 4 - Multi-Platform
- Support Claude.ai
- Support other LLM interfaces
- Unified data format

---

## Development Notes

### SSE Parsing Evolution
The extension handles ChatGPT's complex SSE streaming format which includes:
- Nested patch operations for initial content
- Direct append operations for streaming chunks
- Legacy cumulative format as fallback
- Product/citation metadata embedded in stream

### Key Challenges Solved
1. **Two-world architecture**: Content scripts can't access page's `window.fetch`, so we inject a script that runs in the main world
2. **Response cloning**: Must clone response before reading to not break ChatGPT's UI
3. **Mixed SSE formats**: ChatGPT uses multiple formats for streaming, all must be handled
4. **Anonymous vs logged-in**: Different API endpoints for different user states

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test with both logged-in and anonymous ChatGPT sessions
5. Submit PR

---

## License

[To be determined]
