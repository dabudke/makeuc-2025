chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'saveCartItems') {
    chrome.storage.local.set({ cartItems: request.items }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Cart Scraper installed');
});

