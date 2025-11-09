chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'cartData') {
    console.log("Received cart data:", request.items);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Cart Scraper installed');
});
