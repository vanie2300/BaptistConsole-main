# Settings Implementation Tracker

## Problem
Only 3 of ~20 settings are actually applied: `theme`, `accent`, `font` (partially).
All other settings are saved to localStorage but have no runtime effect.

## Architecture
- Shell (index.html) hosts bible and hymns as iframes
- Settings stored in localStorage key `baptistSettings`
- Communication to iframes: `postMessage` + `localStorage` storage event listener
- All files share `file://` origin in Electron so localStorage is shared

---

## Files to Modify

### 1. theme.css — CSS variable layer
**What:** Add new CSS variables that `applySettingLive` will control.
- `--radius-sm`, `--radius-md`, `--radius-lg` → map `--radius` to active value
- `--density-padding`, `--density-gap` → spacing scale
- `--font-main` override via inline style on `:root`
- `.no-animations` class → `* { transition: none !important; animation: none !important; }`

### 2. shell.css — Use CSS variables
**What:** Replace hardcoded values with the new variables.
- All `border-radius` values → `var(--radius)`
- Header compact mode class for density
- Body font via `--font-main`

### 3. shell.js — Expand `applySettingLive()` + `applyAllSettings()` + `pushToIframes()`
**What:** Add handlers for every setting.

| Setting | Action |
|---|---|
| `corners` | Set `--radius` on `:root` (small: 6px, medium: 10px, large: 16px) |
| `density` | Toggle `.compact` class on `shell-header`, set spacing variables |
| `animations` | Toggle `.no-animations` on `document.body` |
| `font` | Set `--font-main` on `:root` via `document.documentElement.style` |
| `showVerseNumbers` | Push to bible iframe |
| `highlightVerse` | Push to bible iframe |
| `bibleFontSize` | Push to bible iframe (update presenter font size) |
| `projectionFont` | Push to both iframes |
| `autoScroll` | Push to bible iframe |
| `hymnFontSize` | Push to hymns iframe |
| `showChorusLabels` | Push to hymns iframe |
| `autoSplitStanzas` | Push to hymns iframe (rebuild slides) |
| `aspectRatio` | Push to both iframes |
| `presentationBg` | Push to both iframes |
| `bgColor` | Push to both iframes |
| `screenTransition` | Push to both iframes |

`applyAllSettings()` will call `applySettingLive` for every key in `DEFAULTS`.

`pushToIframes()` will send `{ type: 'settingsUpdate', settings }` message.

### 4. bible/bible.js — Settings message handler
**What:** Add `window.addEventListener('message', ...)` for `settingsUpdate`.

| Setting | How Applied |
|---|---|
| `showVerseNumbers` | Toggle `.verse-row-number` visibility via `display: none` style |
| `highlightVerse` | Toggle `.verse-row.active` highlight (add/remove class) |
| `bibleFontSize` | Update `presenterFontSizePx` variable, push to presenter |
| `projectionFont` | Update `--font-main` on bible iframe `:root`, push to presenter |
| `autoScroll` | Store flag, use in `highlightCurrentVerseRow()` call |

### 5. hymns/presenter.js — Settings message handler
**What:** Add settings handling in `handleMessage` or a new listener.

| Setting | How Applied |
|---|---|
| `hymnFontSize` | Scale the vw-based font sizes by a multiplier derived from hymnFontSize |
| `showChorusLabels` | Toggle `.verse-label` visibility (display: none when off) |
| `autoSplitStanzas` | When off, treat each stanza as one slide (no chunking) |
| `projectionFont` | Set `--font-main` on hymns iframe `:root` |

### 6. hymns/presentation.html — Settings message handler
**What:** Accept `settingsUpdate` messages to apply font/aspect changes live.

| Setting | How Applied |
|---|---|
| `hymnFontSize` | Multiply the autoFitText max/min ranges |
| `projectionFont` | Set `--font-main` on `:root` |
| `showChorusLabels` | Toggle `.slide-label` display |

---

## Implementation Order
1. theme.css (CSS variables)
2. shell.css (wire up variables)
3. shell.js (applySettingLive + pushToIframes)
4. bible/bible.js (message handler)
5. hymns/presenter.js (message handler)
6. hymns/presentation.html (message handler)
7. Syntax check all files

## Status
- [x] theme.css updated
- [x] shell.css updated
- [x] shell.js updated
- [x] bible/bible.js updated
- [x] bible/bible_presenter.css updated
- [x] hymns/presenter.js updated
- [x] hymns/presentation.html updated
- [x] All JS syntax checked
