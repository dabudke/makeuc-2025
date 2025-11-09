const SELECTORS = {
  cartItems: 'div.a-row.sc-list-item',
  title: 'a.sc-product-link.sc-product-title span.sc-grid-item-product-title',
  price: 'div.sc-apex-cart-price span.a-offscreen',
  description: '#feature-bullets > ul.a-unordered-list.a-vertical.a-spacing-mini, #pqv-feature-bullets > ul.a-unordered-list.a-vertical, #pqv-description, #productDescription',
  asin: '[data-asin], input[name="ASIN"], input[data-asin]',
  removeLink: 'a.a-link-normal.sc-product-link'
};

const ASIN_CACHE = new Map();

function fetchWithTimeout(url, opts = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    fetch(url, Object.assign({}, opts, { signal: controller.signal }))
      .then(r => {
        clearTimeout(id);
        resolve(r);
      })
      .catch(err => {
        clearTimeout(id);
        reject(err);
      });
  });
}


async function fetchProductDescriptionByAsin(asin) {
  if (!asin) return null;
  if (ASIN_CACHE.has(asin)) return ASIN_CACHE.get(asin);
  function isAdText(s) {
    if (!s) return false;
    const low = s.toLowerCase();
    if (low.includes('limited time deal')) return true;
    if (low.includes('limited time') && low.split('\n').length < 3) return true;
    if (low.includes('shop now') || low.includes('buy now')) return true;
    if (low.includes('deal') && low.length < 40) return true;
    return false;
  }
  try {
    const productUrl = `https://www.amazon.com/dp/${asin}`;
    const resp = await fetchWithTimeout(productUrl, { credentials: 'same-origin' }, 15000);
    if (!resp.ok) {
      console.debug('Failed to fetch product page', productUrl, resp.status);
      ASIN_CACHE.set(asin, null);
      return null;
    }
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const descSelectors = [
      '#feature-bullets',
      '#feature-bullets ul',
      'ul.a-unordered-list.a-vertical.a-spacing-mini',
      'ul.a-unordered-list.a-vertical',
      'ul.a-unordered-list',
      '#productDescription',
      '#productDescription .a-expander-content',
      '#detailBullets_feature_div',
      '#productOverview_feature_div',
      '#aplus',
      '#bookDescription_feature_div',
      '.a-section.a-spacing-small' // fallback
    ];

    for (const sel of descSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        if (el.querySelectorAll && el.querySelectorAll('li').length) {
          const val = Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim()).filter(Boolean).join('\n');
          if (isAdText(val)) {
            continue;
          }
          ASIN_CACHE.set(asin, val);
          return val;
        }
        const txt = (el.textContent || el.innerText || '').trim();
        if (txt) {
          if (isAdText(txt)) {
            continue;
          }
          ASIN_CACHE.set(asin, txt);
          return txt;
        }
      }
    }

    const meta = doc.querySelector('meta[name="description"]');
    if (meta && meta.getAttribute('content')) {
      const m = meta.getAttribute('content').trim();
      ASIN_CACHE.set(asin, m);
      return m;
    }
  } catch (e) {
    console.debug('Error fetching/parsing product page for ASIN', asin, e);
  }
  // store null as well to avoid refetching repeatedly in the same run
  ASIN_CACHE.set(asin, null);
  return null;
}

async function extractCartItems() {
  const items = [];
  const cartItemElements = document.querySelectorAll(SELECTORS.cartItems);
  
  for (let index = 0; index < cartItemElements.length; index++) {
    const element = cartItemElements[index];
    try {
      const titleElement = element.querySelector(SELECTORS.title);
      const priceElement = element.querySelector(SELECTORS.price);
      const descriptionElement = element.querySelector(SELECTORS.description);
      const asinElement = element.querySelector(SELECTORS.asin);
      const removeLinkElement = element.querySelector(SELECTORS.removeLink);
      
      // Skip items with no title (likely empty containers)
      if (!titleElement || !titleElement.textContent.trim()) {
        continue;
      }
      
      // robust ASIN extraction: try element attribute, then child selectors, then URL parsing
      let asin = null;
      try {
        // 1) attribute on the cart item itself (most reliable)
        asin = element.getAttribute('data-asin') || null;

        // 2) child element matching selectors (data-asin or inputs)
        if (!asin && asinElement) {
          asin = asinElement.getAttribute && asinElement.getAttribute('data-asin') || asinElement.value || asinElement.getAttribute && asinElement.getAttribute('name') === 'ASIN' && asinElement.value || null;
        }

        // 3) try parsing ASIN from links inside the item (product link or remove link)
        if (!asin) {
          const link = element.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]') || removeLinkElement || element.querySelector('a');
          if (link && link.getAttribute) {
            const href = link.getAttribute('href') || '';
            const m = href.match(/\/dp\/([A-Z0-9]{10})/) || href.match(/\/gp\/product\/([A-Z0-9]{10})/);
            if (m) asin = m[1];
          }
        }

        // 4) fallback: look for any child with data-asin attribute
        if (!asin) {
          const any = element.querySelector('[data-asin]');
          if (any) asin = any.getAttribute('data-asin');
        }
      } catch (e) {
        console.debug('ASIN extraction error for item', index, e);
      }

      let description = descriptionElement ? (descriptionElement.textContent || descriptionElement.innerText).trim() : null;

      const item = {
        title: titleElement.textContent.trim(),
        price: priceElement ? priceElement.textContent.trim() : null,
        asin: asin,
        description: description
      };
      
  items.push(item);
    } catch (error) {
      console.error(`Error extracting item ${index}:`, error);
    }
  }
  
  // fetch missing descriptions in parallel with limited concurrency
  try {
    await fetchDescriptionsForItems(items, 3);
  } catch (e) {
    console.debug('Error during parallel description fetches', e);
  }

  return items;
}

// fetch descriptions for multiple items with limited concurrency
async function fetchDescriptionsForItems(items, concurrency = 3) {
  const queue = items.filter(i => i.asin && (!i.description || i.description.length < 10));
  if (!queue.length) return items;

  async function worker() {
    while (queue.length) {
      const itm = queue.shift();
      if (!itm || !itm.asin) continue;
      try {
        if (ASIN_CACHE.has(itm.asin)) {
          itm.description = ASIN_CACHE.get(itm.asin);
          continue;
        }
        const fetched = await fetchProductDescriptionByAsin(itm.asin);
        // store result (may be null) in cache and item
        ASIN_CACHE.set(itm.asin, fetched);
        itm.description = fetched;
      } catch (e) {
        console.debug('Worker fetch error for ASIN', itm.asin, e);
        // leave description as-is (null)
      }
    }
  }

  const workers = new Array(Math.max(1, concurrency)).fill(0).map(() => worker());
  await Promise.all(workers);
  return items;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractCart') {
    // extractCartItems is async; call and return true to indicate we'll sendResponse asynchronously
    (async () => {
      try {
        const items = await extractCartItems();
        sendResponse({
          success: true,
          itemCount: items.length,
          items: items
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error && error.message ? error.message : String(error)
        });
      }
    })();
    return true;
  }
});

document.addEventListener('DOMContentLoaded', () => {});
