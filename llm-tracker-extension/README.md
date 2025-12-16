# LLM Tracker - Phase 0 (Proof of Concept)

Minimal Chrome extension that captures ChatGPT conversations.

## Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this folder (`llm-tracker-extension/`)
5. Extension should appear with a puzzle piece icon

## Testing

1. Go to [chatgpt.com](https://chatgpt.com)
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Send a message to ChatGPT
5. You should see captured data in the console:

```
[LLM Tracker] Conversation Captured
  Conversation ID: abc-123-def
  Model: gpt-4
  User Message: Hello, how are you?
  Assistant Response: I'm doing well, thank you for asking!...
```

## Troubleshooting

### "Interceptor injected" but no captures

- Make sure you're on `chatgpt.com` (not a different AI)
- Try refreshing the page
- Check for errors in console

### Extension not loading

- Check `chrome://extensions/` for errors
- Make sure all files are in the same folder
- Try removing and re-adding the extension

### ChatGPT is broken

- Disable the extension
- Report the issue with console errors

## Files

| File | Purpose |
|------|---------|
| manifest.json | Extension configuration |
| content.js | Bridges isolated/main worlds |
| interceptor.js | Wraps fetch() to capture data |

## What's NOT included (Phase 0)

- No UI (popup, options)
- No data storage
- No backend
- No error recovery
