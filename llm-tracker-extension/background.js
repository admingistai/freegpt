/**
 * Background Script (Service Worker)
 *
 * Responsibilities:
 * 1. Receive captured conversations from content script
 * 2. Store in chrome.storage.local
 * 3. Manage storage (cleanup, export)
 * 4. Update badge with count
 */

// Storage keys
const STORAGE_KEYS = {
  CONVERSATIONS: "conversations",
  TRACKING_ENABLED: "trackingEnabled",
  STATS: "stats",
  DEVICE_ID: "deviceId",
  REMOTE_SYNC_ENABLED: "remoteSyncEnabled",
};

// Convex HTTP endpoint URL
// Replace with your actual Convex deployment URL after running `npx convex deploy`
const CONVEX_HTTP_URL = "https://exuberant-frog-8.convex.site/ingest";

// Default stats
const DEFAULT_STATS = {
  totalConversations: 0,
  totalMessages: 0,
  firstCaptureAt: null,
  lastCaptureAt: null,
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[LLM Tracker] Extension installed/updated:", details.reason);

  // Set defaults
  const existing = await chrome.storage.local.get([
    STORAGE_KEYS.TRACKING_ENABLED,
    STORAGE_KEYS.CONVERSATIONS,
    STORAGE_KEYS.STATS,
    STORAGE_KEYS.REMOTE_SYNC_ENABLED,
  ]);

  if (existing.trackingEnabled === undefined) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TRACKING_ENABLED]: true });
  }

  if (!existing.conversations) {
    await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: [] });
  }

  if (!existing.stats) {
    await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: DEFAULT_STATS });
  }

  // Enable remote sync by default
  if (existing.remoteSyncEnabled === undefined) {
    await chrome.storage.local.set({ [STORAGE_KEYS.REMOTE_SYNC_ENABLED]: true });
  }

  // Initialize device ID
  await getOrCreateDeviceId();

  // Update badge
  await updateBadge();
});

/**
 * Handle messages from content script and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[LLM Tracker] Background received:", message.type);

  switch (message.type) {
    case "CONVERSATION_CAPTURED":
      handleConversationCapture(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open

    case "GET_CONVERSATIONS":
      getConversations(message.options)
        .then((data) => sendResponse(data))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "GET_STATS":
      getStats()
        .then((stats) => sendResponse(stats))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "CLEAR_DATA":
      clearAllData()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "EXPORT_DATA":
      exportData()
        .then((data) => sendResponse(data))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "SET_TRACKING":
      setTracking(message.enabled)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "GET_TRACKING":
      chrome.storage.local
        .get([STORAGE_KEYS.TRACKING_ENABLED])
        .then((result) =>
          sendResponse({ enabled: result.trackingEnabled !== false })
        )
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "PRODUCT_URLS_SCRAPED":
      handleProductUrls(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "PRODUCT_URL_CLICKED":
      handleClickedProductUrl(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "GET_REMOTE_SYNC":
      chrome.storage.local
        .get([STORAGE_KEYS.REMOTE_SYNC_ENABLED])
        .then((result) =>
          sendResponse({ enabled: result.remoteSyncEnabled !== false })
        )
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "SET_REMOTE_SYNC":
      chrome.storage.local
        .set({ [STORAGE_KEYS.REMOTE_SYNC_ENABLED]: message.enabled })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "GET_DEVICE_ID":
      getOrCreateDeviceId()
        .then((deviceId) => sendResponse({ deviceId }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
  }
});

/**
 * Store a captured conversation
 */
async function handleConversationCapture(data) {
  // Add metadata
  const enrichedData = {
    ...data,
    id: generateId(),
    capturedAt: Date.now(),
    source: "chatgpt",
  };

  // Get existing conversations
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CONVERSATIONS,
    STORAGE_KEYS.STATS,
  ]);
  const conversations = result.conversations || [];
  const stats = result.stats || DEFAULT_STATS;

  // Check for duplicate (same conversation + message ID)
  const isDuplicate = conversations.some(
    (c) =>
      c.conversationId === data.conversationId && c.messageId === data.messageId
  );

  if (isDuplicate) {
    console.log("[LLM Tracker] Duplicate message, skipping");
    return;
  }

  // Add new conversation
  conversations.push(enrichedData);

  // Update stats
  stats.totalConversations = conversations.length;
  stats.totalMessages += 2; // User + assistant
  stats.lastCaptureAt = Date.now();
  if (!stats.firstCaptureAt) {
    stats.firstCaptureAt = Date.now();
  }

  // Save locally
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONVERSATIONS]: conversations,
    [STORAGE_KEYS.STATS]: stats,
  });

  // Update badge
  await updateBadge();

  console.log(
    "[LLM Tracker] Conversation stored. Total:",
    conversations.length
  );

  // Sync to Convex backend (non-blocking)
  syncToConvex(enrichedData).catch((err) => {
    console.error("[LLM Tracker] Background sync error:", err);
  });
}

/**
 * Handle scraped product URLs - associate with most recent conversation
 */
async function handleProductUrls(urls) {
  if (!urls || urls.length === 0) return;

  console.log("[LLM Tracker] Received product URLs:", urls);

  // Get conversations
  const result = await chrome.storage.local.get([STORAGE_KEYS.CONVERSATIONS]);
  const conversations = result.conversations || [];

  if (conversations.length === 0) {
    console.log("[LLM Tracker] No conversations to associate URLs with");
    return;
  }

  // Find the most recent conversation
  const sorted = [...conversations].sort((a, b) => b.capturedAt - a.capturedAt);
  const mostRecent = sorted[0];

  // Add/merge product URLs
  if (!mostRecent.scrapedProductUrls) {
    mostRecent.scrapedProductUrls = [];
  }

  // Add new URLs (avoid duplicates)
  const existingUrls = new Set(mostRecent.scrapedProductUrls.map((p) => p.url));
  urls.forEach((urlData) => {
    if (!existingUrls.has(urlData.url)) {
      mostRecent.scrapedProductUrls.push(urlData);
    }
  });

  // Update conversation in array
  const index = conversations.findIndex((c) => c.id === mostRecent.id);
  if (index !== -1) {
    conversations[index] = mostRecent;
  }

  // Save
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONVERSATIONS]: conversations,
  });

  console.log(
    "[LLM Tracker] Product URLs associated with conversation:",
    mostRecent.id
  );
}

/**
 * Handle clicked product URL from window.open interceptor
 * Associates the actual retailer URL with the most recent conversation
 */
async function handleClickedProductUrl(urlData) {
  if (!urlData || !urlData.url) return;

  console.log("[LLM Tracker] Received clicked product URL:", urlData.url);

  // Get conversations
  const result = await chrome.storage.local.get([STORAGE_KEYS.CONVERSATIONS]);
  const conversations = result.conversations || [];

  if (conversations.length === 0) {
    console.log("[LLM Tracker] No conversations to associate clicked URL with");
    return;
  }

  // Find the most recent conversation
  const sorted = [...conversations].sort((a, b) => b.capturedAt - a.capturedAt);
  const mostRecent = sorted[0];

  // Initialize clickedProductUrls array if needed
  if (!mostRecent.clickedProductUrls) {
    mostRecent.clickedProductUrls = [];
  }

  // Check for duplicate URL
  const existingUrls = new Set(mostRecent.clickedProductUrls.map((p) => p.url));
  if (existingUrls.has(urlData.url)) {
    console.log("[LLM Tracker] Duplicate clicked URL, skipping");
    return;
  }

  // Extract product info from URL
  const productInfo = {
    url: urlData.url,
    clickedAt: urlData.clickedAt,
    timestamp: urlData.timestamp,
    retailer: extractRetailer(urlData.url),
  };

  mostRecent.clickedProductUrls.push(productInfo);

  // Update conversation in array
  const index = conversations.findIndex((c) => c.id === mostRecent.id);
  if (index !== -1) {
    conversations[index] = mostRecent;
  }

  // Save locally
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONVERSATIONS]: conversations,
  });

  console.log(
    "[LLM Tracker] Clicked product URL associated with conversation:",
    mostRecent.id,
    "Retailer:",
    productInfo.retailer
  );

  // Sync to Convex backend (non-blocking)
  syncProductUrlToConvex(productInfo).catch((err) => {
    console.error("[LLM Tracker] Product URL sync error:", err);
  });
}

/**
 * Extract retailer name from URL
 */
function extractRetailer(url) {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and extract main domain name
    const domain = hostname.replace(/^www\./, "").split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch (e) {
    return "Unknown";
  }
}

/**
 * Get conversations with optional filtering
 */
async function getConversations(options = {}) {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CONVERSATIONS]);
  let conversations = result.conversations || [];

  // Apply filters
  if (options.conversationId) {
    conversations = conversations.filter(
      (c) => c.conversationId === options.conversationId
    );
  }

  // Sort by timestamp (newest first)
  conversations.sort((a, b) => b.capturedAt - a.capturedAt);

  // Apply limit after sorting
  if (options.limit) {
    conversations = conversations.slice(0, options.limit);
  }

  return { conversations, total: conversations.length };
}

/**
 * Get statistics
 */
async function getStats() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.STATS,
    STORAGE_KEYS.CONVERSATIONS,
  ]);
  const stats = result.stats || DEFAULT_STATS;
  const conversations = result.conversations || [];

  // Calculate unique conversation threads
  const uniqueConversations = new Set(
    conversations.map((c) => c.conversationId)
  ).size;

  return {
    ...stats,
    uniqueConversations,
    storageUsed: JSON.stringify(conversations).length,
  };
}

/**
 * Clear all stored data
 */
async function clearAllData() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONVERSATIONS]: [],
    [STORAGE_KEYS.STATS]: DEFAULT_STATS,
  });

  await updateBadge();
  console.log("[LLM Tracker] All data cleared");
}

/**
 * Export all data as JSON
 */
async function exportData() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CONVERSATIONS,
    STORAGE_KEYS.STATS,
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
    stats: result.stats || DEFAULT_STATS,
    conversations: result.conversations || [],
  };

  return exportPayload;
}

/**
 * Set tracking enabled/disabled
 */
async function setTracking(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.TRACKING_ENABLED]: enabled });

  // Notify all ChatGPT tabs
  const tabs = await chrome.tabs.query({
    url: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
  });

  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SET_TRACKING_STATE",
        enabled,
      });
    } catch (err) {
      // Tab might not have content script loaded
      console.warn("[LLM Tracker] Could not notify tab:", tab.id);
    }
  }

  // Update badge
  await updateBadge();
}

/**
 * Update extension badge
 */
async function updateBadge() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CONVERSATIONS,
    STORAGE_KEYS.TRACKING_ENABLED,
  ]);

  const count = (result.conversations || []).length;
  const enabled = result.trackingEnabled !== false;

  // Set badge text
  if (count > 0) {
    const displayCount = count > 999 ? "999+" : count.toString();
    await chrome.action.setBadgeText({ text: displayCount });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }

  // Set badge color based on tracking state
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#10b981" : "#6b7280",
  });
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create a unique device ID for this browser
 */
async function getOrCreateDeviceId() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.DEVICE_ID]);

  if (result.deviceId) {
    return result.deviceId;
  }

  // Generate a new device ID
  const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ [STORAGE_KEYS.DEVICE_ID]: deviceId });

  console.log("[LLM Tracker] Created new device ID:", deviceId);
  return deviceId;
}

/**
 * Send conversation data to Convex backend
 */
async function syncToConvex(data) {
  // Check if remote sync is enabled
  const result = await chrome.storage.local.get([STORAGE_KEYS.REMOTE_SYNC_ENABLED]);
  if (result.remoteSyncEnabled === false) {
    console.log("[LLM Tracker] Remote sync disabled, skipping Convex upload");
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();

    const payload = {
      deviceId,
      conversationId: data.conversationId || "unknown",
      messageId: data.messageId,
      model: data.model || "unknown",
      userMessage: data.userMessage || "",
      assistantResponse: data.assistantResponse || "",
      timestamp: data.capturedAt || Date.now(),
      products: data.products,
      clickedProductUrls: data.clickedProductUrls,
      platform: "chrome-extension",
      userAgent: navigator.userAgent,
    };

    const response = await fetch(CONVEX_HTTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[LLM Tracker] Convex sync failed:", errorData);
      return;
    }

    const responseData = await response.json();
    console.log("[LLM Tracker] Successfully synced to Convex:", responseData.id);
  } catch (error) {
    // Don't break local flow on network errors
    console.error("[LLM Tracker] Convex sync error (non-fatal):", error.message);
  }
}

/**
 * Send clicked product URL to Convex backend
 */
async function syncProductUrlToConvex(urlData) {
  // Check if remote sync is enabled
  const result = await chrome.storage.local.get([STORAGE_KEYS.REMOTE_SYNC_ENABLED]);
  if (result.remoteSyncEnabled === false) {
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();

    const payload = {
      deviceId,
      url: urlData.url,
      retailer: urlData.retailer,
      clickedAt: urlData.clickedAt || Date.now(),
    };

    const response = await fetch(`${CONVEX_HTTP_URL.replace('/ingest', '/ingest/product-url')}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("[LLM Tracker] Product URL sync failed");
    }
  } catch (error) {
    console.error("[LLM Tracker] Product URL sync error (non-fatal):", error.message);
  }
}

// Initialize badge on startup
updateBadge();
