const linksGrid = document.getElementById('links-grid');
const editArea = document.getElementById('edit-area');
const labelInput = document.getElementById('label-input');
const valueInput = document.getElementById('value-input');
let editingIndex = null;

// Load and render links
function renderLinks() {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks || [];
    linksGrid.innerHTML = '';
    
    links.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.innerHTML = `
        <span class="link-label">${item.label}</span>
        <span class="edit-icon">⚙</span>
      `;
      
      // Main click: Copy
      card.addEventListener('click', (e) => {
        if (e.target.className === 'edit-icon') {
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
    document.getElementById('status').textContent = 'Copied!';
    setTimeout(() => document.getElementById('status').textContent = '', 1500);
  });
}

function startEdit(index, item) {
  editingIndex = index;
  labelInput.value = item.label;
  valueInput.value = item.value;
  editArea.classList.remove('hidden');
}

document.getElementById('add-btn').addEventListener('click', () => {
  editingIndex = null;
  labelInput.value = '';
  valueInput.value = '';
  editArea.classList.toggle('hidden');
});

document.getElementById('save-btn').addEventListener('click', () => {
  chrome.storage.sync.get(['myLinks'], (result) => {
    let links = result.myLinks || [];
    const newData = { label: labelInput.value, value: valueInput.value };

    if (editingIndex !== null) {
      links[editingIndex] = newData;
    } else {
      links.push(newData);
    }

    chrome.storage.sync.set({ myLinks: links }, () => {
      editArea.classList.add('hidden');
      renderLinks();
    });
  });
});

document.getElementById('cancel-btn').addEventListener('click', () => editArea.classList.add('hidden'));

document.getElementById('delete-btn').addEventListener('click', () => {
  if (editingIndex !== null && confirm("Are you sure you want to delete this link?")) {
    chrome.storage.sync.get(['myLinks'], (result) => {
      let links = result.myLinks || [];
      links.splice(editingIndex, 1); // Remove the item
      chrome.storage.sync.set({ myLinks: links }, () => {
        editArea.classList.add('hidden');
        renderLinks();
      });
    });
  }
});
renderLinks();