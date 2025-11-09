async function dispatchNextReport() {
  const { cartItems, currentItem } = await chrome.storage.session.get(["cartItems", "currentItem"]);
  if (!cartItems || currentItem >= cartItems.length) {
    console.log("All items processed for sustainability reports.");
    return;
  }

  const item = cartItems[currentItem];
  const apiUrl = new URL("http://localhost:3000/sustainability/");
  apiUrl.searchParams.append("product", item?.title || "ERROR");
  const nextItemIndex = currentItem + 1;

  chrome.storage.session.set({ currentItem: nextItemIndex });

  const data = await fetch(apiUrl)
    .then(response => {
      console.log(response);
      if (!response.ok) {
        console.error("sustainability report failed:", response.statusText);
        return null;
      }
      return response.json();
    })
    .catch(error => {
      console.error("Error fetching sustainability report:", error);
      return null;
    });

  const { sustainabilityReports } = await chrome.storage.session.get({"sustainabilityReports": []});
  console.log(sustainabilityReports);
  // only store a report if we actually fetched something
  if (data !== null) {
    sustainabilityReports.push(data);
    await chrome.storage.session.set({ sustainabilityReports });
  } else {
    // push a placeholder so index progress remains consistent
    sustainabilityReports.push({ error: 'fetch_failed' });
    await chrome.storage.session.set({ sustainabilityReports });
  }

  // send a notification (if any part of the extension is listening). Use a callback
  // so we can safely ignore "no receiver" runtime errors.
  chrome.runtime.sendMessage({ action: "reportProcessed" }, () => {
    if (chrome.runtime.lastError) {
      // no receiver - that's fine in many cases (popup closed). Log at debug level.
      console.debug('reportProcessed: no receiver:', chrome.runtime.lastError.message);
    }
  });
  dispatchNextReport();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'cartData') {
    console.log("Received cart data:", request.items);
    const items = request.items || [];

    chrome.storage.session.set({ cartItems: items, currentItem: 0 });

    dispatchNextReport();
  } else if (request.action === 'getReports') {
    chrome.storage.session.get({"sustainabilityReports": []}).then(data => {
      sendResponse(data.sustainabilityReports);
    });
    return true; // indicate async response
  } else if (request.action === 'getCart') {
    chrome.storage.session.get({"cartItems": []}).then(data => {
      sendResponse({ items: data.cartItems });
    });
    return true; // indicate async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Cart Scraper installed');
});
