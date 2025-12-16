/**
 * Content Script - Runs in ISOLATED WORLD
 *
 * Responsibilities:
 * 1. Inject interceptor.js into the page's main world
 * 2. Listen for captured data via CustomEvent
 * 3. Log captured conversations to console
 */

(function () {
  "use strict";

  const SCRIPT_ID = "llm-tracker-interceptor";
  const EVENT_NAME = "llm-tracker-capture";

  // Prevent double injection
  if (document.getElementById(SCRIPT_ID)) {
    console.log("[LLM Tracker] Already injected, skipping");
    return;
  }

  /**
   * Inject the interceptor script into the page's main world
   */
  function injectInterceptor() {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = chrome.runtime.getURL("interceptor.js");
    script.type = "text/javascript";

    script.onload = function () {
      console.log("[LLM Tracker] Interceptor injected successfully");
    };

    script.onerror = function () {
      console.error("[LLM Tracker] Failed to inject interceptor");
    };

    // Inject as early as possible
    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * Listen for captured conversation data from the interceptor
   */
  function setupEventListener() {
    window.addEventListener(EVENT_NAME, function (event) {
      const data = event.detail;

      // Pretty print to console
      console.group(
        "%c[LLM Tracker] Conversation Captured",
        "color: #10b981; font-weight: bold;"
      );
      console.log("%cConversation ID:", "color: #6b7280;", data.conversationId);
      console.log("%cModel:", "color: #6b7280;", data.model);
      console.log("%cUser Message:", "color: #3b82f6;", data.userMessage);
      console.log(
        "%cAssistant Response:",
        "color: #8b5cf6;",
        data.assistantResponse
      );
      console.log(
        "%cTimestamp:",
        "color: #6b7280;",
        new Date(data.timestamp).toISOString()
      );
      console.log("%cFull Data:", "color: #6b7280;", data);
      console.groupEnd();
    });
  }

  // Initialize
  console.log("[LLM Tracker] Content script loaded");
  injectInterceptor();
  setupEventListener();
})();
