/* Cavian2 v2 UI Logic - Clean, focused, reusable */

// Demo mode flag - set true when no hardware connection
const DEMO_MODE = true;

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

// Generate demo caveArray data
function generateDemoData() {
  const demo = [];
  for (let g = 0; g < 8; g++) {
    const presets = [];
    for (let p = 0; p < 8; p++) {
      const rows = [];
      for (let ch = 0; ch < 8; ch++) {
        const steps = [];
        for (let s = 0; s < 8; s++) {
          // Create interesting patterns based on row/step
          const val = (g + p + ch + s) % 3;
          steps.push(val === 2 ? 0 : val);
        }
        rows.push(steps);
      }
      presets.push(rows);
    }
    demo.push(presets);
  }
  return demo;
}

// WebSocket connection
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function initWebSocket() {
  const wsUrl = `ws://${window.location.hostname}:81`;
  
  try {
    socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = function() {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      if (DEMO_MODE) {
        showStatus('🔌 Connected to device - leaving demo mode', 'success');
      }
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
      console.log('WebSocket closed');
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnecting... attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
        setTimeout(initWebSocket, 2000);
      }
    };
    
    socket.onerror = function(error) {
      console.log('WebSocket error, running in demo mode');
      startDemoMode();
    };
  } catch (e) {
    console.log('WebSocket unavailable, running in demo mode');
    startDemoMode();
  }
}

// Demo mode playback
let demoInterval = null;

function startDemoMode() {
  if (DEMO_MODE) return; // Already in demo mode
  
  // Generate demo data
  state.caveArray = generateDemoData();
  state.bpm = 120;
  
  updateDisplays();
  renderGrid();
  renderMuteStrip();
  renderStepIndicator();
  
  showStatus('🎮 Demo Mode - Connect device for live control', 'info');
  
  // Start animation loop
  if (demoInterval) clearInterval(demoInterval);
  demoInterval = setInterval(() => {
    state.currentStep = (state.currentStep + 1) % 8;
    renderGrid();
    renderStepIndicator();
  }, (60000 / state.bpm) / 4); // Quarter note timing
}

// Stop demo mode when real connection establishes
function stopDemoMode() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
}

// Modify onopen to exit demo mode
function setupSocketHandlers() {
  if (socket) {
    const originalOnOpen = socket.onopen;
    socket.onopen = function() {
      stopDemoMode();
      if (originalOnOpen) originalOnOpen();
    };
  }
}

// DOM Elements
const elements = {};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  cacheElements();
  
  // Generate demo data initially
  state.caveArray = generateDemoData();
  
  renderGrid();
  renderRowLabels();
  renderMuteStrip();
  renderStepIndicator();
  updateDisplays();
  attachEventListeners();
  
  // Try to connect to WebSocket
  initWebSocket();
  
  // Start demo playback immediately
  startDemoMode();
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
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "64step", row, col, value: state.caveArray[activeGroup][row][activeChannel][col] }));
    }
  } else {
    currentVal = state.caveArray[activeGroup][activePreset][row][col];
    state.caveArray[activeGroup][activePreset][row][col] = (currentVal + 1) % 3;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "8x8step", row, col, value: state.caveArray[activeGroup][activePreset][row][col] }));
    }
  }
  
  renderGrid();
  showStatus(`Cell ${row + 1}:${col + 1} = ${state.caveArray[activeGroup][activePreset][row][col]}`, 'success');
}

// Toggle mute
function toggleMute(ch) {
  state.muteArray[ch] = state.muteArray[ch] === 1 ? 0 : 1;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "mute", channel: ch, value: state.muteArray[ch] }));
  }
  renderMuteStrip();
  showStatus(`CH${ch + 1} ${state.muteArray[ch] ? 'unmuted' : 'muted'}`, 'success');
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
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "bpm", bpm: state.bpm }));
  }
  
  // Update demo tempo
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = setInterval(() => {
      state.currentStep = (state.currentStep + 1) % 8;
      renderGrid();
      renderStepIndicator();
    }, (60000 / state.bpm) / 4);
  }
}

// Send navigation via WebSocket
function sendNavigation(type, direction) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "updownPressed", segment: type, direction }));
  }
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
      // Update demo tempo
      if (demoInterval) {
        clearInterval(demoInterval);
        demoInterval = setInterval(() => {
          state.currentStep = (state.currentStep + 1) % 8;
          renderGrid();
          renderStepIndicator();
        }, (60000 / state.bpm) / 4);
      }
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
