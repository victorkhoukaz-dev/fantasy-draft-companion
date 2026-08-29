// FantasyPoints Underdog Live Draft Relay - Service Worker
// Routes picks between Underdog draft tabs and the FantasyPoints Companion tab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'UNDERDOG_PICKS_SYNC') {
    // Cache latest picks in extension storage
    chrome.storage.local.set({ latest_underdog_picks: message });

    // Broadcast picks to all active tabs (including the Draft Companion tab)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  }
});
