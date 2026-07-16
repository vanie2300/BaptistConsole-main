# Settings Modal Redesign — Implementation Plan

## Overview
Convert the flat settings popup into a full modal overlay with sidebar-tabbed categories, visual theme preview cards, and a system font picker. All settings are global — theme affects the entire app shell, presenter settings (colors, font, background) affect both Bible and Hymn presenter popups. Settings only push to presenters on Apply.

## Files to Modify

| File | Change |
|---|---|
| `index.html` | Replace `.settings-popup` with full modal (backdrop + dialog + sidebar + panels) |
| `shell.css` | Add modal/sidebar/cards/font-list styles, remove old `.settings-popup-*` styles |
| `shell.js` | Sidebar tab switching, theme card sync, font picker sync, add `KEYS.presenterFont` |
| `bible/bible.js` | Add `--present-font` CSS variable + font in presenter template `applyPresenterSettings()` and `settingsUpdate` handler |
| `hymns/presentation.html` | Same font integration as bible presenter |

## Files to Remove

| File/Folder | Reason |
|---|---|
| `BiblePresent/` | Standalone reference folder — not used by the app (active code is in `bible/`) |
| `HymnPresent/` | Standalone reference folder — not used by the app (active code is in `hymns/`) |
| `mainPage.css` | Legacy CSS — not referenced by any HTML or JS (only listed in `package.json` build files, will also clean that) |
| `SETTINGS-IMPLEMENTATION.md` | Empty file — will be rewritten with this plan |

## Categories (Sidebar Tabs)

| Tab | Controls |
|---|---|
| **Global** | Theme visual preview cards (Dark / Light side-by-side) |
| **Presenter** | Background Color (swatches + custom), Text Color (swatches + custom), Font Weight (dropdown), Font (scrollable system-font list), Background Image (Browse/Clear), Opacity (slider) |
| **Bible** | Max Font Size (range + number input) |

## Modal HTML Structure

```html
<div class="settings-modal" id="settingsModal" hidden>
  <div class="settings-backdrop" id="settingsBackdrop"></div>
  <div class="settings-dialog">
    <nav class="settings-sidebar">
      <button class="settings-sidebar-btn active" data-panel="global">
        <!-- globe/palette icon --> Global
      </button>
      <button class="settings-sidebar-btn" data-panel="presenter">
        <!-- screen icon --> Presenter
      </button>
      <button class="settings-sidebar-btn" data-panel="bible">
        <!-- book icon --> Bible
      </button>
    </nav>
    <div class="settings-main">
      <!-- Global Panel -->
      <div class="settings-panel" data-panel="global">
        <div class="settings-panel-title">Theme</div>
        <div class="theme-cards">
          <div class="theme-card" data-theme="dark">
            <div class="theme-card-check">&#10003;</div>
            <div class="theme-card-preview theme-card-preview--dark">
              <div class="tcp-header"></div>
              <div class="tcp-line tcp-line--long"></div>
              <div class="tcp-line tcp-line--short"></div>
              <div class="tcp-accent"></div>
            </div>
            <div class="theme-card-label">Dark</div>
          </div>
          <div class="theme-card" data-theme="light">
            <div class="theme-card-check">&#10003;</div>
            <div class="theme-card-preview theme-card-preview--light">
              <div class="tcp-header"></div>
              <div class="tcp-line tcp-line--long"></div>
              <div class="tcp-line tcp-line--short"></div>
              <div class="tcp-accent"></div>
            </div>
            <div class="theme-card-label">Light</div>
          </div>
        </div>
      </div>
      <!-- Presenter Panel -->
      <div class="settings-panel" data-panel="presenter" hidden>
        <!-- Background Color -->
        <div class="settings-field">
          <label class="settings-label">Background Color</label>
          <div class="settings-swatches" id="bgSwatches">
            <button class="swatch" data-color="#000000" title="Black" style="background:#000000"></button>
            <button class="swatch" data-color="#1a1a2e" title="Dark Gray" style="background:#1a1a2e"></button>
            <button class="swatch" data-color="#0d1b2a" title="Navy" style="background:#0d1b2a"></button>
            <label class="swatch swatch-custom" title="Custom color">
              <input type="color" id="bgColorPicker" value="#000000" class="swatch-input">
              <span class="swatch-label">+</span>
            </label>
          </div>
        </div>
        <!-- Text Color -->
        <div class="settings-field">
          <label class="settings-label">Text Color</label>
          <div class="settings-swatches" id="textSwatches">
            <button class="swatch" data-color="#ffffff" title="White" style="background:#ffffff"></button>
            <button class="swatch" data-color="#f0f0f0" title="Off-white" style="background:#f0f0f0"></button>
            <button class="swatch" data-color="#ffd700" title="Gold" style="background:#ffd700"></button>
            <label class="swatch swatch-custom" title="Custom color">
              <input type="color" id="textColorPicker" value="#ffffff" class="swatch-input">
              <span class="swatch-label">+</span>
            </label>
          </div>
        </div>
        <!-- Font Weight -->
        <div class="settings-field">
          <label class="settings-label" for="weightSelect">Font Weight</label>
          <select id="weightSelect" class="settings-select">
            <option value="400">Normal</option>
            <option value="600" selected>SemiBold</option>
            <option value="700">Bold</option>
          </select>
        </div>
        <!-- Font Picker -->
        <div class="settings-field">
          <label class="settings-label">Font</label>
          <div class="font-list" id="fontList">
            <!-- Populated by JS — each option rendered in its own typeface -->
          </div>
        </div>
        <!-- Background Image -->
        <div class="settings-field">
          <label class="settings-label">Background Image</label>
          <div class="settings-file-row">
            <span class="settings-file-path" id="bgImagePath">No image selected</span>
            <button class="settings-btn-sm" id="bgImageBrowse">Browse</button>
            <button class="settings-btn-sm settings-btn-clear" id="bgImageClear" hidden>Clear</button>
          </div>
          <div class="settings-field-row" id="bgOpacityRow" hidden>
            <label class="settings-label-sub" for="bgOpacityRange">Opacity</label>
            <input type="range" id="bgOpacityRange" min="10" max="100" step="5" value="30">
            <span class="settings-unit" id="bgOpacityValue">30%</span>
          </div>
        </div>
      </div>
      <!-- Bible Panel -->
      <div class="settings-panel" data-panel="bible" hidden>
        <div class="settings-field">
          <label class="settings-label" for="bibleMaxFont">Max Font Size</label>
          <div class="settings-field-row">
            <input type="range" id="bibleMaxFontRange" min="100" max="800" step="10" value="800">
            <input type="number" id="bibleMaxFont" min="100" max="800" step="10" value="800" class="settings-number">
            <span class="settings-unit">px</span>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-footer">
      <button class="settings-apply-btn" id="settingsApply">Apply</button>
    </div>
  </div>
</div>
```

## Theme Cards — "Global" Panel

- Two cards side by side: **Dark** and **Light**
- Each card is a mini mockup (~120px tall): tiny header bar, 2-3 fake content lines, small accent-color strip
- Dark card uses dark theme colors (#171717 bg, #d8d8d8 text, #4169E1 accent)
- Light card uses light theme colors (#ffffff bg, #212529 text, #3368C4 accent)
- Selected card: primary border + checkmark icon in top-right corner
- Clicking saves `globalTheme` via `window.Theme.apply()` — applies instantly to entire app

## Font Picker — System Fonts

Stored in `settings_presenterFont` localStorage key, pushed to presenters on Apply.

| Font Name | CSS Value |
|---|---|
| Segoe UI | `'Segoe UI', system-ui, sans-serif` |
| Arial | `Arial, sans-serif` |
| Verdana | `Verdana, sans-serif` |
| Trebuchet MS | `'Trebuchet MS', sans-serif` |
| Georgia | `Georgia, serif` |
| Times New Roman | `'Times New Roman', serif` |
| Palatino Linotype | `'Palatino Linotype', serif` |
| Courier New | `'Courier New', monospace` |

- Scrollable vertical list (`max-height: 220px, overflow-y: auto`)
- Each row: font name rendered in that font (~36px tall, rounded border)
- Active font: primary border + bg tint
- Default: Segoe UI

## CSS Additions (shell.css)

```css
/* Modal Overlay */
.settings-modal { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; }
.settings-modal[hidden] { display: none; }
.settings-backdrop { position: fixed; inset: 0; background: var(--overlay); }

/* Dialog */
.settings-dialog { position: relative; width: 560px; max-height: 80vh; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-xl); display: flex; overflow: hidden; animation: modalIn 0.15s ease; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

/* Sidebar */
.settings-sidebar { width: 160px; border-right: 1px solid var(--border); padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.settings-sidebar-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: transparent; color: var(--text-secondary); font-family: inherit; font-size: 0.82rem; font-weight: 500; border-radius: var(--radius); cursor: pointer; text-align: left; transition: all 0.15s ease; }
.settings-sidebar-btn:hover { background: var(--surface-muted); color: var(--text); }
.settings-sidebar-btn.active { background: var(--primary-14); color: var(--primary); font-weight: 600; }

/* Main Content */
.settings-main { flex: 1; overflow-y: auto; padding: 20px; }
.settings-panel { display: flex; flex-direction: column; gap: 20px; }
.settings-panel-title { font-size: 0.88rem; font-weight: 600; color: var(--text); margin-bottom: 4px; }

/* Theme Cards */
.theme-cards { display: flex; gap: 12px; }
.theme-card { flex: 1; border: 2px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color 0.15s ease; position: relative; }
.theme-card:hover { border-color: var(--text-muted); }
.theme-card.active { border-color: var(--primary); }
.theme-card-check { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s ease; z-index: 1; }
.theme-card.active .theme-card-check { opacity: 1; }
.theme-card-preview { padding: 12px; height: 120px; display: flex; flex-direction: column; gap: 6px; }
.theme-card-preview--dark { background: #171717; }
.theme-card-preview--light { background: #ffffff; }
.tcp-header { height: 12px; border-radius: 3px; }
.theme-card-preview--dark .tcp-header { background: #262626; }
.theme-card-preview--light .tcp-header { background: #dee2e6; }
.tcp-line { height: 6px; border-radius: 2px; }
.tcp-line--long { width: 80%; }
.tcp-line--short { width: 50%; }
.theme-card-preview--dark .tcp-line { background: #404040; }
.theme-card-preview--light .tcp-line { background: #dee2e6; }
.tcp-accent { height: 4px; width: 40%; border-radius: 2px; margin-top: auto; }
.theme-card-preview--dark .tcp-accent { background: #4169E1; }
.theme-card-preview--light .tcp-accent { background: #3368C4; }
.theme-card-label { padding: 8px 12px; font-size: 0.78rem; font-weight: 500; color: var(--text-secondary); text-align: center; }
.theme-card-preview--dark + .theme-card-label, .theme-card[data-theme="dark"] .theme-card-label { background: #171717; }
.theme-card[data-theme="light"] .theme-card-label { background: #ffffff; color: #5c5f66; }

/* Font List */
.font-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; }
.font-option { padding: 8px 12px; border: 1px solid transparent; border-radius: 8px; cursor: pointer; font-size: 0.9rem; color: var(--text); transition: all 0.15s ease; }
.font-option:hover { background: var(--surface-muted); }
.font-option.active { border-color: var(--primary); background: var(--primary-14); color: var(--primary); }

/* Footer */
.settings-footer { padding: 12px 20px; border-top: 1px solid var(--border); }
```

## shell.js Changes

### New storage keys
```js
KEYS.presenterFont = 'settings_presenterFont';
DEFAULTS.presenterFont = 'Segoe UI, system-ui, sans-serif';
```

### collectPresenterSettings() — add font field
```js
function collectPresenterSettings() {
  return {
    bg: loadSetting(KEYS.presenterBg, DEFAULTS.presenterBg),
    text: loadSetting(KEYS.presenterText, DEFAULTS.presenterText),
    weight: loadSetting(KEYS.presenterWeight, DEFAULTS.presenterWeight),
    font: loadSetting(KEYS.presenterFont, DEFAULTS.presenterFont),
    bgImage: loadSetting(KEYS.presenterBgImage, DEFAULTS.presenterBgImage),
    bgOpacity: Number(loadSetting(KEYS.presenterBgOpacity, DEFAULTS.presenterBgOpacity)),
  };
}
```

### Sidebar tab switching
```js
const sidebarBtns = document.querySelectorAll('.settings-sidebar-btn');
const panels = document.querySelectorAll('.settings-panel');
sidebarBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sidebarBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    panels.forEach(p => p.hidden = p.dataset.panel !== btn.dataset.panel);
  });
});
```

### Theme cards
```js
const themeCards = document.querySelectorAll('.theme-card');
function syncThemeCards() {
  const current = window.Theme.current();
  themeCards.forEach(c => c.classList.toggle('active', c.dataset.theme === current));
}
themeCards.forEach(card => {
  card.addEventListener('click', () => {
    window.Theme.apply(card.dataset.theme);
    syncThemeCards();
  });
});
```

### Font list (populated by JS)
```js
const FONTS = [
  { name: 'Segoe UI', value: "'Segoe UI', system-ui, sans-serif" },
  { name: 'Arial', value: "Arial, sans-serif" },
  { name: 'Verdana', value: "Verdana, sans-serif" },
  { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { name: 'Georgia', value: "Georgia, serif" },
  { name: 'Times New Roman', value: "'Times New Roman', serif" },
  { name: 'Palatino Linotype', value: "'Palatino Linotype', serif" },
  { name: 'Courier New', value: "'Courier New', monospace" },
];
const fontList = document.getElementById('fontList');
FONTS.forEach(f => {
  const div = document.createElement('div');
  div.className = 'font-option';
  div.dataset.value = f.value;
  div.style.fontFamily = f.value;
  div.textContent = f.name;
  fontList.appendChild(div);
});
fontList.addEventListener('click', (e) => {
  const opt = e.target.closest('.font-option');
  if (!opt) return;
  saveSetting(KEYS.presenterFont, opt.dataset.value);
  fontList.querySelectorAll('.font-option').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');
});
function syncFontList() {
  const current = loadSetting(KEYS.presenterFont, DEFAULTS.presenterFont);
  fontList.querySelectorAll('.font-option').forEach(o => o.classList.toggle('active', o.dataset.value === current));
}
```

### Modal open/close
```js
// Replace settingsBtn click to open modal instead of popup
settingsBtn.addEventListener('click', () => {
  settingsModal.hidden = false;
  syncAllSettingsUI();
});
settingsBackdrop.addEventListener('click', () => { settingsModal.hidden = true; });
// Apply closes modal
settingsApply.addEventListener('click', () => {
  pushSettingsToIframes();
  pushBibleMaxFont();
  settingsModal.hidden = true;
});
```

### syncAllSettingsUI() — add font + theme card sync
```js
function syncAllSettingsUI() {
  syncThemeCards();
  syncBgColorUI();
  syncTextColorUI();
  syncWeightUI();
  syncFontList();
  syncBgImageUI();
  syncBibleMaxFontUI(loadSetting(KEYS.bibleFontMax, DEFAULTS.bibleMaxFont));
}
```

## Presenter Font Integration

### bible/bible.js — presenter template CSS
Add to `:root` in the template:
```css
--present-font: ${(() => { try { return localStorage.getItem('settings_presenterFont') || "'Segoe UI', system-ui, sans-serif"; } catch { return "'Segoe UI', system-ui, sans-serif"; } })()};
```

Apply to text elements:
```css
body { font-family: var(--present-font); }
#presentText { font-family: var(--present-font); }
```

In `applyPresenterSettings(s)`:
```js
if (s.font) {
  root.style.setProperty('--present-font', s.font);
  var textEl = document.getElementById('presentText');
  if (textEl) textEl.style.fontFamily = s.font;
}
```

### hymns/presentation.html — same integration
Add to `<head>` script:
```js
var font = localStorage.getItem('settings_presenterFont');
if (font) document.documentElement.style.setProperty('--present-font', font);
```

In `applyPresenterSettings()`:
```js
if (s.font) root.style.setProperty('--present-font', s.font);
```

In CSS:
```css
:root { --present-font: 'Segoe UI', system-ui, sans-serif; }
body { font-family: var(--present-font); }
```

## Execution Order
1. Write this plan to `SETTINGS-IMPLEMENTATION.md`
2. Remove unused files: `BiblePresent/`, `HymnPresent/`, `mainPage.css`; clean `package.json` build files list
3. Replace settings popup HTML in `index.html` with full modal structure
4. Replace settings CSS in `shell.css` — remove `.settings-popup-*`, add modal/sidebar/cards/font styles
5. Update `shell.js` — sidebar logic, theme cards, font picker, add font to `collectPresenterSettings()`
6. Update `bible/bible.js` — font variable in presenter template
7. Update `hymns/presentation.html` — font integration
8. Syntax check all JS files
