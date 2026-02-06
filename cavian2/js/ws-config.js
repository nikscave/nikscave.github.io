/* Cavian2 WebSocket Configuration */
/* Common config for all UI versions */

// Get WebSocket URL - uses URL param, then hostname, then defaults
function getWebSocketURL() {
  // Check for URL parameter (e.g., ?ws=192.168.1.100)
  const urlParams = new URLSearchParams(window.location.search);
  const wsParam = urlParams.get('ws');
  
  if (wsParam) {
    return `ws://${wsParam}:81`;
  }
  
  // Use current hostname (works for local networks)
  const hostname = window.location.hostname;
  if (hostname && hostname !== '') {
    return `ws://${hostname}:81`;
  }
  
  // Default for local development
  return 'ws://mycavian.local:81';
}

// Export the WebSocket URL
const CAVIAN_WS_URL = getWebSocketURL();

// Make available globally
window.CAVIAN_WS_URL = CAVIAN_WS_URL;

// Helper function to send to ESP32 safely
function sendToESP32(data) {
  if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// Helper to check if connected to ESP32
function isConnectedToESP32() {
  return typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN;
}

console.log('WebSocket URL:', CAVIAN_WS_URL);
