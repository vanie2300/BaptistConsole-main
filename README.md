# Baptist Console

A church presentation suite for projecting **Bible verses** and **hymns** during worship services. Built with Electron and vanilla HTML/CSS/JS.

![Release](https://img.shields.io/badge/Release-v1.0.0-blue) ![Electron](https://img.shields.io/badge/Electron-33-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Dual-tab console** — switch between Bible and Hymn modules with keyboard shortcuts (`1` / `2`).
- **Bible Presenter**
  - Browse books, chapters, and verses from KJV 1611 data.
  - Command bar search: reference search (`John 3:16`) and keyword search across the whole Bible or the current book.
  - Search matches are highlighted in results.
  - Project verses to a secondary display (full-display coverage).
  - Auto-fit text sizing (font grows/shrinks to fill the screen, with a configurable max).
- **Hymn Presenter**
  - Search, add, and delete hymns from a `hymns.json` library.
  - Live preview of current / next slides plus upcoming thumbnails.
  - Smooth auto-fit for verse text and titles (never shrinks below a readable floor).
  - Project slides to a secondary display.
- **Settings modal** — theme (dark/light), presenter colors/font, per-module background images, display toggles, and text-sizing controls. All settings live-update in a preview.
- **Toast notifications** confirm when settings are saved or reset.
- **Presenter status light** — "Live" (green, pulsing) when a projection window is open.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (bundled with Node.js)

### Install & Run

```bash
npm install
npm start
```

### Build Installers

```bash
npm run build:win      # Windows NSIS installer -> dist/
npm run build:linux    # Linux AppImage -> dist/
```

## Usage Guide

### Console tabs

| Key | Action |
| --- | ------ |
| `1` | Switch to Bible tab |
| `2` | Switch to Hymns tab |

### Bible Presenter

| Action | How |
| ------ | --- |
| Pick a verse | Select **Book → Chapter → Verse** from the left panel |
| Reference search | Type e.g. `John 3:16` into the search bar and press **Enter** |
| Keyword search | Open the search dropdown, choose **Keyword**, pick a scope (Whole Bible / Current Book), enter the term, click **Go** |
| Clear search | **Clear Search** in the dropdown, or press `Esc` |
| Project a verse | Click **Display Verse** — opens the projector on the configured display |
| Toggle reference on screen | Settings → Bible Presenter → **Show Verse Reference** |

Search results highlight matching terms; the matched book/chapter/verse is highlighted and auto-scrolled in the list.

### Hymn Presenter

| Action | How |
| ------ | --- |
| Find a hymn | Type in the search box — matching titles are filtered and the search term is highlighted |
| Select a hymn | Click a row — slides render in the center preview with upcoming thumbnails on the right |
| Navigate slides | `←` / `→` arrow keys (when not typing) or the on-screen buttons |
| Present | Click **Present** — opens the projection window on the chosen display |
| Add a hymn | **+ Add Hymn** → fill title, verses, optional chorus → **Save Hymn** (persists to `hymns.json`) |
| Delete a hymn | Select it, click **Delete Hymn** |

### Presenter Window (shared)

- Opens **focused**, filling the full bounds of the selected display.
- Windows are **normal** windows — use native **Alt+Tab** to switch between the projection, PowerPoint, and the console.
- `Esc` (while the console has focus) closes all presenter windows.
- Minimizing or hiding a presenter window closes it (by design).

## Settings

Accessed via the **Settings** button in the top bar.

### Theme
- Dark / Light theme; applies app-wide.
- **Presenter Colors** — background, text color, weight, and font for all projections.
- **Live preview** shows how a verse will look.

### Bible Presenter
| Setting | Description |
| ------- | ----------- |
| Max Font Size | Upper ceiling (px) for projected verse auto-fit |
| Reference Size | Scale (50–200%) for the projected verse reference |
| Show Verse Reference | Toggle reference display above projected verse text |
| Background Image | Image + opacity for the Bible projector |

### Hymn Presenter
| Setting | Description |
| ------- | ----------- |
| Text Alignment | Left / Center / Right |
| Text Layout | Full / Compact (70% width) |
| Show Verse Numbers | Toggle "Verse N" labels |
| Title Size | Default title font size (vw) |
| Transition | Slide transition type |
| Background Image | Image + opacity for the Hymn projector |

Changes apply on **Apply Settings** (toast confirms), and **Reset to Defaults** restores defaults (toast confirms).

## Project Structure

```
├── main.js               # Electron main process: windows, displays, IPC, presenter guards
├── preload.js            # Secure IPC bridge (contextIsolation: true)
├── index.html            # Shell: tabs, iframes, settings modal
├── theme.css             # Design tokens (dark + light), imported everywhere
├── theme.js              # Theme apply helper
├── shell.css             # Shell + settings modal styles
├── shell.js              # Tab switching, settings logic, message routing
├── presenter-proxy.js    # In-iframe proxy for presenterApi (displays, hymns I/O)
├── bible/
│   ├── bible_presenter.html   # Bible tab UI
│   ├── bible_presenter.css    # Bible UI styles
│   ├── bible.js               # Bible logic + projection template
│   └── kjv1611.json           # KJV 1611 verse data
└── hymns/
    ├── presenter.html          # Hymns tab UI
    ├── presenter.css           # Hymns UI styles
    ├── presenter.js            # Hymns logic, previews, auto-fit
    ├── presentation.html       # Full-screen projection page
    └── hymns.json              # Hymn library
```

## Architecture Notes

### Process model
- **Main process** (`main.js`) creates the console window, intercepts popups via `setWindowOpenHandler`, and guards presenter windows (Esc-to-close, minimize/hide-to-close). Presenter windows are placed automatically on the configured display.
- **Renderer iframes** — Bible and Hymn tabs are `<iframe>`s inside `index.html` to keep modules isolated.
- **`presenterApi`** — exposed through `preload.js` + `presenter-proxy.js` so iframes can call IPC without touching the filesystem directly.

### Settings flow
1. Settings are stored in `localStorage` under keys in `shell.js` (`KEYS` map).
2. On **Apply**, `pushBibleSettings()` / `pushHymnSettings()` post a `*SettingsUpdate` message to the relevant iframes.
3. Each module applies the setting locally and forwards it to its presenter window via `postMessage`.
4. `settingsUpdate` also carries shared presenter colors, fonts, and (per-module) background images.

### Search
- **Bible** — keyword search builds a flattened index of the current scope and returns matching references with highlighted text (`appendHighlightedText`).
- **Hymns** — title substring filter with case-insensitive match highlighting in the rendered list (`highlightMatch`).

### Auto-fit
- **Bible** — projected text is fit against the viewport: `fitPresenterText` computes size from available space, min/max font bounds, and a display bias. Reference size scales independently via an inline calc applied to the reference element.
- **Hymns** — `slideToHtml` uses fixed base sizes per preview mode; `fitFrameText` shrinks smoothly (0.5px steps) only when overflowing, with a readable floor. Titles use `fitCurrentTitle` with a 4vw minimum.

### Background images
Per-module keys (`settings_bibleBgImage`, `settings_hymnBgImage`) replace the old shared `settings_presenterBgImage`, which is migrated once and then removed so backgrounds no longer leak between modules.

## Keyboard Shortcuts

| Shortcut | Context | Action |
| -------- | ------- | ------ |
| `1` / `2` | Console | Switch Bible / Hymns tab |
| `←` / `→` | Hymns (not typing) | Previous / next slide |
| `Enter` | Hymns (not typing) | Start presentation |
| `Esc` | Console | Close settings modal / search dropdown; close all presentation windows |
| `Ctrl+R` | Dev | Reload (use during development after edits) |

## Data Files

- `bible/kjv1611.json` — read-only verse data.
- `hymns/hymns.json` — hymn library; edited via the app and written back by the main process (`save-hymns` IPC). Diff-friendly (indented 2 spaces).

## Development

```bash
npm start            # Run the app
node --check file.js # Syntax-check any edited JS
```

No build step is required for the renderer — edits to `.html`, `.css`, and `.js` apply on reload.

## License

MIT © Jovanie Cangke