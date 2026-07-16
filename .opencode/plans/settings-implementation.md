# Settings Implementation Plan

## 7 Settings in the Popup

| # | Setting | UI | Default | localStorage Key |
|---|---------|-----|---------|-----------------|
| 1 | Theme | Dropdown: Dark / Light | Dark | `globalTheme` |
| 2 | Presenter Background | Color presets + picker | `#000000` | `settings_presenterBg` |
| 3 | Presenter Text Color | Color presets + picker | `#ffffff` | `settings_presenterText` |
| 4 | Presenter Font Weight | Dropdown: Normal / SemiBold / Bold | SemiBold (600) | `settings_presenterWeight` |
| 5 | Background Image | File path + Browse/Clear buttons | None | `settings_presenterBgImage` |
| 6 | Image Opacity | Slider 10–100% (visible when image set) | 30% | `settings_presenterBgOpacity` |
| 7 | Bible Max Font Size | Range + number (existing) | 800 | `biblePresenterFontMax` |

## Background Image Behavior
- Image **replaces** the solid background color when set
- Clearing the image reverts to solid color
- Opacity slider controls how dim the image is (lower = more dim / more readable text)
- File picker uses Electron's native dialog (`dialog.showOpenDialog`)
- File path stored as absolute path in localStorage
- `preload.js` exposes `pickBackgroundImage()` via `ipcRenderer.invoke`

## IPC for File Picker
New in `main.js`:
- `ipcMain.handle('pick-background-image')` — opens native file dialog filtered to image types (jpg, jpeg, png, gif, webp, bmp), returns file path

New in `preload.js`:
- `pickBackgroundImage: () => ipcRenderer.invoke('pick-background-image')` added to the `presenterApi` bridge

## How Settings Reach Presenters

### Bible presenter (inline HTML in `bible.js`):
- On open: inject all settings (bg, text, weight, image path, opacity) into the template literal
- On live update: `postMessage({ type: 'settingsUpdate', ... })` to the presenter window
- Background image applied via `::before` pseudo-element with `background-image` and opacity

### Hymn presenter (`presentation.html`):
- On load: read all settings from `localStorage`
- On live update: `postMessage({ type: 'settingsUpdate', ... })`
- Same `::before` pseudo-element approach for image + opacity

## CSS for Background Image (in both presenters)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: var(--present-bg-image);
  background-size: cover;
  background-position: center;
  opacity: var(--present-bg-opacity, 0.3);
  z-index: -1;
  pointer-events: none;
}
body {
  background-color: var(--present-bg);
}
```

## Files to Change (in order)

1. `index.html` — Add background image section (file path + Browse/Clear + opacity slider) to settings popup
2. `shell.css` — Style color swatches, file path display, Browse/Clear buttons, opacity slider
3. `preload.js` — Expose `pickBackgroundImage()` in the API bridge
4. `main.js` — Add `pick-background-image` IPC handler with native file dialog
5. `shell.js` — Settings load/save/apply logic for all 6 settings, iframe messaging, Browse/Clear button wiring
6. `bible/bible.js` — Consume all settings in the inline presenter template (bg, text, weight, image, opacity)
7. `hymns/presentation.html` — Read settings from localStorage and listen for updates
8. Syntax check all files
