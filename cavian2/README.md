# Cavian2 UI Modular Architecture

## Overview

The Cavian2 user interface has been completely refactored into a modular, maintainable structure with full theming support.

## Directory Structure

```
data/
├── 📄 HTML Pages
│   ├── cavianUI.html       # Original sequencer interface
│   ├── cavianUI-v2.html    # NEW: Improved v2 interface (recommended)
│   ├── preview.html        # NEW: Standalone preview for GitHub Pages
│   ├── config.html         # Settings & WiFi configuration
│   └── upload.html         # File upload & firmware flasher
│
├── 🎨 CSS Stylesheets
│   ├── cavianUI.css        # Original styles
│   ├── cavianUI-v2.css     # NEW: v2 styles
│   ├── config.css          # Settings page styles
│   └── upload.css          # Upload page styles
│
├── ⚙️ JavaScript Modules
│   ├── utils.js            # Shared utilities
│   ├── cavianUI.js         # Original UI logic
│   ├── cavianUI-v2.js      # NEW: v2 logic
│   ├── config.js           # Settings page logic
│   ├── upload.js           # Upload page logic
│   ├── theme-switcher.js   # Theme management
│   └── swing.js            # Swing editor (planned)
│
└── 🎭 Themes
    └── theme.css           # CSS custom properties (theming system)
```

## Preview (GitHub Pages)

The `preview.html` file is a **standalone preview** that works in any browser without the ESP32 hardware.

### How to Preview

**Option 1: Open Locally**
```bash
# Open in browser
open data/preview.html
# or
xdg-open data/preview.html
```

**Option 2: GitHub Pages**
1. Go to Repository Settings → Pages
2. Enable Pages for `feature/modular-ui` branch (or `/docs` folder)
3. Visit: `https://<username>.github.io/Cavian2/preview.html`

**Option 3: GitHub Code Spaces**
1. Open in Code Spaces
2. Right-click `preview.html` → Open with Live Server

### Preview Features
- ✅ All UI elements visible
- ✅ Interactive grid (toggle cells)
- ✅ Working controls (BPM, Group, Preset, Channel)
- ✅ Mute strip
- ✅ Step playback animation
- ❌ No WebSocket connection (hardware required)
- ❌ No Save/Load (requires ESP32)

## v2 Interface (Recommended)

The new `cavianUI-v2.html` offers significant UX improvements:

- **Clean layout** — Single focused view
- **Row labels** — Channel identification
- **Context badge** — Shows current G:P:CH
- **Mute strip** — Quick channel muting
- **Step indicator** — Visual playback feedback
- **Larger touch targets** — 40-44px buttons
- **Keyboard shortcuts** — Arrow keys, [/], +/-

### v2 Layout
```
┌─────────────────────────────────┐
│ 🎛️ Cavian    G1 P1 CH1    [Grid ▼]│
├─────────────────────────────────┤
│ BPM  GROUP  PRESET   CH    [💾📂⚙️]│
│ 120    1      1      1           │
│  −    1      1      1     +      │
├─────────────────────────────────┤
│ CH1 CH2 CH3 CH4 CH5 CH6 CH7 CH8 │  ← Row labels
│ [ ][ ][ ][ ][ ][ ][ ][ ]        │  ← 8×8 Grid
│ [M][M][M][M][M][M][M][M]        │  ← Mute strip
│ ● ○ ○ ○ ○ ○ ○ ○                │  ← Step indicator
└─────────────────────────────────┘
```

## Theme System

### 🎭 Theme System
- **5 Built-in themes**: Dark, Light, High Contrast, Neon, Mono
- **CSS Custom Properties**: All colors defined as variables
- **Live switching**: Change themes instantly
- **Persistence**: Theme saved to localStorage
- **Cross-page**: Theme applies to all pages

### 📱 Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-optimized controls

### ♿ Accessibility
- Keyboard navigation support
- Focus indicators
- Reduced motion support
- High contrast theme

### ⚡ Performance
- Separate CSS/JS files for caching
- No duplicate styles
- Efficient selectors
- Minimal DOM manipulation

## Quick Start

### Adding a New Page

1. Create HTML file in `data/`
2. Add modular CSS file in `data/css/`
3. Add JS module in `data/js/`
4. Reference shared files:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/themes/theme.css">
  <link rel="stylesheet" href="/css/your-page.css">
  <script src="/js/theme-switcher.js" defer></script>
</head>
<body>
  <!-- Your content -->
  <script src="/js/utils.js"></script>
  <script src="/js/your-page.js"></script>
</body>
</html>
```

### Adding a New Theme

Edit `data/themes/theme.css`:

```css
[data-theme="my-theme"] {
  --bg-primary: #your-color;
  --bg-secondary: #your-color;
  --accent-primary: #your-color;
  --text-primary: #your-color;
  /* ... more variables */
}
```

### Modifying Styles

All styles use CSS variables. Change values in `theme.css` or override in page-specific CSS:

```css
/* Override theme variable */
.my-component {
  background: var(--accent-primary, #667eea);
}

/* Use spacing variables */
.my-component {
  padding: var(--spacing-md);
  margin: var(--spacing-lg);
}
```

## CSS Variables Reference

### Core Colors
| Variable | Description |
|----------|-------------|
| `--bg-primary` | Main background |
| `--bg-secondary` | Secondary background |
| `--bg-card` | Card background |
| `--accent-primary` | Primary accent color |

### Typography
| Variable | Description |
|----------|-------------|
| `--font-family` | Font family |
| `--font-size-sm` | Small text |
| `--font-size-md` | Medium text |
| `--font-size-lg` | Large text |

### Spacing
| Variable | Description |
|----------|-------------|
| `--spacing-xs` | Extra small (5px) |
| `--spacing-sm` | Small (8px) |
| `--spacing-md` | Medium (12px) |
| `--spacing-lg` | Large (15px) |
| `--spacing-xl` | Extra large (20px) |

## Development Commands

```bash
# View changes
git status

# Commit changes
git add . && git commit -m "message"

# Push to branch
git push origin feature/modular-ui

# Create pull request
# Visit: https://github.com/nikscave/Cavian2/pull/new/feature/modular-ui
```

## Browser Support

- Chrome 80+ (Web Serial API)
- Firefox 85+
- Safari 14+
- Edge 80+

## Known Limitations

- Web Serial API requires HTTPS or localhost
- Some themes may have contrast issues on certain screens
- Mobile Safari may have limited Web Serial support

## Future Enhancements

- [ ] Complete swing.js module
- [ ] Complete actions.js module
- [ ] Add animations library
- [ ] Implement drag-and-drop patterns
- [ ] Add gesture support
- [ ] Implement offline mode with Service Worker

## Credits

Built with:
- Vanilla JavaScript (ES6+)
- CSS Custom Properties
- WebSocket API
- Web Serial API (for firmware flasher)

---

**Branch**: `feature/modular-ui`  
**Status**: In Development  
**Lines of Code**: ~2,500 (organized modular files)
