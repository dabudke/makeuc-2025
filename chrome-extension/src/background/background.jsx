async function dispatchNextReport() {
  const { cartItems, currentItem } = await chrome.storage.session.get(["cartItems", "currentItem"]);
  if (!cartItems || currentItem >= cartItems.length) {
    console.log("All items processed for sustainability reports.");
    return;
  }

  const item = cartItems[currentItem];
  const apiUrl = new URL("http://localhost:3000/sustainability");
  apiUrl.searchParams.append("product", item?.title || "ERROR");
  const nextItemIndex = currentItem + 1;

  chrome.storage.session.set({ currentItem: nextItemIndex });

  const data = await fetch(apiUrl)
    .then(response => {
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
  sustainabilityReports.push(data);
  await chrome.storage.session.set({ sustainabilityReports });
  chrome.runtime.sendMessage({ action: "reportProcessed" });
  dispatchNextReport();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'cartData') {
    console.log("Received cart data:", request.items);
    const items = request.items || [];

    chrome.storage.session.set({ cartItems: items, currentItem: 0 });

    dispatchNextReport();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Cart Scraper installed');
});
