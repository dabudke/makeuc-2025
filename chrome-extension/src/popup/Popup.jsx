import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

function Popup() {
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // send message to active tab and store the response items
  function handleScrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("help");
      const tab = tabs && tabs[0];
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { action: 'extractCartItems' }, (response) => {
        if (chrome.runtime.lastError) {
          // fallback: try to execute a DOM scraper directly in the page if content script isn't injected
          console.warn('sendMessage failed, falling back to executeScript:', chrome.runtime.lastError.message);
          try {
            chrome.scripting.executeScript(
              { target: { tabId: tab.id }, func: () => {
                const SELECTORS = {
                  cartItems: 'div.a-row.sc-list-item',
                  title: 'a.sc-product-link.sc-product-title span.sc-grid-item-product-title',
                  price: 'div.sc-apex-cart-price span.a-offscreen',
                  description: '#feature-bullets, #productDescription, #pqv-description',
                  asin: '[data-asin], input[name="ASIN"], input[data-asin]'
                };
                const nodes = document.querySelectorAll(SELECTORS.cartItems);
                const items = [];
                for (let i = 0; i < nodes.length; i++) {
                  try {
                    const el = nodes[i];
                    const titleEl = el.querySelector(SELECTORS.title);
                    if (!titleEl || !titleEl.textContent.trim()) continue;
                    const priceEl = el.querySelector(SELECTORS.price);
                    const descEl = el.querySelector(SELECTORS.description);
                    const asinEl = el.querySelector(SELECTORS.asin);
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
                    items.push({
                      title: titleEl.textContent.trim(),
                      price: priceEl ? priceEl.textContent.trim() : null,
                      asin: asin || null,
                      description: descEl ? (descEl.textContent || descEl.innerText || '').trim() : null
                    });
                  } catch (e) {
                    /* ignore per-item errors */
                  }
                }
                return items;
              } }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                  console.error('executeScript error:', chrome.runtime.lastError.message);
                  return;
                }
                if (injectionResults && injectionResults[0] && Array.isArray(injectionResults[0].result)) {
                  setItems(injectionResults[0].result);
                  setSelectedIndex(null);
                } else {
                  console.warn('executeScript returned no items', injectionResults);
                }
              }
            );
          } catch (e) {
            console.error('scripting.executeScript threw', e);
          }
          return;
        }
        console.log('scrape response:', response);

        if (response && Array.isArray(response.items)) {
          setItems(response.items);
          setSelectedIndex(null);
        } else if (response && response.success && Array.isArray(response.items)) {
          setItems(response.items);
          setSelectedIndex(null);
        }
      });
    });
  }

  function handleClear() {
    setItems([]);
    setSelectedIndex(null);
  }

  // on mount: load any existing cartItems and sustainabilityReports
  useEffect(() => {
    try {
      chrome.storage.session.get(["cartItems", "sustainabilityReports"], (res) => {
        const existing = res?.cartItems || [];
        const reports = res?.sustainabilityReports || [];
        if (existing.length) {
          // merge reports by index into items
          const merged = existing.map((it, idx) => ({ ...it, sustainability: reports[idx] || null }));
          setItems(merged);
        }
      });
    } catch (e) {
      console.debug('storage.session.get threw', e);
    }

    // listen for background progress notifications
    const listener = (request, sender, sendResponse) => {
      if (request && request.action === 'reportProcessed') {
        // refresh reports and merge into items
          chrome.storage.session.get(["sustainabilityReports"], (res2) => {
            const reports2 = res2?.sustainabilityReports || [];
            setItems(prev => {
              if (!prev || !prev.length) return prev;
              const next = prev.slice();
              for (let i = 0; i < reports2.length; i++) {
                if (!next[i]) continue;
                next[i] = { ...next[i], sustainability: reports2[i] };
              }
              return next;
            });
          });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      try { chrome.runtime.onMessage.removeListener(listener); } catch (e) { /* ignore */ }
    };
  }, []);

  const selectedItem = selectedIndex != null ? items[selectedIndex] : null;

  return (
  <div className="container" onClick={(e) => { if (e.target === e.currentTarget && !items.length) handleScrape(); }}>
      <div className="header">
        <h1>📦 Cart Scraper</h1>
        <p>Extract Amazon cart items</p>
      </div>

      <div id="status" className="status hidden" />

      {/* Click anywhere in the popup to start scraping (only when no items yet) */}

      <div className={`results ${items.length ? 'show' : ''}`} style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="results-header">
            <h3>Found <span id="itemCount">{items.length}</span> items</h3>
            <button id="clearBtn" className="btn-small" onClick={handleClear}>Clear</button>
          </div>

          <div id="itemsList" className="items-list">
            {items.map((it, idx) => (
              <div
                key={idx}
                className={`card ${selectedIndex === idx ? 'expanded' : ''}`}
                onClick={() => setSelectedIndex(idx)}
                title="Click to see sustainable alternatives"
              >
                <div className="card-header">
                  <div className="title">{it.title}</div>
                  <div className="price">{it.price || ''}</div>
                </div>
                <div className="details" style={{ marginTop: 8 }}>
                  <div className="placeholder">{it.description || 'No description available'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Sustainable alternatives</div>
          {selectedItem ? (
            <div>
              {[1,2,3,4,5].map(n => (
                <div key={n} className="card" style={{ marginBottom: 8 }}>
                  <div className="card-header">
                    <div className="title">Placeholder alt #{n}</div>
                    <div className="sustainability">Low Impact</div>
                  </div>
                  <div className="details" style={{ marginTop: 8 }}>
                    <div className="placeholder">Short description and reason why this is a sustainable alternative for "{selectedItem.title}".</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="placeholder">Click an item to see sustainable alternatives</div>
          )}
        </div>
      </div>

      <div className="footer">
        <small>Amazon Cart Scraper v1.0.0</small>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />);
