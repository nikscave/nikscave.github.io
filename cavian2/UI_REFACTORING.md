# Cavian2 UI Refactoring - Modular Structure

## Overview

The UI has been refactored from a single monolithic file into a modular structure for better maintainability and theming support.

## New Structure

```
data/
├── cavianUI.html          # Main UI (simplified, references external files)
├── config.html            # Configuration page (refactored)
├── upload.html            # File upload & firmware page (refactored)
│
├── css/
│   ├── cavianUI.css       # Main UI styles (uses CSS variables)
│   ├── config.css         # Config page styles
│   └── upload.css         # Upload page styles
│
├── js/
│   ├── utils.js           # Shared utilities
│   ├── cavianUI.js        # Main UI logic
│   ├── config.js          # Config page logic
│   ├── upload.js          # Upload page logic
│   ├── theme-switcher.js  # Theme switching functionality
│   └── swing.js           # Swing editor logic (future)
│
└── themes/
    └── theme.css          # CSS custom properties for theming
```

## Refactored Pages

### cavianUI.html (Main Sequencer)
- Simplified HTML structure
- References external CSS/JS files
- Theme switcher automatically added

### config.html (Settings)
- WiFi/Hotspot configuration
- Network scanning
- Refactored to use shared theme

### upload.html (Files & Firmware)
- File upload with drag & drop
- Firmware flasher tab (placeholder for ESP Web Tools)
- All styles externalized

## Theme System

Themes are implemented using CSS custom properties (CSS variables) defined in `themes/theme.css`.

### Available Themes
- **Dark** (default) - Standard dark theme
- **Light** - Light theme for bright environments
- **High Contrast** - Maximum contrast for accessibility
- **Neon** - Cyberpunk-inspired theme with glowing effects
- **Monochrome** - Black and white only

### Switching Themes

Themes can be switched via:
1. Theme dropdown (top-right corner)
2. JavaScript: `setTheme('theme-name')`
3. LocalStorage: `localStorage.setItem('cavian-theme', 'theme-name')`

### Adding New Themes

Add to `themes/theme.css`:

```css
[data-theme="my-theme"] {
  --bg-primary: #your-color;
  --bg-secondary: #your-color;
  --accent-primary: #your-color;
  /* ... other variables */
}
```

## CSS Architecture

### CSS Variables

All colors and styles use CSS variables from `theme.css`:

```css
/* Good - uses variables */
background: var(--bg-primary);
color: var(--text-primary);
border-color: var(--border-color);

/* Avoid - hardcoded values */
background: #1a1a2e;
color: #ffffff;
```

### Variable Categories

- **Core Palette**: `--bg-primary`, `--bg-secondary`, `--bg-card`
- **Accents**: `--accent-primary`, `--accent-secondary`, `--accent-glow`
- **State Colors**: `--color-success`, `--color-error`, `--color-warning`
- **Text**: `--text-primary`, `--text-secondary`, `--text-muted`
- **Borders**: `--border-color`, `--border-hover`, `--border-active`
- **Spacing**: `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- **Typography**: `--font-size-sm`, `--font-size-md`, `--font-size-lg`

## JavaScript Architecture

### Shared Utilities (`utils.js`)

Common functions used across all pages:
- `showStatus()` - Display status messages
- `closeModal()` - Close modal dialogs
- `setTheme()` / `loadTheme()` - Theme management

### Page-Specific Modules

Each page has its own JavaScript module:
- `cavianUI.js` - Main sequencer UI logic
- `config.js` - Configuration page logic
- `actions.js` - Actions editor logic
- `swing.js` - Swing editor logic

## Development Workflow

### Adding New Features

1. **UI changes**: Modify `css/cavianUI.css` or create new CSS files
2. **Theming**: Add variables to `themes/theme.css`
3. **Logic**: Add functions to appropriate JS module
4. **Shared code**: Add to `js/utils.js` if used across multiple pages

### Testing Themes

1. Open the UI
2. Use the theme dropdown (top-right)
3. Verify all elements use theme colors
4. Check contrast and readability

## Migration Checklist

- [x] Extract CSS to separate file
- [x] Extract JavaScript to separate files
- [x] Implement theme system with CSS variables
- [x] Create theme switcher
- [x] Add multiple theme options
- [x] Refactor config.html
- [x] Refactor upload.html
- [x] Document the structure
- [x] Push branch to GitHub
- [ ] Test all pages with all themes
- [ ] Verify no breaking changes
- [ ] Complete swing.js module
- [ ] Complete actions.js module

## Files Refactored

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| cavianUI.html | 155KB inline | 6.5KB + external refs | -95% |
| config.html | ~21KB inline | 5KB + external refs | -75% |
| upload.html | 302B inline | 3KB + external refs | + overhead but maintainable |

## Total Lines

- **Before**: ~8,500 lines of inline CSS/JS
- **After**: ~1,700 lines in organized files
- **Improvement**: Better maintainability, theming, caching

## Notes

- The original `cavianUI.html` was ~155KB with inline CSS/JS
- The new modular structure is easier to maintain
- Themes can be developed and tested independently
- Individual files can be cached by the browser

## Future Improvements

- Split `cavianUI.js` into smaller modules
- Add CSS variables for animations
- Create theme presets for different use cases
- Add theme export/import functionality
- Implement dark mode detection
