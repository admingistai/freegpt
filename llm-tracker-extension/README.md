# LLM Tracker - Phase 1 (Extension Core)

Chrome extension that captures and stores ChatGPT conversations for research.

## Features (Phase 1)

- **Persistent Storage**: Conversations saved to Chrome storage (persists across sessions)
- **Popup UI**: View stats, recent captures, toggle tracking
- **Export**: Download all data as JSON
- **Clear Data**: Remove all stored conversations
- **Badge Count**: See capture count on extension icon

## Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this folder (`llm-tracker-extension/`)
5. Extension should appear with a green icon

## Usage

### Popup Interface

Click the extension icon to open the popup:

- **Toggle**: Turn tracking on/off
- **Stats**: View total captures, unique conversations, messages
- **Recent**: See last 5 captured conversations
- **Export**: Download all data as JSON file
- **Clear**: Delete all stored data (with confirmation)

### Testing

1. Go to [chatgpt.com](https://chatgpt.com)
2. Send a message to ChatGPT
3. Click the extension icon - you should see stats update
4. Open DevTools Console to see capture logs

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (v0.1.0) |
| `background.js` | Service worker for storage management |
| `content.js` | Bridges isolated/main worlds, sends to background |
| `interceptor.js` | Wraps fetch() to capture data |
| `popup/popup.html` | Popup UI structure |
| `popup/popup.css` | Popup styling |
| `popup/popup.js` | Popup logic and event handlers |
| `icons/` | Extension icons (16, 48, 128px) |

## Export Format

The JSON export contains:

```json
{
  "exportedAt": "2024-12-16T10:30:00.000Z",
  "version": "0.1.0",
  "stats": {
    "totalConversations": 42,
    "totalMessages": 84,
    "firstCaptureAt": 1702684800000,
    "lastCaptureAt": 1702771200000
  },
  "conversations": [
    {
      "id": "1702771200000-abc123def",
      "conversationId": "conv-uuid",
      "messageId": "msg-uuid",
      "model": "gpt-4",
      "userMessage": "What is...",
      "assistantResponse": "That is...",
      "timestamp": 1702771200000,
      "capturedAt": 1702771200500,
      "source": "chatgpt"
    }
  ]
}
```

## Storage Limits

Chrome's `storage.local` has a **10MB** default limit.

- Average conversation: ~2KB
- 1000 conversations: ~2MB
- 5000 conversations: ~10MB (limit)

Currently no automatic cleanup - export data regularly if approaching limits.

## Troubleshooting

### Popup shows 0 captures

- Make sure tracking is enabled (toggle should be ON)
- Verify you're on `chatgpt.com`
- Try refreshing the ChatGPT page
- Check console for errors

### "Interceptor injected" but no captures

- Make sure you're on `chatgpt.com` (not a different AI)
- Try refreshing the page
- Check for errors in console

### Extension not loading

- Check `chrome://extensions/` for errors
- Make sure all files are in the correct folders
- Try removing and re-adding the extension

### ChatGPT is broken

- Disable the extension
- Report the issue with console errors

## What's NOT included (Phase 1)

- No backend/API calls
- No authentication
- No options page
- No Claude/Gemini support
- No data anonymization

## Phase Roadmap

- **Phase 0**: ✅ Interception POC (console logging)
- **Phase 1**: ✅ Storage + Popup UI + Export (current)
- **Phase 2**: Backend API + Authentication
- **Phase 3**: Cloud sync + Multi-device
- **Phase 4**: Multi-platform (Claude, Gemini)
