import React from "react";
import ReactDOM from "react-dom/client";

function Popup(props) {
  // send message to active tab and log the response
  function handleScrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { action: 'extractCart' }, (response) => {
        console.log('scrape response:', response);
      });
    });
  }

  return <div className="container">
    <div className="header">
      <h1>📦 Cart Scraper</h1>
      <p>Extract Amazon cart items</p>
    </div>

    <div id="status" className="status hidden" />

    <button id="scrapeBtn" className="btn-primary" onClick={handleScrape}>
      📊 Scrape Cart
    </button>

    <button id="downloadBtn" className="btn-secondary" disabled>
      💾 Download JSON
    </button>

    <button id="sendBtn" className="btn-secondary" disabled>
      📤 Send to API
    </button>

    <div id="results" className="results hidden">
      <div className="results-header">
        <h3>Found <span id="itemCount">0</span> items</h3>
        <button id="clearBtn" className="btn-small">Clear</button>
      </div>
      <div id="itemsList" className="items-list" />
    </div>

    <div className="footer">
      <small>Amazon Cart Scraper v1.0.0</small>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />);
