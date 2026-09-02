// FantasyPoints Underdog Live Draft Relay - Companion Tab Bridge
// Injected into the Draft Companion page to deliver live picks into the window context

(function() {
  'use strict';

  console.log('[FantasyPoints Bridge] Companion relay bridge initialized.');

  // Listen for real-time messages from the background service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'UNDERDOG_PICKS_SYNC') {
        window.postMessage(message, '*');
      }
    });
  }

  // Listen for reset events from window and forward to background
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RESET_DRAFT_STATE') {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'RESET_DRAFT_STATE' });
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['latest_underdog_picks']);
      }
    }
  });
})();
