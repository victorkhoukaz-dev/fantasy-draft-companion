// FantasyPoints Underdog Live Draft Relay - Companion Tab Bridge
// Injected into the Draft Companion page to deliver picks into the window context

(function() {
  'use strict';

  console.log('[FantasyPoints Bridge] Companion relay bridge initialized.');

  // Listen for real-time messages from the background service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'UNDERDOG_PICKS_SYNC') {
        console.log('[FantasyPoints Bridge] Forwarding ' + (message.picks?.length || 0) + ' picks to window...');
        window.postMessage(message, '*');
      }
    });
  }

  // On page load, immediately read the latest cached picks from extension storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['latest_underdog_picks'], (res) => {
      if (res && res.latest_underdog_picks) {
        console.log('[FantasyPoints Bridge] Delivering cached Underdog picks on startup:', res.latest_underdog_picks);
        window.postMessage(res.latest_underdog_picks, '*');
      }
    });
  }
})();
