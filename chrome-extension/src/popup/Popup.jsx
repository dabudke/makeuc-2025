import React, { useState } from "react";
import ReactDOM from "react-dom/client";

function Popup(props) {
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // send message to active tab and store the response items
  function handleScrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("help");
      const tab = tabs && tabs[0];
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { action: 'extractCartItems' }, (response) => {
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
