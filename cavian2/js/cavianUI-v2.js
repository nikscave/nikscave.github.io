/* Cavian2 v2 UI Logic - Clean, focused, reusable */

// State
let state = {
  bpm: 120,
  activeGroup: 0,
  activePreset: 0,
  activeChannel: 0,
  currentStep: 0,
  caveArray: null,
  muteArray: [1, 1, 1, 1, 1, 1, 1, 1],
  viewMode: 'vertical'
};

// Constants
const LABELS = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];

// WebSocket connection
const socket = new WebSocket(`ws://${window.location.hostname}:81`);

socket.binaryType = 'arraybuffer';

socket.onopen = function() {
  console.log('WebSocket connected');
  socket.send(JSON.stringify({ type: "socket_ready_send_default_pattern" }));
  socket.send(JSON.stringify({ type: "get_actions" }));
};

socket.onmessage = function(event) {
  if (event.data instanceof ArrayBuffer) {
    handleBinaryData(event.data);
  } else if (typeof event.data === 'string') {
    handleDataReceived(JSON.parse(event.data));
  }
};

socket.onclose = function() {
  console.log('WebSocket closed, reconnecting...');
  setTimeout(() => location.reload(), 3000);
};

// DOM Elements
const elements = {};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  cacheElements();
  renderGrid();
  renderRowLabels();
  renderMuteStrip();
  renderStepIndicator();
  updateDisplays();
  attachEventListeners();
});

// Cache DOM elements
function cacheElements() {
  elements.sequencer = document.getElementById('sequencer');
  elements.rowLabels = document.getElementById('rowLabels');
  elements.muteStrip = document.getElementById('muteStrip');
  elements.stepIndicator = document.getElementById('stepIndicator');
  elements.bpmDisplay = document.getElementById('bpmDisplay');
  elements.groupDisplay = document.getElementById('groupDisplay');
  elements.presetDisplay = document.getElementById('presetDisplay');
  elements.channelDisplay = document.getElementById('channelDisplay');
  elements.contextDisplay = document.getElementById('contextDisplay');
  elements.statusBar = document.getElementById('statusBar');
  elements.viewSelect = document.getElementById('viewSelect');
  elements.modalOverlay = document.getElementById('modalOverlay');
  elements.modalTitle = document.getElementById('modalTitle');
  elements.modalBody = document.getElementById('modalBody');
}

// Attach event listeners
function attachEventListeners() {
  elements.viewSelect.addEventListener('change', (e) => {
    state.viewMode = e.target.value;
    renderGrid();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

// Render grid
function renderGrid() {
  if (!state.caveArray) {
    elements.sequencer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Loading...</div>';
    return;
  }
  
  let html = '';
  const { activeGroup, activePreset, activeChannel, viewMode, currentStep } = state;
  
  if (viewMode === 'vertical') {
    // 8x8 grid (channels x steps)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const val = state.caveArray[activeGroup][activePreset][row][col] || 0;
        const isPlaying = col === currentStep;
        const classes = ['button'];
        if (val === 1) classes.push('active');
        else if (val === 9) classes.push('always-active');
        if (isPlaying) classes.push('playing');
        if (state.muteArray[row] === 0) classes.push('muted');
        html += `<button class="${classes.join(' ')}" data-row="${row}" data-col="${col}" onclick="toggleCell(${row}, ${col})"></button>`;
    }
  } else if (viewMode === 'horizontal') {
    // 8x8 all channels
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const val = state.caveArray[activeGroup][activePreset][row][col] || 0;
        const isPlaying = col === currentStep;
        const classes = ['button'];
        if (val === 1) classes.push('active');
        else if (val === 9) classes.push('always-active');
        if (isPlaying) classes.push('playing');
        html += `<button class="${classes.join(' ')}" data-row="${row}" data-col="${col}" onclick="toggleCell(${row}, ${col})"></button>`;
    }
  } else if (viewMode === 'horizontal64') {
    // 64 pattern view
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const val = state.caveArray[activeGroup][row][activeChannel][col] || 0;
        const isPlaying = row === activePreset && col === currentStep;
        const classes = ['button'];
        if (val === 1) classes.push('active');
        else if (val === 9) classes.push('always-active');
        if (isPlaying) classes.push('playing');
        html += `<button class="${classes.join(' ')}" data-row="${row}" data-col="${col}" onclick="toggleCell(${row}, ${col})"></button>`;
      }
    }
  }
  
  elements.sequencer.innerHTML = html;
  elements.sequencer.className = `grid ${viewMode === 'horizontal64' ? 'horizontal64' : 'horizontal'}`;
}

// Render row labels
function renderRowLabels() {
  elements.rowLabels.innerHTML = LABELS.map((label, i) => 
    `<div class="row-label" onclick="setChannel(${i})">${label}</div>`
  ).join('');
}

// Render mute strip
function renderMuteStrip() {
  elements.muteStrip.innerHTML = LABELS.map((_, i) => 
    `<button class="mute-btn ${state.muteArray[i] === 0 ? 'active' : ''}" 
            onclick="toggleMute(${i})">M${i + 1}</button>`
  ).join('');
}

// Render step indicator
function renderStepIndicator() {
  elements.stepIndicator.innerHTML = Array(8).fill(0).map((_, i) => 
    `<div class="step-dot ${i === state.currentStep ? 'active' : ''}"></div>`
  ).join('');
}

// Update all displays
function updateDisplays() {
  elements.bpmDisplay.textContent = state.bpm;
  elements.groupDisplay.textContent = state.activeGroup + 1;
  elements.presetDisplay.textContent = state.activePreset + 1;
  elements.channelDisplay.textContent = state.activeChannel + 1;
  elements.contextDisplay.textContent = `G${state.activeGroup + 1} P${state.activePreset + 1} CH${state.activeChannel + 1}`;
}

// Toggle cell value
function toggleCell(row, col) {
  if (!state.caveArray) return;
  
  const { activeGroup, activePreset, activeChannel, viewMode } = state;
  let currentVal;
  
  if (viewMode === 'horizontal64') {
    currentVal = state.caveArray[activeGroup][row][activeChannel][col];
    state.caveArray[activeGroup][row][activeChannel][col] = (currentVal + 1) % 3;
    socket.send(JSON.stringify({ type: "64step", row, col, value: state.caveArray[activeGroup][row][activeChannel][col] }));
  } else {
    currentVal = state.caveArray[activeGroup][activePreset][row][col];
    state.caveArray[activeGroup][activePreset][row][col] = (currentVal + 1) % 3;
    socket.send(JSON.stringify({ type: "8x8step", row, col, value: state.caveArray[activeGroup][activePreset][row][col] }));
  }
  
  renderGrid();
}

// Toggle mute
function toggleMute(ch) {
  state.muteArray[ch] = state.muteArray[ch] === 1 ? 0 : 1;
  socket.send(JSON.stringify({ type: "mute", channel: ch, value: state.muteArray[ch] }));
  renderMuteStrip();
}

// Set channel directly
function setChannel(ch) {
  state.activeChannel = ch;
  updateDisplays();
  if (state.viewMode === 'vertical') renderGrid();
}

// Change functions
function changeGroup(dir) {
  state.activeGroup = (state.activeGroup + dir + 8) % 8;
  sendNavigation('group', dir);
  updateDisplays();
  renderGrid();
}

function changePreset(dir) {
  state.activePreset = (state.activePreset + dir + 8) % 8;
  sendNavigation('preset', dir);
  updateDisplays();
  renderGrid();
}

function changeChannel(dir) {
  state.activeChannel = (state.activeChannel + dir + 8) % 8;
  sendNavigation('channel', dir);
  updateDisplays();
  renderGrid();
}

function changeTempo(delta) {
  state.bpm = Math.max(1, Math.min(400, state.bpm + delta));
  elements.bpmDisplay.textContent = state.bpm;
  socket.send(JSON.stringify({ type: "bpm", bpm: state.bpm }));
}

// Send navigation via WebSocket
function sendNavigation(type, direction) {
  socket.send(JSON.stringify({ type: "updownPressed", segment: type, direction }));
}

// Handle keyboard
function handleKeyboard(e) {
  switch(e.key) {
    case 'ArrowUp': changeGroup(-1); break;
    case 'ArrowDown': changeGroup(1); break;
    case 'ArrowLeft': changePreset(-1); break;
    case 'ArrowRight': changePreset(1); break;
    case '[': changeChannel(-1); break;
    case ']': changeChannel(1); break;
    case '-': changeTempo(-5); break;
    case '+': changeTempo(5); break;
  }
}

// Handle binary data from ESP32
function handleBinaryData(arrayBuffer) {
  // Placeholder - implement binary parsing similar to original
  console.log('Binary data received:', arrayBuffer.byteLength, 'bytes');
}

// Handle JSON data
function handleDataReceived(data) {
  switch(data.type) {
    case 'cave_data':
      state.caveArray = data.caveArray;
      state.bpm = data.bpm || 120;
      state.activeGroup = data.activeGroup || 0;
      state.activePreset = data.activePreset || 0;
      state.activeChannel = data.activeChannel || 0;
      updateDisplays();
      renderGrid();
      renderMuteStrip();
      break;
      
    case 'step_sync':
      state.currentStep = data.step;
      renderGrid();
      renderStepIndicator();
      break;
      
    case 'bpm':
      state.bpm = data.bpm;
      updateDisplays();
      break;
      
    case 'mute':
      if (data.channel !== undefined) {
        state.muteArray[data.channel] = data.value;
        renderMuteStrip();
      }
      break;
      
    case 'active_group_value':
      state.activeGroup = data.value;
      updateDisplays();
      renderGrid();
      break;
      
    case 'active_preset_value':
      state.activePreset = data.value;
      updateDisplays();
      renderGrid();
      break;
  }
}

// Modal functions
function openSaveModal() {
  elements.modalTitle.textContent = '💾 Save Pattern';
  elements.modalBody.innerHTML = `
    <div class="slot-grid">
      ${[1,2,3,4,5,6,7,8].map(i => `<button class="slot-btn" onclick="selectSlot(${i})">${i}</button>`).join('')}
    </div>
    <input type="text" id="patternName" placeholder="Pattern name" class="form-input" style="margin-top: 16px;">
    <div style="margin-top: 16px; text-align: right;">
      <button onclick="closeModal()">Cancel</button>
      <button onclick="savePattern()">Save</button>
    </div>
  `;
  elements.modalOverlay.classList.add('active');
}

function openLoadModal() {
  elements.modalTitle.textContent = '📂 Load Pattern';
  elements.modalBody.innerHTML = `
    <div class="slot-grid">
      ${[1,2,3,4,5,6,7,8].map(i => `<button class="slot-btn" onclick="loadSlot(${i})">${i}</button>`).join('')}
    </div>
  `;
  elements.modalOverlay.classList.add('active');
}

function closeModal(event) {
  if (!event || event.target === elements.modalOverlay) {
    elements.modalOverlay.classList.remove('active');
  }
}

function openSettings() {
  window.location.href = '/config.html';
}

// Show status toast
function showStatus(message, type = 'info') {
  elements.statusBar.textContent = message;
  elements.statusBar.className = `toast ${type} show`;
  setTimeout(() => {
    elements.statusBar.classList.remove('show');
  }, 3000);
}

// Make functions globally available
window.toggleCell = toggleCell;
window.toggleMute = toggleMute;
window.setChannel = setChannel;
window.changeGroup = changeGroup;
window.changePreset = changePreset;
window.changeChannel = changeChannel;
window.changeTempo = changeTempo;
window.openSaveModal = openSaveModal;
window.openLoadModal = openLoadModal;
window.closeModal = closeModal;
window.openSettings = openSettings;
window.showStatus = showStatus;
