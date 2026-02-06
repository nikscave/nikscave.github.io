/* Cavian2 Upload Page Logic */

let selectedFiles = [];

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// File handling
function initFileUpload() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  
  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    // Check file type
    const allowedTypes = ['.html', '.css', '.js', '.json', '.bin', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      showStatus('Invalid file type. Allowed: HTML, CSS, JS, JSON, BIN, TXT', 'error');
      return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showStatus('File too large. Maximum size is 2MB.', 'error');
      return;
    }
    
    selectedFiles.push(file);
    updateFileList();
  });
}

function updateFileList() {
  const fileList = document.getElementById('fileList');
  
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '';
    return;
  }
  
  fileList.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-item">
      <span class="icon">📄</span>
      <div class="info">
        <div class="name">${file.name}</div>
        <div class="size">${formatFileSize(file.size)}</div>
      </div>
      <button class="remove" onclick="removeFile(${index})">✕</button>
    </div>
  `).join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    showStatus('Please select files to upload', 'error');
    return;
  }
  
  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of selectedFiles) {
    try {
      const formData = new FormData();
      formData.append('data', file);
      
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error('Upload error:', error);
      failCount++;
    }
  }
  
  // Show result
  if (failCount === 0) {
    showStatus(`Successfully uploaded ${successCount} file(s). Reloading...`, 'success');
    setTimeout(() => location.reload(), 2000);
  } else {
    showStatus(`Uploaded ${successCount} file(s), ${failCount} failed`, 'error');
  }
  
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '📤 Upload Files';
}

// Firmware flasher (placeholder for ESP Web Tools integration)
function initFlasher() {
  const flasherBtn = document.getElementById('flasherBtn');
  
  flasherBtn.addEventListener('click', async () => {
    flasherBtn.disabled = true;
    flasherBtn.innerHTML = '<span class="spinner"></span> Connecting...';
    
    try {
      // Check if Web Serial is supported
      if (!navigator.serial) {
        throw new Error('Web Serial not supported. Please use Chrome or Edge.');
      }
      
      // Request port
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      
      showStatus('Connected to device. Flashing not yet implemented.', 'info');
      
      // TODO: Implement ESP Web Tools integration
      // See: https://github.com/esphome/esp-web-tools
      
      flasherBtn.disabled = false;
      flasherBtn.innerHTML = '⚡ Flash Firmware';
      
    } catch (error) {
      showStatus(error.message, 'error');
      flasherBtn.disabled = false;
      flasherBtn.innerHTML = '⚡ Flash Firmware';
    }
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('uploadStatus');
  statusEl.className = `status-message ${type}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  // Auto-hide after 5 seconds for info messages
  if (type === 'info') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

function goBack() {
  if (document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initFileUpload();
  initFlasher();
});
