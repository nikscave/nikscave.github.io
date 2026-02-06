/* Cavian2 Shared Utilities */
/* Common functions used across all pages */

function showStatus(message, type = 'info') {
  const statusBar = document.getElementById('statusBar');
  if (!statusBar) return;
  
  statusBar.textContent = message;
  statusBar.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 
                               type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                               'rgba(59, 130, 246, 0.9)';
  statusBar.classList.add('show');
  
  setTimeout(() => {
    statusBar.classList.remove('show');
  }, 3000);
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

function updateMuteColumn(muteArray) {
  if (!muteArray) return;
  for (let i = 0; i < 8; i++) {
    const btn = document.querySelector(`.button[data-row='${i}'][data-col='7']`);
    if (btn) {
      btn.classList.toggle('mute-active', muteArray[i] === 0);
    }
  }
}

function updateStepsGrid(group, preset, channel) {
  // Override in cavianUI.js
}

function updateActiveIndicators(group, preset, channel) {
  // Override in cavianUI.js
}

function updownPressed(type, direction) {
  // Override in cavianUI.js
}

function startStepAnimation() {
  // Override in cavianUI.js
}

function selectChannel(channel) {
  // Override in cavianUI.js for swing editor
}

function toggleMode(mode) {
  // Override in cavianUI.js for swing editor
}

function highlightLooping(type) {
  // Override in cavianUI.js
}

function presetLoopColumnPressed(col) {
  // Override in cavianUI.js
}

function groupLoopColumnPressed(col) {
  // Override in cavianUI.js
}

function updateLoopButtons() {
  // Override in cavianUI.js
}

function requestMuteState() {
  // Request mute state from ESP32
}

function updateTransportButton() {
  // Update transport UI
}

// Theme switching
function setTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('cavian-theme', themeName);
  console.log(`Theme set to: ${themeName}`);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('cavian-theme');
  if (savedTheme) {
    setTheme(savedTheme);
  }
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', loadTheme);
