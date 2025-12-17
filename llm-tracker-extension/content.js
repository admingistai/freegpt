/**
 * Content Script - Runs in ISOLATED WORLD
 *
 * Phase 1 Changes:
 * - Send captured data to background script (not just console)
 * - Check tracking state before injecting
 * - Listen for state changes from popup
 */

(function () {
  "use strict";

  const SCRIPT_ID = "llm-tracker-interceptor";
  const EVENT_NAME = "llm-tracker-capture";

  let isTrackingEnabled = true;
  let isInterceptorInjected = false;

  /**
   * Inject the interceptor script into the page's main world
   */
  function injectInterceptor() {
    if (isInterceptorInjected) {
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      console.log("[LLM Tracker] Already injected, skipping");
      isInterceptorInjected = true;
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = chrome.runtime.getURL("interceptor.js");
    script.type = "text/javascript";

    script.onload = function () {
      console.log("[LLM Tracker] Interceptor injected successfully");
      isInterceptorInjected = true;
      // Remove script element to prevent React hydration mismatch
      script.remove();
    };

    script.onerror = function () {
      console.error("[LLM Tracker] Failed to inject interceptor");
    };

    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * Listen for captured conversation data from the interceptor
   */
  function setupCaptureListener() {
    window.addEventListener(EVENT_NAME, function (event) {
      if (!isTrackingEnabled) {
        console.log("[LLM Tracker] Tracking disabled, ignoring capture");
        return;
      }

      const data = event.detail;

      // Handle product URL captures from window.open interceptor
      if (data.type === "PRODUCT_URL") {
        console.log(
          "%c[LLM Tracker] Product URL clicked:",
          "color: #f59e0b; font-weight: bold;",
          data.url
        );

        chrome.runtime
          .sendMessage({
            type: "PRODUCT_URL_CLICKED",
            payload: {
              url: data.url,
              timestamp: data.timestamp,
              clickedAt: Date.now(),
            },
          })
          .catch((err) => {
            console.error("[LLM Tracker] Failed to send product URL:", err);
          });
        return;
      }

      // Log truncated preview to console (keep for debugging)
      console.group(
        "%c[LLM Tracker] Conversation Captured",
        "color: #10b981; font-weight: bold;"
      );
      console.log(
        "%cUser:",
        "color: #3b82f6;",
        (data.userMessage || "").substring(0, 100) + "..."
      );
      console.log(
        "%cAssistant:",
        "color: #8b5cf6;",
        (data.assistantResponse || "").substring(0, 100) + "..."
      );
      console.groupEnd();

      // Check if extension context is still valid before sending
      if (!chrome.runtime?.id) {
        console.warn("[LLM Tracker] Extension context invalidated - please refresh this page");
        return;
      }

      // Send to background script for storage
      chrome.runtime
        .sendMessage({
          type: "CONVERSATION_CAPTURED",
          payload: data,
        })
        .catch((err) => {
          if (err.message?.includes("Extension context invalidated")) {
            console.warn("[LLM Tracker] Extension was reloaded - please refresh this page to continue tracking");
          } else {
            console.error("[LLM Tracker] Failed to send to background:", err);
          }
        });
    });
  }

  /**
   * Listen for messages from background/popup
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SET_TRACKING_STATE") {
        isTrackingEnabled = message.enabled;
        console.log(
          "[LLM Tracker] Tracking state:",
          isTrackingEnabled ? "enabled" : "disabled"
        );

        // Inject if enabled and not yet injected
        if (isTrackingEnabled && !isInterceptorInjected) {
          injectInterceptor();
        }

        sendResponse({ success: true });
      }

      if (message.type === "GET_STATUS") {
        sendResponse({
          isTrackingEnabled,
          isInterceptorInjected,
          url: window.location.href,
        });
      }

      return true; // Keep channel open for async response
    });
  }

  // Product URL scraping state
  let productObserver = null;
  let pendingProductScrape = null;
  let lastScrapedUrls = new Set();

  /**
   * Scrape product URLs from rendered DOM
   * ChatGPT generates product cards with affiliate links
   */
  function scrapeProductUrls() {
    const productUrls = [];

    // Look for product cards/links in ChatGPT's rendered response
    const selectors = [
      'a[href*="amazon"]',
      'a[href*="bestbuy"]',
      'a[href*="walmart"]',
      'a[href*="newegg"]',
      'a[href*="target"]',
      'a[href*="shop"]',
      '[data-testid*="product"] a',
      '.product-card a',
      '[class*="shopping"] a',
      // ChatGPT shopping links often have these patterns
      'a[href*="affiliate"]',
      'a[href*="redirect"]',
      'a[href*="click"]',
    ];

    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((link) => {
          if (link.href && !lastScrapedUrls.has(link.href)) {
            productUrls.push({
              url: link.href,
              text: link.textContent?.trim() || "",
              scrapedAt: Date.now(),
            });
            lastScrapedUrls.add(link.href);
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });

    return productUrls;
  }

  /**
   * Set up MutationObserver to watch for product links
   */
  function setupProductObserver() {
    if (productObserver) return;

    productObserver = new MutationObserver((mutations) => {
      if (!isTrackingEnabled) return;

      // Debounce - wait for DOM to settle
      clearTimeout(pendingProductScrape);
      pendingProductScrape = setTimeout(() => {
        const urls = scrapeProductUrls();
        if (urls.length > 0) {
          console.log(
            "%c[LLM Tracker] Product URLs scraped:",
            "color: #f59e0b;",
            urls
          );
          // Send to background for storage
          chrome.runtime
            .sendMessage({
              type: "PRODUCT_URLS_SCRAPED",
              payload: urls,
            })
            .catch((err) => {
              console.error(
                "[LLM Tracker] Failed to send product URLs:",
                err
              );
            });
        }
      }, 1500); // Wait 1.5s after last DOM change
    });

    productObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[LLM Tracker] Product URL observer started");
  }

  /**
   * Set up click listener for product links
   * Captures clicks on ChatGPT shopping cards and affiliate links
   */
  function setupProductClickListener() {
    document.addEventListener(
      "click",
      (event) => {
        if (!isTrackingEnabled) return;

        // Find if click was on or inside a product link
        const link = event.target.closest(
          'a[href*="utm_source=chatgpt"], ' +
            'a[href*="amazon.com"], ' +
            'a[href*="bestbuy.com"], ' +
            'a[href*="walmart.com"], ' +
            'a[href*="target.com"], ' +
            'a[href*="newegg.com"], ' +
            'a[href*="staples.com"], ' +
            'a[href*="bhphotovideo.com"], ' +
            'a[href*="lenovo.com"], ' +
            'a[href*="microsoft.com/store"], ' +
            'a[href*="affiliate"], ' +
            'a[href*="product"]'
        );

        if (link && link.href) {
          const url = link.href;

          // Skip internal ChatGPT links
          if (url.includes("chatgpt.com") || url.includes("openai.com")) {
            return;
          }

          console.log(
            "%c[LLM Tracker] Product link clicked:",
            "color: #f59e0b; font-weight: bold;",
            url
          );

          // Extract retailer from URL
          let retailer = "unknown";
          try {
            const hostname = new URL(url).hostname;
            retailer = hostname.replace("www.", "").split(".")[0];
          } catch (e) {
            // Ignore URL parse errors
          }

          // Send to background script
          chrome.runtime
            .sendMessage({
              type: "PRODUCT_URL_CLICKED",
              payload: {
                url: url,
                retailer: retailer,
                clickedAt: Date.now(),
              },
            })
            .catch((err) => {
              console.error("[LLM Tracker] Failed to send product click:", err);
            });
        }
      },
      true
    ); // Use capture phase to catch before navigation

    console.log("[LLM Tracker] Product click listener started");
  }

  /**
   * Initialize content script
   */
  async function init() {
    console.log("[LLM Tracker] Content script initializing...");

    // Get initial tracking state from storage
    try {
      const result = await chrome.storage.local.get(["trackingEnabled"]);
      isTrackingEnabled = result.trackingEnabled !== false; // Default to true
    } catch (err) {
      console.warn("[LLM Tracker] Could not get tracking state:", err);
      isTrackingEnabled = true;
    }

    // Set up listeners
    setupCaptureListener();
    setupMessageListener();

    // Inject interceptor if tracking is enabled
    if (isTrackingEnabled) {
      injectInterceptor();
    } else {
      console.log("[LLM Tracker] Tracking disabled, not injecting");
    }

    // Start observing for product URLs in DOM
    setupProductObserver();

    // Start listening for product link clicks
    setupProductClickListener();
  }

  init();
})();
