// FantasyPoints Underdog Live Draft Relay - Service Worker
// Routes live picks between Underdog draft tabs and the FantasyPoints Companion tab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'UNDERDOG_PICKS_SYNC') {
    // Broadcast live picks to all active tabs (including the Draft Companion tab)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  } else if (message && message.type === 'RESET_DRAFT_STATE') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['latest_underdog_picks']);
    }
  }
});
