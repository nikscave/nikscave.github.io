/* Cavian2 Config Page Logic */

let currentConfig = {};
let selectedMode = 'hotspot';
let isScanning = false;

// WebSocket connection
const socket = new WebSocket(`ws://${window.location.hostname}:81`);

socket.onopen = function() {
  console.log('WebSocket connected');
  socket.send(JSON.stringify({ type: "getConfig" }));
  socket.send(JSON.stringify({ type: "scanWiFi" }));
};

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  if (data.type === 'configData') {
    currentConfig = data;
    loadConfig();
  } else if (data.type === 'wifi_networks') {
    displayNetworks(data.networks);
  } else if (data.type === 'config_updated') {
    showStatus('Config saved! Rebooting...', 'success');
    startRebootCountdown();
  } else if (data.type === 'rebooting') {
    showStatus('Device rebooting...', 'warning');
  }
};

socket.onclose = function() {
  console.log('WebSocket closed');
};

function loadConfig() {
  // Set current mode
  if (currentConfig.modeType === "HOTSPOT") {
    selectMode('hotspot');
    document.getElementById('currentMode').textContent = "Hotspot";
    document.getElementById('currentDetail').textContent = 
      `Broadcasting: ${currentConfig.apSSID}`;
  } else {
    selectMode('wifi');
    document.getElementById('currentMode').textContent = "WiFi";
    document.getElementById('currentDetail').textContent = 
      `Connected to: ${currentConfig.staSSID || "Unknown"}`;
  }

  // Fill in form fields
  document.getElementById('hotspotSSID').value = currentConfig.apSSID || '';
  document.getElementById('hotspotPassword').value = currentConfig.apPassword || '';
  document.getElementById('wifiSSID').value = currentConfig.staSSID || '';
  document.getElementById('wifiPassword').value = currentConfig.staPassword || '';
}

function selectMode(mode) {
  selectedMode = mode;
  
  // Update card styles
  document.getElementById('hotspotCard').classList.toggle('active', mode === 'hotspot');
  document.getElementById('wifiCard').classList.toggle('active', mode === 'wifi');
  
  // Show/hide panels
  document.getElementById('hotspotPanel').classList.toggle('active', mode === 'hotspot');
  document.getElementById('wifiPanel').classList.toggle('active', mode === 'wifi');
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  field.type = field.type === 'password' ? 'text' : 'password';
}

function scanNetworks() {
  if (isScanning) return;
  
  isScanning = true;
  const scanIcon = document.getElementById('scanIcon');
  scanIcon.innerHTML = '<span class="spinner"></span>';
  
  document.getElementById('wifiNetworks').innerHTML = 
    '<div style="text-align: center; padding: 20px; color: #888;">Scanning...</div>';
  
  socket.send(JSON.stringify({ type: "scanWiFi" }));
  
  setTimeout(() => {
    if (isScanning) {
      isScanning = false;
      scanIcon.textContent = '🔍';
      document.getElementById('wifiNetworks').innerHTML = 
        '<div style="text-align: center; padding: 20px; color: #666;">No networks found</div>';
    }
  }, 10000);
}

function displayNetworks(networks) {
  isScanning = false;
  document.getElementById('scanIcon').textContent = '🔍';
  
  const container = document.getElementById('wifiNetworks');
  
  if (!networks || networks.length === 0) {
    container.innerHTML = 
      '<div style="text-align: center; padding: 20px; color: #666;">No networks found</div>';
    return;
  }
  
  container.innerHTML = '';
  networks.forEach(network => {
    const div = document.createElement('div');
    div.className = 'wifi-network';
    div.onclick = () => selectNetwork(network.ssid);
    
    // Signal strength icon
    let signalIcon = '📶';
    if (network.rssi > -50) signalIcon = '📶';
    else if (network.rssi > -70) signalIcon = '📡';
    else signalIcon = '📉';
    
    div.innerHTML = `
      <span class="wifi-signal">${signalIcon}</span>
      <span class="wifi-name">${network.ssid}</span>
      ${network.encryption !== 'OPEN' ? '<span class="wifi-lock">🔒</span>' : ''}
    `;
    
    container.appendChild(div);
  });
}

function selectNetwork(ssid) {
  document.getElementById('wifiSSID').value = ssid;
  document.querySelectorAll('.wifi-network').forEach(net => {
    net.classList.toggle('selected', net.querySelector('.wifi-name').textContent === ssid);
  });
}

function validateInputs() {
  if (selectedMode === 'hotspot') {
    const ssid = document.getElementById('hotspotSSID').value.trim();
    const password = document.getElementById('hotspotPassword').value;
    
    if (!ssid) {
      alert('❌ Please enter a hotspot name');
      return false;
    }
    if (password.length < 8) {
      alert('❌ Hotspot password must be at least 8 characters');
      return false;
    }
  } else {
    const ssid = document.getElementById('wifiSSID').value.trim();
    
    if (!ssid) {
      alert('❌ Please enter a WiFi network name');
      return false;
    }
  }
  
  return true;
}

function saveAndApply() {
  if (!validateInputs()) return;
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
  
  let config;
  
  if (selectedMode === 'hotspot') {
    config = {
      type: "updateConfig",
      modeType: "HOTSPOT",
      apSSID: document.getElementById('hotspotSSID').value.trim(),
      apPassword: document.getElementById('hotspotPassword').value,
      staSSID: currentConfig.staSSID,
      staPassword: currentConfig.staPassword
    };
  } else {
    config = {
      type: "updateConfig",
      modeType: "WIFI",
      apSSID: currentConfig.apSSID,
      apPassword: currentConfig.apPassword,
      staSSID: document.getElementById('wifiSSID').value.trim(),
      staPassword: document.getElementById('wifiPassword').value
    };
  }
  
  socket.send(JSON.stringify(config));
  
  setTimeout(() => {
    socket.send(JSON.stringify({ type: "reboot" }));
  }, 500);
}

function startRebootCountdown() {
  document.getElementById('rebootModal').classList.add('active');
  
  let seconds = 10;
  const countdownEl = document.getElementById('countdown');
  const messageEl = document.getElementById('rebootMessage');
  
  if (selectedMode === 'wifi') {
    messageEl.innerHTML = `
      Connecting to <strong>${document.getElementById('wifiSSID').value}</strong>...<br>
      If connection fails, Cavian will revert to Hotspot mode automatically.
    `;
  } else {
    messageEl.innerHTML = `
      Switching to Hotspot mode: <strong>${document.getElementById('hotspotSSID').value}</strong><br>
      Connect to this network to continue using Cavian.
    `;
  }
  
  const interval = setInterval(() => {
    seconds--;
    countdownEl.textContent = seconds;
    
    if (seconds <= 0) {
      clearInterval(interval);
      countdownEl.textContent = '✅';
      messageEl.innerHTML = 'Reboot complete! Reconnecting...';
      
      setTimeout(() => {
        location.reload();
      }, 2000);
    }
  }, 1000);
}

function goBack() {
  if (document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}

function showStatus(message, type = "info") {
  const banner = document.getElementById('statusBanner');
  banner.className = type === "warning" ? "status-banner warning" : "status-banner";
  
  const icon = type === "warning" ? "⚠️" : "✅";
  banner.querySelector('.status-icon').textContent = icon;
  banner.querySelector('.status-title').textContent = message;
}
