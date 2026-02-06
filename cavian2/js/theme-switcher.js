/* Cavian2 Theme Switcher */
/* Adds theme switching functionality to the UI with smooth transitions */

const themes = [
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'light', name: 'Light', icon: '☀️' },
  { id: 'high-contrast', name: 'High Contrast', icon: '🔲' },
  { id: 'neon', name: 'Neon', icon: '✨' },
  { id: 'mono', name: 'Mono', icon: '⬛' }
];

function createThemeSwitcher() {
  const switcherContainer = document.createElement('div');
  switcherContainer.id = 'theme-switcher';
  switcherContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    transition: opacity 0.3s ease;
  `;

  const currentTheme = localStorage.getItem('cavian-theme') || 'dark';
  
  let html = `
    <select id="theme-select" style="
      padding: 8px 12px;
      background: var(--bg-card, rgba(255,255,255,0.05));
      border: 1px solid var(--border-color, rgba(255,255,255,0.1));
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
      font-size: 14px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      outline: none;
    " onmouseover="this.style.borderColor='var(--accent-primary)'" 
       onmouseout="this.style.borderColor='var(--border-color)'">
  `;

  themes.forEach(theme => {
    const selected = theme.id === currentTheme ? 'selected' : '';
    html += `<option value="${theme.id}" ${selected}>${theme.icon} ${theme.name}</option>`;
  });

  html += '</select>';
  switcherContainer.innerHTML = html;

  document.body.appendChild(switcherContainer);

  const select = document.getElementById('theme-select');
  if (select) {
    select.addEventListener('change', function() {
      setTheme(this.value);
    });
    
    // Add keyboard navigation
    select.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        this.blur();
      }
    });
  }
}

function setTheme(themeName) {
  // Validate theme
  const validThemes = ['dark', 'light', 'high-contrast', 'neon', 'mono'];
  if (!validThemes.includes(themeName)) {
    console.warn(`Unknown theme: ${themeName}, falling back to dark`);
    themeName = 'dark';
  }
  
  // Add transition class for smooth theme change
  document.body.classList.add('theme-transitioning');
  
  // Remove all theme attributes
  validThemes.forEach(t => {
    document.body.removeAttribute(`data-theme-${t}`);
  });
  
  // Set new theme
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('cavian-theme', themeName);
  
  // Update select if it exists
  const select = document.getElementById('theme-select');
  if (select) {
    select.value = themeName;
  }
  
  // Dispatch event for other components
  document.dispatchEvent(new CustomEvent('themechange', { 
    detail: { theme: themeName }
  }));
  
  // Remove transition class after animation
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 300);
  
  // Save to ESP32 if WebSocket is available
  if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'setTheme',
      theme: themeName
    }));
  }
  
  console.log(`Theme changed to: ${themeName}`);
}

function getCurrentTheme() {
  return localStorage.getItem('cavian-theme') || 'dark';
}

function cycleTheme() {
  const current = getCurrentTheme();
  const currentIndex = themes.findIndex(t => t.id === current);
  const nextIndex = (currentIndex + 1) % themes.length;
  setTheme(themes[nextIndex].id);
}

// Initialize theme transitions CSS
function initThemeTransitions() {
  const style = document.createElement('style');
  style.textContent = `
    .theme-transitioning,
    .theme-transitioning * {
      transition: background-color 0.3s ease,
                  color 0.3s ease,
                  border-color 0.3s ease,
                  box-shadow 0.3s ease,
                  fill 0.3s ease !important;
    }
    
    /* Smooth theme switching animation */
    @keyframes themeFadeIn {
      from { opacity: 0.8; }
      to { opacity: 1; }
    }
    
    [data-theme] {
      animation: themeFadeIn 0.3s ease;
    }
    
    /* Theme-specific enhancements */
    [data-theme="neon"] {
      text-shadow: 0 0 5px currentColor;
    }
    
    [data-theme="neon"] .button {
      box-shadow: 0 0 10px var(--accent-primary);
    }
    
    [data-theme="high-contrast"] {
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
}

// Add theme to page title
function updatePageTitle() {
  const theme = getCurrentTheme();
  const themeData = themes.find(t => t.id === theme);
  if (themeData && document.title) {
    document.title = `${themeData.icon} ${document.title.replace(/^[🌙☀️🔲✨⬛]\s*/, '')}`;
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initThemeTransitions();
  createThemeSwitcher();
  updatePageTitle();
});
