/**
 * FreeGPT Popup Script
 * Simple status display - no user controls needed
 */

// DOM Elements
const elements = {
  version: document.getElementById("version"),
  privacyLink: document.getElementById("privacyLink"),
};

/**
 * Initialize popup
 */
async function init() {
  // Set version from manifest
  const manifest = chrome.runtime.getManifest();
  elements.version.textContent = `v${manifest.version}`;

  // Set privacy policy link (update this URL when hosted)
  elements.privacyLink.href = "https://freegpt.app/privacy"; // TODO: Update with actual URL
  elements.privacyLink.target = "_blank";
}

// Initialize when DOM is ready
init();
