document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById('clearBtn');
  const resultsEl = document.getElementById('results');
  const itemsList = document.getElementById('itemsList');
  const itemCountEl = document.getElementById('itemCount');
  const statusEl = document.getElementById('status');

  let items = [];

  function showStatus(text, isError = false) {
    if (!text) {
      statusEl.classList.add('hidden');
      statusEl.textContent = '';
      return;
    }
    statusEl.classList.remove('hidden');
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#9b1c1c' : '';
  }

  function setButtons(enabled) {
    downloadBtn.disabled = !enabled;
    sendBtn.disabled = !enabled;
  }

  function renderItems(list) {
    itemsList.innerHTML = '';
    if (!list || !list.length) {
      resultsEl.classList.add('hidden');
      itemCountEl.textContent = '0';
      setButtons(false);
      return;
    }
    resultsEl.classList.remove('hidden');
    itemCountEl.textContent = String(list.length);
    setButtons(true);

    list.forEach((it, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.index = String(idx);

      const header = document.createElement('div');
      header.className = 'card-header';

      const left = document.createElement('div');
      left.style.flex = '1 1 auto';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = it.title || '(no title)';
      title.title = it.title || '';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = it.asin ? `ASIN: ${it.asin}` : '';

      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';

      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = it.price || '—';

      const sustain = document.createElement('div');
      sustain.className = 'sustainability';
      sustain.textContent = 'Score: —';

      right.appendChild(price);
      right.appendChild(sustain);

      header.appendChild(left);
      header.appendChild(right);

      const details = document.createElement('div');
      details.className = 'details';

      const descSec = document.createElement('div');
      descSec.className = 'section';
      const descLabel = document.createElement('div');
      descLabel.style.fontWeight = '600';
      descLabel.style.fontSize = '12px';
      descLabel.textContent = 'Description';
      const descBody = document.createElement('div');
      descBody.className = 'placeholder';
      descBody.textContent = it.description && it.description.trim() ? it.description.trim() : 'No description available.';
      descSec.appendChild(descLabel);
      descSec.appendChild(descBody);

      const altSec = document.createElement('div');
      altSec.className = 'section';
      const altLabel = document.createElement('div');
      altLabel.style.fontWeight = '600';
      altLabel.style.fontSize = '12px';
      altLabel.textContent = 'Alternatives';
      const altBody = document.createElement('div');
      altBody.className = 'placeholder';
      altBody.textContent = 'Placeholder for alternatives';
      altSec.appendChild(altLabel);
      altSec.appendChild(altBody);

      const matSec = document.createElement('div');
      matSec.className = 'section';
      const matLabel = document.createElement('div');
      matLabel.style.fontWeight = '600';
      matLabel.style.fontSize = '12px';
      matLabel.textContent = 'Materials';
      const matBody = document.createElement('div');
      matBody.className = 'placeholder';
      matBody.textContent = 'Placeholder for materials';
      matSec.appendChild(matLabel);
      matSec.appendChild(matBody);

      details.appendChild(descSec);
      details.appendChild(altSec);
      details.appendChild(matSec);

      card.appendChild(header);
      card.appendChild(details);

      // Toggle expand on header click
      header.addEventListener('click', (e) => {
        card.classList.toggle('expanded');
      });

      itemsList.appendChild(card);
    });
  }

  function downloadJSON() {
    if (!items || !items.length) return;
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cart_items.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearResults() {
    items = [];
    renderItems(items);
    showStatus('Cleared', false);
    setTimeout(() => showStatus(''), 800);
  }

  // Main scrape flow: send message to content script in active tab
  async function scrape() {
    showStatus('Scraping cart...');
    setButtons(false);
    items = [];
    renderItems(items);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab) {
        showStatus('No active tab found', true);
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'extractCart' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Could not contact content script. Make sure you are on an Amazon cart page and the extension is allowed.', true);
          console.debug('sendMessage error', chrome.runtime.lastError.message);
          return;
        }
        if (!response) {
          showStatus('No response from content script', true);
          return;
        }
        if (!response.success) {
          showStatus('Extraction failed: ' + (response.error || 'unknown'), true);
          return;
        }
        items = response.items || [];
        renderItems(items);
        showStatus(`Found ${items.length} item(s)`);
      });
    });
  }

  async function sendToAPI() {
    if (!items || !items.length) {
      showStatus('No items available. Please scrape the cart first.', true);
      return;
    }

    showStatus('Sending items to API...');
    setButtons(false);

    try {
      const url = new URL('http://ecocart.tech/sustainability/bulk');
      url.searchParams.append('data', JSON.stringify(items.map((it) => it.name)));
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log('API response', data);
      showStatus('Data successfully sent to API');
    } catch (err) {
      console.error(err);
      showStatus('Failed to send data: ' + (err.message || err), true);
    } finally {
      setButtons(true);
      setTimeout(() => showStatus(''), 2000);
    }
  }

  // attach handlers
  scrapeBtn.addEventListener('click', (e) => { scrape(); });
  sendBtn.addEventListener('click', (e) => { sendToAPI(); });
  downloadBtn.addEventListener('click', downloadJSON);
  clearBtn.addEventListener('click', clearResults);

  // initial state
  setButtons(false);
  showStatus('');
});

/**
 * Popup Script - Handles UI interactions
 */

let currentItems = [];

const elements = {
  scrapeBtn: document.getElementById('scrapeBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  // copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  itemsList: document.getElementById('itemsList'),
  itemCount: document.getElementById('itemCount')
};

/**
 * Show status message
 */
function showStatus(message, type = 'loading') {
  elements.status.textContent = message;
  elements.status.className = `status show ${type}`;
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.status.className = 'status hidden';
}

/**
 * Display items in the popup
 */
function displayItems(items) {
  currentItems = items;

  if (items.length === 0) {
    elements.itemsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items found in cart</div>';
    return;
  }

  elements.itemCount.textContent = items.length;
  elements.itemsList.innerHTML = items.map(item => `
    <div class="item">
      <div class="item-title">${escapeHtml(item.title)}</div>
      <div class="item-meta">
        <div class="item-meta-item">
          <span class="item-meta-label">Price</span>
          <span class="item-price">${item.price || 'N/A'}</span>
        </div>
        <div class="item-meta-item">
          <span class="item-meta-label">Quantity</span>
          <span>${item.quantity || 'N/A'}</span>
        </div>
        <div class="item-meta-item">
          <span class="item-meta-label">ASIN</span>
          <span class="item-asin">${item.asin || 'N/A'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Download items as JSON
 */
function downloadJSON() {
  const data = {
    timestamp: new Date().toISOString(),
    itemCount: currentItems.length,
    items: currentItems
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amazon-cart-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showStatus('✅ Downloaded successfully!', 'success');
  setTimeout(hideStatus, 3000);
}

/**
 * Copy items to clipboard
 */
function copyToClipboard() {
  const data = JSON.stringify(currentItems, null, 2);
  navigator.clipboard.writeText(data).then(() => {
    showStatus('✅ Copied to clipboard!', 'success');
    setTimeout(hideStatus, 3000);
  }).catch(err => {
    showStatus('❌ Failed to copy', 'error');
  });
}

/**
 * Scrape cart items
 */
function scrapeCart() {
  elements.scrapeBtn.disabled = true;
  showStatus('🔍 Scraping cart...', 'loading');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showStatus('❌ No active tab found', 'error');
      elements.scrapeBtn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'extractCart' }, (response) => {
      elements.scrapeBtn.disabled = false;

      if (!response) {
        showStatus('❌ Content script not loaded. Make sure you\'re on an Amazon cart page.', 'error');
        return;
      }

      if (response.success) {
        hideStatus();
        displayItems(response.items);
        elements.results.classList.add('show');
        elements.downloadBtn.disabled = false;
        showStatus(`✅ Found ${response.itemCount} items!`, 'success');
        setTimeout(hideStatus, 2000);
      } else {
        showStatus(`❌ Error: ${response.error}`, 'error');
      }
    });
  });
}

/**
 * Clear results
 */
function clearResults() {
  currentItems = [];
  elements.results.classList.remove('show');
  elements.downloadBtn.disabled = true;
  hideStatus();
}

// Event listeners
elements.scrapeBtn.addEventListener('click', scrapeCart);
elements.downloadBtn.addEventListener('click', downloadJSON);
elements.clearBtn.addEventListener('click', clearResults);

// Load saved items on popup open
chrome.storage.local.get('cartItems', (result) => {
  if (result.cartItems && result.cartItems.length > 0) {
    displayItems(result.cartItems);
    elements.results.classList.add('show');
    elements.downloadBtn.disabled = false;
  }
});
