const linksGrid = document.getElementById('links-grid');
const editArea = document.getElementById('edit-area');
const labelInput = document.getElementById('label-input');
const valueInput = document.getElementById('value-input');
const container = document.querySelector('.container');
let editingIndex = null;

function renderLinks() {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks || [];
    linksGrid.innerHTML = '';
    
    links.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.innerHTML = `
        <span class="link-label">${item.label}</span>
        <span class="edit-icon">✎</span>
      `;
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.edit-icon')) {
          startEdit(index, item);
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
  editArea.classList.remove('hidden');
  container.classList.add('is-editing');
}

document.getElementById('add-btn').addEventListener('click', () => {
  editingIndex = null;
  labelInput.value = '';
  valueInput.value = '';
  editArea.classList.remove('hidden');
  container.classList.add('is-editing');
});

document.getElementById('save-btn').addEventListener('click', () => {
  chrome.storage.sync.get(['myLinks'], (result) => {
    let links = result.myLinks || [];

    // if no label, add one by default
    const finalLabel = labelInput.value.trim() || "Add a helper label";

    const newData = { label: finalLabel, value: valueInput.value };

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

document.addEventListener('DOMContentLoaded', () => {
  closeEdit();
  renderLinks();
});