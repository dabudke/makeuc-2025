const SELECTORS = {
  cartItems: 'div.a-row.sc-list-item',
  title: 'a.sc-product-link.sc-product-title span.sc-grid-item-product-title',
  price: 'div.sc-apex-cart-price span.a-offscreen',
  description: '#feature-bullets, #productDescription, #pqv-description',
  asin: '[data-asin], input[name="ASIN"], input[data-asin]'
};

// scraper: grab title, price, asin, description from each cart item.
export async function extractCartItems() {
  const items = [];
  const nodes = document.querySelectorAll(SELECTORS.cartItems);
  for (let i = 0; i < nodes.length; i++) {
    try {
      const el = nodes[i];
      const titleEl = el.querySelector(SELECTORS.title);
      const priceEl = el.querySelector(SELECTORS.price);
      const descEl = el.querySelector(SELECTORS.description);
      const asinEl = el.querySelector(SELECTORS.asin);

      // skip empty rows
      if (!titleEl || !titleEl.textContent.trim()) continue;

      // ASIN extraction: prefer data-asin attribute, then inputs, then links
      let asin = el.getAttribute && el.getAttribute('data-asin');
      if (!asin && asinEl) {
        asin = asinEl.getAttribute && asinEl.getAttribute('data-asin') || asinEl.value || null;
      }
      if (!asin) {
        const link = el.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
        if (link && link.href) {
          const m = link.href.match(/\/dp\/([A-Z0-9]{10})/) || link.href.match(/\/gp\/product\/([A-Z0-9]{10})/);
          if (m) asin = m[1];
        }
      }

      const item = {
        title: titleEl.textContent.trim(),
        price: priceEl ? priceEl.textContent.trim() : null,
        asin: asin || null,
        description: descEl ? (descEl.textContent || descEl.innerText || '').trim() : null
      };

      items.push(item);
    } catch (err) {
      // keep going on errors
      console.warn('extractCartItems: item parse error', err);
    }
  }
  return items;
}

// keep message listener so popup/background can request scraping
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'extractCart') {
      (async () => {
        try {
          const items = await extractCartItems();
          sendResponse({ success: true, itemCount: items.length, items });
        } catch (e) {
          sendResponse({ success: false, error: e && e.message ? e.message : String(e) });
        }
      })();
      return true; // indicates async response
    }
  });
}
