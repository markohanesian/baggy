const PRO_LIMIT = 10;

const linksGrid = document.getElementById('links-grid');
const editArea = document.getElementById('edit-area');
const labelInput = document.getElementById('label-input');
const valueInput = document.getElementById('value-input');
const container = document.querySelector('.container');
let editingIndex = null;
let searchQuery = '';
let sortOrder = 'default';
const pinCheck = document.getElementById('pin-check');
const tagsInput = document.getElementById('tags-input');
const proBadge = document.getElementById('pro-badge');
const proBanner = document.getElementById('pro-banner');
const proModal = document.getElementById('pro-modal');

function getIsPro() {
  return new Promise(resolve => chrome.storage.sync.get(['isPro'], r => resolve(!!r.isPro)));
}

function updateProStatus() {
  getIsPro().then(pro => {
    proBadge.classList.toggle('hidden', !pro);
    proBanner.classList.toggle('hidden', pro);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLinks() {
  chrome.storage.sync.get(['myLinks'], (result) => {
    let links = (result.myLinks || []).map((item, i) => ({ ...item, _origIndex: i }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      links = links.filter(item =>
        item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
      );
    }

    links.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortOrder === 'az') return a.label.localeCompare(b.label);
      if (sortOrder === 'za') return b.label.localeCompare(a.label);
      if (sortOrder === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      return 0;
    });

    linksGrid.innerHTML = '';

    if (links.length === 0) {
      linksGrid.innerHTML = '<p class="empty-state">No helpers yet. Click "+ new" to add one.</p>';
      return;
    }

    links.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'link-card' + (item.pinned ? ' is-pinned' : '');
      const preview = item.value.length > 50 ? item.value.slice(0, 50) + '…' : item.value;
      const tagsHtml = item.tags?.length
        ? `<div class="card-tags">${item.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
      card.innerHTML = `
        <div class="card-body">
          <div class="card-top">
            ${item.pinned ? '<span class="pin-indicator" title="Pinned">📌</span>' : ''}
            <span class="link-label">${escapeHtml(item.label)}</span>
          </div>
          <span class="link-preview">${escapeHtml(preview)}</span>
          ${tagsHtml}
        </div>
        <span class="edit-icon">✎</span>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.edit-icon')) {
          startEdit(item._origIndex, item);
        } else {
          copyToClipboard(item.value);
        }
      });

      linksGrid.appendChild(card);
    });
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const status = document.getElementById('status');
    status.textContent = 'Copied to clipboard';
    setTimeout(() => status.textContent = '', 1500);
  });
}

function startEdit(index, item) {
  editingIndex = index;
  labelInput.value = item.label;
  valueInput.value = item.value;
  pinCheck.checked = !!item.pinned;
  tagsInput.value = (item.tags || []).join(', ');
  editArea.classList.remove('hidden');
  container.classList.add('is-editing');
}

document.getElementById('add-btn').addEventListener('click', () => {
  chrome.storage.sync.get(['myLinks', 'isPro'], (result) => {
    const links = result.myLinks || [];
    const pro = !!result.isPro;
    if (!pro && links.length >= PRO_LIMIT) {
      proModal.classList.remove('hidden');
      return;
    }
    editingIndex = null;
    labelInput.value = '';
    valueInput.value = '';
    pinCheck.checked = false;
    tagsInput.value = '';
    editArea.classList.remove('hidden');
    container.classList.add('is-editing');
  });
});

document.getElementById('save-btn').addEventListener('click', () => {
  chrome.storage.sync.get(['myLinks'], (result) => {
    let links = result.myLinks || [];

    // if no label, add one by default
    const finalLabel = labelInput.value.trim() || "Add a helper label";

    const tags = tagsInput.value
      ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const newData = {
      label: finalLabel,
      value: valueInput.value,
      pinned: pinCheck.checked,
      tags,
      createdAt: editingIndex !== null ? (links[editingIndex].createdAt || Date.now()) : Date.now(),
    };

    if (editingIndex !== null) {
      links[editingIndex] = newData;
    } else {
      links.push(newData);
    }

    chrome.storage.sync.set({ myLinks: links }, () => {
      closeEdit();
      renderLinks();
    });
  });
});

document.getElementById('cancel-btn').addEventListener('click', closeEdit);

document.getElementById('delete-btn').addEventListener('click', () => {
  if (editingIndex !== null && confirm("Delete this helper?")) {
    chrome.storage.sync.get(['myLinks'], (result) => {
      let links = result.myLinks || [];
      links.splice(editingIndex, 1);
      chrome.storage.sync.set({ myLinks: links }, () => {
        closeEdit();
        renderLinks();
      });
    });
  }
});

function closeEdit() {
  editArea.classList.add('hidden');
  container.classList.remove('is-editing');
}

document.getElementById('upgrade-btn').addEventListener('click', () => {
  proModal.classList.remove('hidden');
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
  proModal.classList.add('hidden');
});

document.getElementById('modal-upgrade-btn').addEventListener('click', () => {
  // TODO: wire up Chrome's payment API before shipping Pro
  chrome.storage.sync.set({ isPro: true }, () => {
    proModal.classList.add('hidden');
    updateProStatus();
    renderLinks();
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderLinks();
});

document.getElementById('sort-select').addEventListener('change', (e) => {
  sortOrder = e.target.value;
  renderLinks();
});

document.addEventListener('DOMContentLoaded', () => {
  closeEdit();
  renderLinks();
  updateProStatus();
});