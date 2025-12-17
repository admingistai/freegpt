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

  // Store original window.open
  const originalWindowOpen = window.open;

  /**
   * Wrap window.open to capture product URLs
   * ChatGPT uses window.open() for product card links
   */
  window.open = function (url, ...args) {
    // Check if it's a ChatGPT product/affiliate link
    if (url && typeof url === "string" && url.includes("utm_source=chatgpt")) {
      console.log(
        "%c[LLM Tracker] Product URL captured:",
        "color: #10b981; font-weight: bold;",
        url
      );

      // Dispatch to content script
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            type: "PRODUCT_URL",
            url: url,
            timestamp: Date.now(),
          },
        })
      );
    }

    // Call original window.open
    return originalWindowOpen.apply(this, [url, ...args]);
  };

  /**
   * Parse SSE stream and extract the final assistant message
   */
  async function parseSSEStream(response, requestBody) {
    console.log("[LLM Tracker] Starting SSE parse...");

    if (!response.body) {
      console.warn("[LLM Tracker] Response has no body");
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });

    let buffer = "";
    let assistantResponse = "";
    let usingAppendFormat = false;  // Track which format we're using
    let conversationId = requestBody?.conversation_id || null;
    let messageId = null;

    // Store ALL operations for research (not just content)
    let allOperations = [];

    // Debug counters
    let totalBytesRead = 0;
    let chunkCount = 0;
    let linesProcessed = 0;
    let appendOpsProcessed = 0;

    // Helper to process nested operations array - CAPTURE EVERYTHING
    const processNestedOps = (ops) => {
      if (!Array.isArray(ops)) return;
      for (const op of ops) {
        // Capture ALL append operations with string values (for research)
        if (op.o === 'append' && op.v && typeof op.v === 'string') {
          // Store ALL operations for complete research data
          allOperations.push({ path: op.p, value: op.v });
          appendOpsProcessed++;

          // Build display text from content parts only
          if (op.p?.includes('/content/parts/')) {
            // DEBUG: Log every content append value
            console.log("[LLM Tracker] APPEND:", JSON.stringify(op.v).substring(0, 100));
            assistantResponse += op.v;
            usingAppendFormat = true;
          }
        }
      }
    };

    // Helper to process a single SSE line
    const processSSELine = (line) => {
      // Skip empty lines and comments
      if (!line.trim() || line.startsWith(":")) {
        return;
      }

      // SSE format: "data: {json}"
      if (!line.startsWith("data: ")) {
        return;
      }

      const data = line.slice(6); // Remove "data: " prefix

      // End of stream marker
      if (data === "[DONE]") {
        console.log("[LLM Tracker] Received [DONE] marker");
        return;
      }

      linesProcessed++;

      try {
        const parsed = JSON.parse(data);

        // DEBUG: Log EVERY parsed operation to find missing content format
        console.log("[LLM Tracker] RAW:", {
          o: parsed.o,
          p: parsed.p,
          hasV: !!parsed.v,
          vType: typeof parsed.v,
          hasMessage: !!parsed.message,
          keys: Object.keys(parsed).join(',')
        });

        // Extract conversation ID (might come in response)
        if (parsed.conversation_id && !conversationId) {
          conversationId = parsed.conversation_id;
        }

        // Handle nested patch operations: {o: 'patch', v: [{p, o, v}, ...]}
        if (parsed.o === 'patch' && Array.isArray(parsed.v)) {
          processNestedOps(parsed.v);
        }

        // Handle array-only format: {v: [{p, o, v}, ...]} (no o field)
        if (Array.isArray(parsed.v) && !parsed.o && !parsed.p) {
          processNestedOps(parsed.v);
        }

        // Handle direct append operations: {p, o: 'append', v}
        // CAPTURE ALL append operations with string values
        if (parsed.o === 'append' && parsed.v && typeof parsed.v === 'string') {
          // Store ALL operations for research
          allOperations.push({ path: parsed.p, value: parsed.v });
          appendOpsProcessed++;

          // Build display text from content parts only
          if (parsed.p?.includes('/content/parts/')) {
            // DEBUG: Log every content append value
            console.log("[LLM Tracker] APPEND (direct):", JSON.stringify(parsed.v).substring(0, 100));
            assistantResponse += parsed.v;
            usingAppendFormat = true;
          }
        }

        // **NEW**: Handle raw string format: {v: "string"} with NO o or p
        // ChatGPT sends most content this way - just {v: "text chunk"}
        if (!parsed.o && !parsed.p && typeof parsed.v === 'string') {
          console.log("[LLM Tracker] RAW STRING:", JSON.stringify(parsed.v).substring(0, 100));
          assistantResponse += parsed.v;
          allOperations.push({ path: 'raw', value: parsed.v });
          appendOpsProcessed++;
          usingAppendFormat = true;
        }

        // Legacy format: cumulative message.content.parts
        // ALWAYS check - use if longer than append chunks (it's the complete message)
        if (parsed.message?.content?.parts) {
          // DEBUG: Log legacy parts
          console.log("[LLM Tracker] LEGACY parts found:", parsed.message.content.parts.length, "parts");
          const legacyResponse = parsed.message.content.parts
            .filter(part => typeof part === 'string')
            .join("");
          console.log("[LLM Tracker] LEGACY response length:", legacyResponse.length, "vs append:", assistantResponse.length);
          // Use legacy if longer than append-accumulated response
          if (legacyResponse.length > assistantResponse.length) {
            assistantResponse = legacyResponse;
            messageId = parsed.message.id || messageId;
            console.log("[LLM Tracker] Using legacy format (longer), sample:", legacyResponse.substring(0, 100));
          }
        }

        // Extract message ID from other message types
        if (parsed.message_id && !messageId) {
          messageId = parsed.message_id;
        }
      } catch (parseError) {
        // Log JSON parse failures instead of silently dropping
        console.warn("[LLM Tracker] JSON parse failed:", {
          error: parseError.message,
          dataPreview: data.substring(0, 100),
          dataLength: data.length
        });
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          // Flush any remaining bytes from the decoder
          const finalBytes = decoder.decode();
          if (finalBytes) {
            buffer += finalBytes;
            console.log("[LLM Tracker] Flushed decoder:", finalBytes.length, "bytes");
          }
          break;
        }

        // Track bytes received
        if (value) {
          totalBytesRead += value.length;
          chunkCount++;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          processSSELine(line);
        }
      }

      // CRITICAL: Process any remaining content in buffer after stream ends
      // This fixes truncation when the stream doesn't end with a newline
      if (buffer.trim()) {
        console.log("[LLM Tracker] Processing remaining buffer:", buffer.length, "chars");
        const finalLines = buffer.split("\n");
        for (const line of finalLines) {
          processSSELine(line);
        }
      }
    } catch (streamError) {
      console.error("[LLM Tracker] Error reading stream:", streamError);
    }

    // Debug summary
    console.log("%c[LLM Tracker] SSE Parse Complete", "color: #10b981; font-weight: bold;", {
      totalBytesRead,
      chunkCount,
      linesProcessed,
      appendOpsProcessed,
      totalOperationsCaptured: allOperations.length,
      responseLength: assistantResponse.length,
      responseSample: assistantResponse.substring(0, 200) + (assistantResponse.length > 200 ? "..." : "")
    });

    return {
      assistantResponse,
      conversationId,
      messageId,
      products: extractProductData(assistantResponse),
      rawOperations: allOperations,  // ALL captured operations for research
    };
  }

  /**
   * Extract product references and URLs from response text
   */
  function extractProductData(text) {
    if (!text) return null;

    const products = [];

    // Match product patterns like: product0","Acer Nitro V 15"]
    const productPattern = /product(\d+)","([^"]+)"\]/gi;
    let match;

    while ((match = productPattern.exec(text)) !== null) {
      const productIndex = parseInt(match[1]);
      const productValue = match[2];

      // Find or create product entry
      let product = products.find((p) => p.index === productIndex);
      if (!product) {
        product = { index: productIndex };
        products.push(product);
      }

      // Detect if it's a URL or name
      if (productValue.startsWith("http")) {
        product.url = productValue;
      } else {
        product.name = productValue;
      }
    }

    // Also extract products JSON block if present
    const productsJsonMatch = text.match(/products\{([^}]+)\}/);
    if (productsJsonMatch) {
      try {
        // Parse the selections array
        const selectionsMatch = productsJsonMatch[1].match(
          /selections":\[([^\]]+)\]/
        );
        if (selectionsMatch) {
          // Extract turn references
          const turnRefs =
            selectionsMatch[1].match(/turn\d+[^,\]"]*/g) || [];
          products.forEach((p, i) => {
            if (turnRefs[i]) p.turnRef = turnRefs[i];
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return products.length > 0 ? products : null;
  }

  /**
   * Clean up assistant response by removing JSON metadata artifacts
   */
  function cleanupResponse(text) {
    if (!text) return text;
    // DEBUG: Log cleanup input
    console.log("[LLM Tracker] CLEANUP input:", text.substring(0, 200));
    let cleaned = text;

    // Remove JSON object fragments (entity/product metadata)
    cleaned = cleaned.replace(/\{[^{}]*"entity"[^{}]*\}/g, '');
    cleaned = cleaned.replace(/\{[^{}]*"product"[^{}]*\}/g, '');

    // Remove array fragments with entity/product data
    cleaned = cleaned.replace(/\[\s*\{[^[\]]*"entity"[^[\]]*\}\s*\]/g, '');

    // Remove leftover entity patterns: entity","Name",N]
    cleaned = cleaned.replace(/entity",?"[^"]*",?\d*\]?,?\s*/gi, '');

    // Remove citation markers: citeturnNsearchN
    cleaned = cleaned.replace(/citeturn\d+search\d+/gi, '');

    // Remove product references anywhere: product8","Name"],
    cleaned = cleaned.replace(/product\d+","[^"]*"\],?\s*/gi, '');

    // Remove turn references: ["turn0...
    cleaned = cleaned.replace(/\["turn\d+[^"\]]*\]?,?\s*/gi, '');

    // Remove products JSON block: products{"selections":[...]}
    cleaned = cleaned.replace(/products\{[^}]*\}/gi, '');

    // Remove orphaned JSON array patterns: ["key","value"],
    cleaned = cleaned.replace(/\["[^"]*","[^"]*"\],?\s*/g, '');

    // Remove leftover brackets and quotes (2+ consecutive)
    cleaned = cleaned.replace(/[\[\]"]{2,}/g, '');

    // Remove orphaned "For" prefix left after product removal
    cleaned = cleaned.replace(/\bFor(?=\s*$|\s*\n)/g, '');

    // Clean multiple spaces/newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/  +/g, ' ');

    // DEBUG: Log cleanup output
    console.log("[LLM Tracker] CLEANUP output:", cleaned.substring(0, 200));
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
              products: result.products,
              rawOperations: result.rawOperations,  // ALL captured operations for research
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
