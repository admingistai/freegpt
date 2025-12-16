/**
 * Interceptor Script - Runs in MAIN WORLD (page context)
 *
 * Responsibilities:
 * 1. Wrap window.fetch to intercept ChatGPT API calls
 * 2. Parse SSE (Server-Sent Events) response stream
 * 3. Extract user message and assistant response
 * 4. Dispatch data via CustomEvent to content script
 */

(function () {
  "use strict";

  // Prevent double injection
  if (window.__llmTrackerInjected) {
    return;
  }
  window.__llmTrackerInjected = true;

  const EVENT_NAME = "llm-tracker-capture";
  const API_ENDPOINTS = [
    "/backend-api/conversation",
    "/backend-anon/f/conversation"  // Anonymous users use /f/ path
  ];

  console.log("[LLM Tracker] Interceptor initializing...");

  // Store original fetch
  const originalFetch = window.fetch;

  /**
   * Parse SSE stream and extract the final assistant message
   */
  async function parseSSEStream(response, requestBody) {
    if (!response.body) {
      console.warn("[LLM Tracker] Response has no body");
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let assistantResponse = "";
    let usingAppendFormat = false;  // Track which format we're using
    let conversationId = requestBody?.conversation_id || null;
    let messageId = null;

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          // Skip empty lines and comments
          if (!line.trim() || line.startsWith(":")) {
            continue;
          }

          // SSE format: "data: {json}"
          if (!line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6); // Remove "data: " prefix

          // End of stream
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Extract conversation ID (might come in response)
            if (parsed.conversation_id && !conversationId) {
              conversationId = parsed.conversation_id;
            }

            // Helper to process nested operations array
            const processNestedOps = (ops) => {
              if (!Array.isArray(ops)) return;
              for (const op of ops) {
                if (op.p === '/message/content/parts/0' && op.o === 'append' && op.v) {
                  assistantResponse += op.v;
                  usingAppendFormat = true;
                }
              }
            };

            // Handle nested patch operations: {o: 'patch', v: [{p, o, v}, ...]}
            if (parsed.o === 'patch' && Array.isArray(parsed.v)) {
              processNestedOps(parsed.v);
            }

            // Handle array-only format: {v: [{p, o, v}, ...]} (no o field)
            if (Array.isArray(parsed.v) && !parsed.o && !parsed.p) {
              processNestedOps(parsed.v);
            }

            // Handle direct append operations: {p, o: 'append', v}
            if (parsed.p === '/message/content/parts/0' && parsed.o === 'append' && parsed.v) {
              assistantResponse += parsed.v;
              usingAppendFormat = true;
            }

            // Legacy format: cumulative message.content.parts
            // Only use if we haven't been receiving append chunks
            if (parsed.message?.content?.parts && !usingAppendFormat) {
              assistantResponse = parsed.message.content.parts.join("");
              messageId = parsed.message.id || null;
            }

            // Extract message ID from other message types
            if (parsed.message_id && !messageId) {
              messageId = parsed.message_id;
            }
          } catch (parseError) {
            // Skip malformed JSON (common with SSE)
          }
        }
      }
    } catch (streamError) {
      console.error("[LLM Tracker] Error reading stream:", streamError);
    }

    return {
      assistantResponse,
      conversationId,
      messageId,
    };
  }

  /**
   * Clean up assistant response by removing JSON metadata artifacts
   */
  function cleanupResponse(text) {
    if (!text) return text;
    let cleaned = text;

    // Remove product references anywhere: product8","Name"],
    cleaned = cleaned.replace(/product\d+","[^"]*"\],?\s*/gi, '');

    // Remove turn references: ["turn0...
    cleaned = cleaned.replace(/\["turn\d+[^"\]]*\]?,?\s*/gi, '');

    // Remove orphaned JSON array patterns: ["key","value"],
    cleaned = cleaned.replace(/\["[^"]*","[^"]*"\],?\s*/g, '');

    // Remove leftover brackets and quotes (2+ consecutive)
    cleaned = cleaned.replace(/[\[\]"]{2,}/g, '');

    // Remove orphaned "For" prefix left after product removal
    cleaned = cleaned.replace(/\bFor(?=\s*$|\s*\n)/g, '');

    // Clean multiple spaces/newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/  +/g, ' ');

    return cleaned.trim();
  }

  /**
   * Extract user message from request body
   */
  function extractUserMessage(requestBody) {
    try {
      // Standard chat message format
      if (requestBody?.messages?.[0]?.content?.parts) {
        return requestBody.messages[0].content.parts.join("");
      }

      // Alternative format (just in case)
      if (requestBody?.messages?.[0]?.content) {
        const content = requestBody.messages[0].content;
        if (typeof content === "string") {
          return content;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Dispatch captured data to content script
   */
  function dispatchCapturedData(data) {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: data,
      })
    );
  }

  /**
   * Wrapped fetch function
   */
  window.fetch = async function (...args) {
    const [input, init] = args;

    // Get URL string
    const url = typeof input === "string" ? input : input?.url || "";

    // Only intercept ChatGPT conversation API
    const isConversationEndpoint = API_ENDPOINTS.some(endpoint => url.includes(endpoint));
    if (!isConversationEndpoint) {
      return originalFetch.apply(this, args);
    }

    // Only intercept POST requests (not GET for loading history)
    if (init?.method?.toUpperCase() !== "POST") {
      return originalFetch.apply(this, args);
    }

    console.log("[LLM Tracker] Intercepting conversation request...");

    try {
      // Parse request body
      let requestBody = null;
      if (init?.body) {
        try {
          requestBody = JSON.parse(init.body);
        } catch (e) {
          console.warn("[LLM Tracker] Could not parse request body");
        }
      }

      // Extract user message
      const userMessage = extractUserMessage(requestBody);

      // Call original fetch
      const response = await originalFetch.apply(this, args);

      // Clone response so we can read it without consuming the original
      const clonedResponse = response.clone();

      // Process the cloned response (async, don't block)
      parseSSEStream(clonedResponse, requestBody)
        .then((result) => {
          if (result && result.assistantResponse) {
            const cleanedResponse = cleanupResponse(result.assistantResponse);
            const capturedData = {
              conversationId:
                result.conversationId ||
                requestBody?.conversation_id ||
                "unknown",
              messageId: result.messageId,
              model: requestBody?.model || "unknown",
              userMessage: userMessage || "[Could not extract]",
              assistantResponse: cleanedResponse,
              timestamp: Date.now(),

              // Debug info
              _debug: {
                url: url,
                requestAction: requestBody?.action,
                parentMessageId: requestBody?.parent_message_id,
              },
            };

            dispatchCapturedData(capturedData);
          }
        })
        .catch((err) => {
          console.error("[LLM Tracker] Error processing response:", err);
        });

      // Return original response to ChatGPT (unmodified)
      return response;
    } catch (error) {
      console.error("[LLM Tracker] Error in fetch wrapper:", error);
      // On any error, fall back to original fetch
      return originalFetch.apply(this, args);
    }
  };

  console.log("[LLM Tracker] Interceptor ready - fetch() wrapped");
})();
