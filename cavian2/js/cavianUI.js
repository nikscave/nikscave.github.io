/* Cavian2 Main JavaScript */
/* Uses shared utilities from js/utils.js */

// Demo mode flag - set true for standalone use without hardware
const DEMO_MODE = window.location.hostname.includes('github.io') || window.location.hostname !== 'mycavian.local';

let bpm = 120;
let resetTiming = 20;
let animationId;
let activeGroup = 0;
let activePreset = 0;
let activeChannel = 0;
let currentStep = 0;
let stepInterval;
let caveArray = null;
let GROUP_LOOPS_ENABLED = false;
let SET_LOOPS_ENABLED = false;
let PRESET_LOOPS_ENABLED = false;
let SEQUENCER_ACTIVE = true;
let PATTERN_RECEIVED = false;
let PRESET_CASCADE = false;
let RESET_TRIGGER_ENABLED = false;
let GROUP_LOOP_ARRAY;
let PRESET_LOOP_ARRAY;
let muteChannelArray;
let actionButtonStates = [false, false, false, false, false, false, false, false];
let topRowButtonStates = [false, false, false, false, false, false, false, false];
let viewMode = 'vertical';
let isPressing = false;
let isSwiping = false;
let startRow = -1;
let startCol = -1;
let startX = 0;
let startY = 0;
let swipeThreshold = 5;
let toggledCells = new Set();
let buttonRects = [];
let isTouching = false;
let latestTouch = null;
let isPollingTouch = false;
let lastTouched = null;
let dragStart = null;
let touchedButtons = new Set();
let COPY_MODE = false;
let PASTE_MODE = false;
let isCopyActive = false;
let isPasteActive = false;
let copyType = null;
let copyIndex = null;
let clearArmed = false;
let allPresets = {};
let seqSaved = null;
let mode = 'save';
let activeSlot = null;
let activeSaveBox = null;
let selectedSlot = null;
let selectedSaveBox = null;
let swingClipboard = null;
let selectedChannel = 0;
let swingMode = 'global';
let swingGlobalMode = false;

let actions = [];
let editingActionId = null;
let currentTrigger = 'immediate';
let selectedStep = null;
let channelStates = Array(8).fill('ignore');
let isToggleMode = false;

// Binary transfer state
let binaryBuffer = null;
let binaryHeaderReceived = false;
let expectedCaveSteps = 0;
let binaryStartTime = 0;

let currentActionType = 'mute';
let selectedPattern = null;
let draggedActionIndex = null;

// JS mirror of ESP8266 swingTemplates
const swingTemplates = [
  [0, 0, 0, 0, 0, 0, 0, 0],            // 0: Straight
  [0, 15, 0, 15, 0, 15, 0, 15],        // 1: 8th Swing
  [0, 25, 0, 25, 0, 25, 0, 25],        // 2: Heavy
  [0, 10, 0, 10, 0, 10, 0, 10],        // 3: Triplet
  [0, 0, 15, 0, 0, 15, 0, 0],          // 4: 16th
  [10, -10, 10, -10, 10, -10, 10, -10],// 5: Push-Pull
  [0, 5, 10, 15, 20, 15, 10, 5],       // 6: Accelerando
  [20, 15, 10, 5, 0, -5, -10, -15]     // 7: Ritardando
];

const channelSwing = Array.from({ length: 8 }, () =>
  Array(8).fill(0)
);

// WebSocket connection
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

function generateDemoData() {
  const demo = [];
  for (let g = 0; g < 8; g++) {
    const presets = [];
    for (let p = 0; p < 8; p++) {
      const rows = [];
      for (let ch = 0; ch < 8; ch++) {
        const steps = [];
        for (let s = 0; s < 8; s++) {
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

function startDemoMode() {
  caveArray = generateDemoData();
  PATTERN_RECEIVED = true;
  SEQUENCER_ACTIVE = true;
  console.log('Demo mode started');
  
  // Update displays
  updateDisplays();
  updateStepsGrid(activeGroup, activePreset, activeChannel);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  
  // Start step animation
  startStepAnimation();
  
  // Show demo mode status
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    statusBar.textContent = '🎮 Demo Mode - Connect to device for live control';
    statusBar.style.background = 'rgba(255, 165, 0, 0.9)';
    statusBar.style.color = '#000';
  }
}

function initWebSocket() {
  const wsUrl = "ws://mycavian.local:81/";
  
  try {
    socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = function () {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      socket.send(JSON.stringify({ type: "socket_ready_send_default_pattern" }));
      socket.send(JSON.stringify({ type: "get_actions" }));
      socket.send(JSON.stringify({ type: "getPresetsAll" }));
      caveArray = null;
    };
    
    socket.onmessage = function (event) {
      if (event.data instanceof ArrayBuffer) {
        handleBinaryData(event.data);
      } else if (typeof event.data === 'string') {
        handleDataReceived(event.data);
      }
    };
    
    socket.onerror = function (error) {
      console.log('WebSocket error, starting demo mode');
      startDemoMode();
    };
    
    socket.onclose = function () {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`WebSocket closed, reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(initWebSocket, 2000);
      } else {
        console.log('Max reconnect attempts reached, starting demo mode');
        startDemoMode();
      }
    };
  } catch (e) {
    console.log('WebSocket unavailable, starting demo mode');
    startDemoMode();
  }
}

// Initialize WebSocket or Demo mode
if (DEMO_MODE) {
  console.log('Running in demo mode (GitHub Pages or non-localhost)');
  window.addEventListener('DOMContentLoaded', startDemoMode);
} else {
  console.log('Attempting WebSocket connection to device');
  initWebSocket();
}

window.addEventListener('beforeunload', (e) => {
  console.log('Page unloading');
});

function openSettings() {
  window.location.href = '/config.html';
}

function updateDisplays() {
  const gd = document.getElementById('groupDisplay');
  const pd = document.getElementById('presetDisplay');
  const cd = document.getElementById('channelDisplay');
  if (gd) gd.textContent = activeGroup + 1;
  if (pd) pd.textContent = activePreset + 1;
  if (cd) cd.textContent = activeChannel + 1;
}

function cacheButtonRects() {
  buttonRects = [];
  document.querySelectorAll("#horizontal-grid .button").forEach(btn => {
    const rect = btn.getBoundingClientRect();
    buttonRects.push({
      row: parseInt(btn.dataset.row),
      col: parseInt(btn.dataset.col),
      rect: rect
    });
  });
}

function updateStepsGrid(group, preset, channel) {
  const sequencer = document.getElementById('sequencer');
  if (!sequencer || !caveArray) return;
  
  let html = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const val = caveArray[group][preset][row][col] || 0;
      const isPlaying = col === currentStep;
      const classes = ['button'];
      if (val === 1) classes.push('active');
      else if (val === 9) classes.push('always-active');
      if (isPlaying) classes.push('playing');
      html += `<div class="${classes.join(' ')}" data-row="${row}" data-col="${col}" onclick="toggleCell(${row}, ${col})"></div>`;
    }
  }
  sequencer.innerHTML = html;
}

function updateActiveIndicators(group, preset, channel) {
  // Visual feedback for active group/preset changes
  const groupDisplay = document.getElementById('groupDisplay');
  const presetDisplay = document.getElementById('presetDisplay');
  if (groupDisplay) groupDisplay.style.color = 'var(--accent-primary)';
  if (presetDisplay) presetDisplay.style.color = 'var(--accent-primary)';
  setTimeout(() => {
    if (groupDisplay) groupDisplay.style.color = '';
    if (presetDisplay) presetDisplay.style.color = '';
  }, 300);
}

function startStepAnimation() {
  if (stepInterval) clearInterval(stepInterval);
  stepInterval = setInterval(() => {
    if (SEQUENCER_ACTIVE) {
      currentStep = (currentStep + 1) % 8;
      updateStepsGrid(activeGroup, activePreset, activeChannel);
      
      // Update step indicator
      const dots = document.querySelectorAll('.step-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentStep);
      });
    }
  }, (60000 / bpm) / 4);
}

function toggleCell(row, col) {
  if (!caveArray) return;
  
  let newVal;
  if (viewMode === 'horizontal64') {
    newVal = caveArray[activeGroup][row][activeChannel][col];
    newVal = (newVal === 0) ? 1 : (newVal === 1) ? 9 : 0;
    caveArray[activeGroup][row][activeChannel][col] = newVal;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "64step", row: row, col: col, value: newVal }));
    }
  } else {
    newVal = caveArray[activeGroup][activePreset][row][col];
    newVal = (newVal === 0) ? 1 : (newVal === 1) ? 9 : 0;
    caveArray[activeGroup][activePreset][row][col] = newVal;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "8x8step", row: row, col: col, value: newVal }));
    }
  }
  
  updateStepsGrid(activeGroup, activePreset, activeChannel);
  showStatus(`Cell ${row + 1}:${col + 1} = ${newVal}`, 'success');
}

function changeGroup(direction) {
  activeGroup = (activeGroup + direction + 8) % 8;
  updateDisplays();
  updownPressed("group", direction);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  updateStepsGrid(activeGroup, activePreset, activeChannel);
}

function changePreset(direction) {
  activePreset = (activePreset + direction + 8) % 8;
  updateDisplays();
  updownPressed("preset", direction);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  updateStepsGrid(activeGroup, activePreset, activeChannel);
}

function changeChannel(direction) {
  activeChannel = (activeChannel + direction + 8) % 8;
  updateDisplays();
  updownPressed("channel", direction);
  updateStepsGrid(activeGroup, activePreset, activeChannel);
}

function changeTempo(direction) {
  const bpmInput = document.getElementById('bpmInput');
  const bpmDisplay = document.getElementById('bpmDisplay');
  const tempoDisplay = document.getElementById('tempoDisplay');
  
  if (direction === 'up' && bpm < 400) bpm += 1;
  if (direction === 'down' && bpm > 1) bpm -= 1;
  
  if (bpmDisplay) bpmDisplay.textContent = bpm;
  if (tempoDisplay) tempoDisplay.textContent = bpm;
  if (bpmInput) bpmInput.value = bpm;
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "bpm", bpm: bpm }));
  }
  
  // Restart animation with new tempo
  startStepAnimation();
  showStatus(`BPM: ${bpm}`, 'info');
}

function updownPressed(type, direction) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "updownPressed", segment: type, direction }));
  }
}

// Override other functions for demo mode
function handleBinaryData(data) {
  console.log('Binary data received (demo mode ignores)');
}

function handleDataReceived(data) {
  if (DEMO_MODE) return; // Ignore WebSocket data in demo mode
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'cave_data' || parsed.type === 'full_pattern') {
        caveArray = parsed.caveArray || parsed.patternArray;
        if (parsed.bpm) bpm = parsed.bpm;
        PATTERN_RECEIVED = true;
        updateDisplays();
        updateStepsGrid(activeGroup, activePreset, activeChannel);
        startStepAnimation();
      }
    } catch (e) {
      console.log('Data received:', data);
    }
  }
}

// Placeholder for functions that need implementation
function switchView(view) {
  viewMode = view;
  document.querySelectorAll('.view-button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-' + view)?.classList.add('active');
  
  const vertical = document.getElementById('sequencer-container');
  const horizontal = document.getElementById('horizontal-container');
  
  if (vertical) vertical.style.display = view === 'vertical' ? 'block' : 'none';
  if (horizontal) horizontal.style.display = view !== 'vertical' ? 'block' : 'none';
  
  updateStepsGrid(activeGroup, activePreset, activeChannel);
  showStatus('View: ' + view, 'info');
}

function openSaveModal() { showStatus('Save modal (demo)', 'info'); }
function openLoadModal() { showStatus('Load modal (demo)', 'info'); }
function closeModal() {}

function getTouchedButton(x, y) {
  for (let i = 0; i < buttonRects.length; i++) {
    const { row, col, rect } = buttonRects[i];
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return { row, col };
    }
  }
  return null;
}

function attachHorizontalGridEvents() {
  const horizontalGrid = document.getElementById("horizontal-grid");
  if (!horizontalGrid) return;
  
  horizontalGrid.addEventListener("touchstart", handleTouchStart, { passive: false });
  horizontalGrid.addEventListener("touchmove", handleTouchMove, { passive: false });
  horizontalGrid.addEventListener("touchend", handleTouchEnd, { passive: false });
  horizontalGrid.addEventListener("mousedown", handlePressStart, { passive: false });
  horizontalGrid.addEventListener("mousemove", handleMouseMove, { passive: false });
  horizontalGrid.addEventListener("mouseup", handlePressEnd, { passive: false });
}

function handlePressStart(e) {
  isPressing = true;
  const btn = e.target.closest(".button");
  if (btn) {
    const row = parseInt(btn.dataset.row);
    const col = parseInt(btn.dataset.col);
    toggleButton(row, col);
    toggledCells.add(`${row},${col}`);
  }
}

function handleMouseMove(e) {
  if (!isPressing) return;
  const btn = getTouchedButton(e.clientX, e.clientY);
  if (btn) {
    const key = `${btn.row},${btn.col}`;
    if (!toggledCells.has(key)) {
      toggleButton(btn.row, btn.col);
      toggledCells.add(key);
    }
  }
}

function handlePressEnd(e) {
  isPressing = false;
  toggledCells.clear();
}

let lastToggleTime = 0;
const TOGGLE_THROTTLE = 50;

function handleTouchStart(e) {
  e.preventDefault();
  isTouching = true;
  touchedButtons.clear();
  const touch = e.touches[0];
  const btn = getTouchedButton(touch.clientX, touch.clientY);
  if (btn) {
    touchedButtons.add(`${btn.row},${btn.col}`);
    toggleButton(btn.row, btn.col);
  }
}

function handleTouchMove(e) {
  if (!isTouching) return;
  e.preventDefault();
  
  const now = Date.now();
  if (now - lastToggleTime < TOGGLE_THROTTLE) return;
  
  const touch = e.touches[0];
  const btn = getTouchedButton(touch.clientX, touch.clientY);
  
  if (btn) {
    const key = `${btn.row},${btn.col}`;
    if (!touchedButtons.has(key)) {
      touchedButtons.add(key);
      toggleButton(btn.row, btn.col);
      lastToggleTime = now;
    }
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  
  if (!isTouching) return;

  const touch = e.changedTouches[0];
  const btn = getTouchedButton(touch.clientX, touch.clientY);

  if (btn) {
    const key = `${btn.row},${btn.col}`;
    if (!toggledButtons.has(key)) {
      touchedButtons.add(key);
      toggleButton(btn.row, btn.col);
    }
  }

  isTouching = false;
  touchedButtons.clear();
}

function toggleButton(row, col) {
  let newVal;
  if (viewMode === 'horizontal64') {
    const current = caveArray[activeGroup][row][activeChannel][col];
    newVal = (current === 0) ? 1 : (current === 1) ? 9 : 0;
    caveArray[activeGroup][row][activeChannel][col] = newVal;
    socket.send(JSON.stringify({ type: "64step", row: row, col: col, value: newVal }));
    
    const btn = document.querySelector(`#horizontal-grid .button[data-row='${row}'][data-col='${col}']`);
    if (btn) {
      btn.classList.remove('active', 'always-active');
      if (newVal === 1) btn.classList.add('active');
      else if (newVal === 9) btn.classList.add('always-active');
    }
  } else {
    const current = caveArray[activeGroup][activePreset][row][col];
    newVal = (current === 0) ? 1 : (current === 1) ? 9 : 0;
    caveArray[activeGroup][activePreset][row][col] = newVal;
    socket.send(JSON.stringify({ type: "8x8step", row: row, col: col, value: newVal }));
    
    const btn = document.querySelector(`#horizontal-grid .button[data-row='${row}'][data-col='${col}']`);
    if (btn) {
      btn.classList.remove('active', 'always-active');
      if (newVal === 1) btn.classList.add('active');
      else if (newVal === 9) btn.classList.add('always-active');
    }
  }
}

function switchView(view) {
  const vertical = document.getElementById('sequencer-container');
  const horizontal = document.getElementById('horizontal-container');
  const swingEditor = document.getElementById('swingEditor');
  const mainLayout = document.getElementById('mainLayout');
  const bottomBar = document.getElementById('bottomBar');
  const actionEditor = document.getElementById('actionsEditor');

  viewMode = view;
  document.querySelectorAll('.view-button').forEach(btn => btn.classList.remove('active'));

  vertical.style.display = 'none';
  horizontal.style.display = 'none';
  swingEditor.style.display = 'none';
  actionEditor.style.display = 'none';
  
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (view === 'vertical') {
    document.getElementById('btn-vertical').classList.add('active');
    vertical.style.display = 'block';
    mainLayout.style.display = 'flex';
    bottomBar.style.display = 'flex';
    actionEditor.style.display = 'none';
    updateStepsGrid(activeGroup, activePreset, activeChannel);
    updateActiveIndicators(activeGroup, activePreset, activeChannel);
    startStepAnimation();
  } else if (view === 'swing') {
    document.getElementById('btn-swing').classList.add('active');
    swingEditor.style.display = 'block';
    mainLayout.style.display = 'none';
    bottomBar.style.display = 'none';
    actionEditor.style.display = 'none';
    selectChannel(activeChannel);
    if (swingGlobalMode) {
      toggleMode('global');
      document.getElementById('globalSwingSlider').value = channelSwing[activeChannel][0];
      document.getElementById('globalSwingValue').textContent = channelSwing[activeChannel][0] + '%';
    } else {
      toggleMode('perStep');
    }
  } else if (view === 'actions') {
    document.getElementById('btn-mute').classList.add('active');
    vertical.style.display = 'none';
    horizontal.style.display = 'none';
    swingEditor.style.display = 'none';
    actionEditor.style.display = 'block';
    mainLayout.style.display = 'none';
    bottomBar.style.display = 'none';
    if (animationId) cancelAnimationFrame(animationId);
    return;
  } else {
    if (view === 'horizontal') {
      document.getElementById('btn-8x8').classList.add('active');
    } else {
      document.getElementById('btn-64').classList.add('active');
    }
    horizontal.style.display = 'block';
    mainLayout.style.display = 'flex';
    bottomBar.style.display = 'flex';
    horizontal.querySelector('#horizontal-grid').innerHTML = '';
    drawHorizontalView();
    startStepAnimation();
  }
  
  console.log("Switched to view:", view);
}

function drawHorizontalView() {
  const horizontalGrid = document.getElementById("horizontal-grid");
  if (!horizontalGrid) return;
  
  if (!caveArray) {
    console.log("caveArray not initialized yet");
    return;
  }

  let html = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      let val, isPlaying = false;
      if (viewMode === 'horizontal64') {
        if (caveArray[activeGroup] && caveArray[activeGroup][row] && caveArray[activeGroup][row][activeChannel]) {
          val = caveArray[activeGroup][row][activeChannel][col];
        } else {
          val = 0;
        }
        isPlaying = (row === activePreset && col === currentStep);
      } else {
        if (caveArray[activeGroup] && caveArray[activeGroup][activePreset] && caveArray[activeGroup][activePreset][row]) {
          val = caveArray[activeGroup][activePreset][row][col];
        } else {
          val = 0;
        }
        isPlaying = (col === currentStep);
      }
      const classes = ['button'];
      if (val === 1) classes.push('active');
      else if (val === 9) classes.push('always-active');
      if (isPlaying) classes.push('playing');
      html += `<div class="${classes.join(' ')}" data-row="${row}" data-col="${col}"></div>`;
    }
  }
  horizontalGrid.innerHTML = html;
  cacheButtonRects();
  attachHorizontalGridEvents();
}

function changeGroup(direction) {
  if (direction === "up") {
    activeGroup++;
    if (activeGroup > 7) activeGroup = 0;
  } else {
    activeGroup--;
    if (activeGroup < 0) activeGroup = 7;
  }

  updateDisplays();
  updownPressed("group", direction);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  
  if (viewMode === 'vertical') {
    updateStepsGrid(activeGroup, activePreset, activeChannel);
  } else {
    drawHorizontalView();
  }
}

function changePreset(direction) {
  if (direction === "up") {
    activePreset++;
    if (activePreset > 7) activePreset = 0;
  } else {
    activePreset--;
    if (activePreset < 0) activePreset = 7;
  }

  updateDisplays();
  updownPressed("preset", direction);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  
  if (viewMode === 'vertical') {
    updateStepsGrid(activeGroup, activePreset, activeChannel);
  } else {
    drawHorizontalView();
  }
}

function changeChannel(direction) {
  if (direction === "up") {
    activeChannel++;
    if (activeChannel > 7) activeChannel = 0;
  } else {
    activeChannel--;
    if (activeChannel < 0) activeChannel = 7;
  }

  updateDisplays();
  updownPressed("channel", direction);
  updateActiveIndicators(activeGroup, activePreset, activeChannel);
  
  if (viewMode === 'vertical') {
    updateStepsGrid(activeGroup, activePreset, activeChannel);
  } else if (viewMode === 'swing') {
    selectChannel(activeChannel);
  } else if (viewMode === 'horizontal64') {
    drawHorizontalView();
  }
}

function changeTempo(direction) {
  let bpmInput = document.getElementById('bpmInput');
  let bpmDisplay = document.getElementById('bpmDisplay');
  let currentBpm = parseInt(bpmDisplay.textContent);

  if (direction === 'up' && currentBpm < 400) {
    currentBpm += 1;
  } else if (direction === 'down' && currentBpm > 1) {
    currentBpm -= 1;
  }
  
  bpm = currentBpm;
  bpmDisplay.textContent = currentBpm;
  bpmInput.value = currentBpm;
   
  socket.send(JSON.stringify({ type: "bpm", bpm: currentBpm }));
}
