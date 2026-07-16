(() => {
  // ── Tab Switching ──
  const tabs = document.querySelectorAll('.tab');
  const bibleFrame = document.getElementById('bible-frame');
  const hymnFrame = document.getElementById('hymn-frame');
  const indicator = document.getElementById('tabIndicator');
  const activeModuleLabel = document.getElementById('activeModule');

  if (!bibleFrame || !hymnFrame || !indicator || !activeModuleLabel) {
    console.error('Required DOM elements missing');
    return;
  }

  const modules = {
    bible: { frame: bibleFrame, label: 'Bible' },
    hymns: { frame: hymnFrame, label: 'Hymns' },
  };

  let currentTab = 'bible';

  function switchTab(tabId) {
    if (tabId === currentTab) return;
    currentTab = tabId;

    tabs.forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });

    Object.entries(modules).forEach(([id, mod]) => {
      mod.frame.hidden = id !== tabId;
    });

    activeModuleLabel.textContent = modules[tabId].label;
    moveIndicator(document.querySelector(`.tab[data-tab="${tabId}"]`));
  }

  function moveIndicator(tabEl) {
    if (!tabEl) return;
    const bar = document.getElementById('tabBar');
    if (!bar) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    indicator.style.left = (tabRect.left - barRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  requestAnimationFrame(() => {
    moveIndicator(document.querySelector('.tab.active'));
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '1') switchTab('bible');
      if (e.key === '2') switchTab('hymns');
      if (e.key === 'Escape') {
        const modal = document.getElementById('settingsModal');
        if (modal && !modal.hidden) modal.hidden = true;
      }
    }
  });

  // ── Settings ──
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsBackdrop = document.getElementById('settingsBackdrop');

  // Storage keys
  const KEYS = {
    theme: 'globalTheme',
    presenterBg: 'settings_presenterBg',
    presenterText: 'settings_presenterText',
    presenterWeight: 'settings_presenterWeight',
    presenterFont: 'settings_presenterFont',
    presenterBgImage: 'settings_presenterBgImage',
    presenterBgOpacity: 'settings_presenterBgOpacity',
    bibleFontMax: 'biblePresenterFontMax',
    bibleShowRef: 'settings_bibleShowRef',
    hymnAlign: 'settings_hymnAlign',
    hymnLayout: 'settings_hymnLayout',
    hymnShowNumbers: 'settings_hymnShowNumbers',
    hymnTitleSize: 'settings_hymnTitleSize',
  };

  const DEFAULTS = {
    theme: 'dark',
    presenterBg: '#000000',
    presenterText: '#ffffff',
    presenterWeight: '600',
    presenterFont: "'Segoe UI', system-ui, sans-serif",
    presenterBgImage: '',
    presenterBgOpacity: 30,
    bibleFontMax: 800,
    bibleShowRef: 'true',
    hymnAlign: 'left',
    hymnLayout: 'full',
    hymnShowNumbers: 'true',
    hymnTitleSize: '7',
  };

  function loadSetting(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null || stored === '') return fallback;
      return stored;
    } catch { return fallback; }
  }

  function saveSetting(key, value) {
    localStorage.setItem(key, String(value));
  }

  // ── Color Palettes ──
  const PALETTES = [
    { id: 'classic',   name: 'Classic',      bg: '#000000', text: '#ffffff' },
    { id: 'midnight',  name: 'Midnight',     bg: '#0a0a1a', text: '#e0e0ff' },
    { id: 'navy',      name: 'Navy',         bg: '#0d1b2a', text: '#ffffff' },
    { id: 'deep-blue', name: 'Deep Blue',    bg: '#1b2838', text: '#e8ecf0' },
    { id: 'cathedral', name: 'Cathedral',    bg: '#1a1a2e', text: '#f5f5f5' },
    { id: 'royal',     name: 'Royal',        bg: '#1a0a2e', text: '#e8d5ff' },
    { id: 'wine',      name: 'Wine',         bg: '#2a0a0a', text: '#ffe8e8' },
    { id: 'forest',    name: 'Forest',       bg: '#0a1a0d', text: '#e0ffe8' },
    { id: 'warm-gold', name: 'Warm Gold',    bg: '#1a1400', text: '#ffd700' },
    { id: 'slate',     name: 'Slate',        bg: '#1e293b', text: '#f1f5f9' },
    { id: 'ember',     name: 'Ember',        bg: '#1c1008', text: '#fbbf24' },
    { id: 'arctic',    name: 'Arctic',       bg: '#f0f4f8', text: '#1e293b' },
    { id: 'cream',     name: 'Cream',        bg: '#faf8f0', text: '#2d2a1e' },
    { id: 'rosewood',  name: 'Rosewood',     bg: '#2d1b2e', text: '#f5e6f5' },
    { id: 'ocean',     name: 'Ocean',        bg: '#0c1929', text: '#7dd3fc' },
    { id: 'pure',      name: 'Pure White',   bg: '#ffffff', text: '#1a1a1a' },
  ];

  let activePaletteId = null;

  const paletteGrid = document.getElementById('paletteGrid');

  function buildPaletteGrid() {
    if (!paletteGrid) return;
    paletteGrid.innerHTML = '';
    PALETTES.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'palette-card';
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="palette-card-check">&#10003;</div>
        <div class="palette-preview" style="background:${p.bg}; color:${p.text}">
          <span class="palette-preview-text">The Lord is my shepherd</span>
        </div>
        <div class="palette-label">${p.name}</div>
      `;
      paletteGrid.appendChild(card);
    });
  }

  function syncPaletteGrid() {
    if (!paletteGrid) return;
    const bg = loadSetting(KEYS.presenterBg, DEFAULTS.presenterBg);
    const text = loadSetting(KEYS.presenterText, DEFAULTS.presenterText);
    activePaletteId = null;
    PALETTES.forEach((p) => {
      if (p.bg === bg && p.text === text) activePaletteId = p.id;
    });
    paletteGrid.querySelectorAll('.palette-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.id === activePaletteId);
    });
  }

  if (paletteGrid) {
    buildPaletteGrid();
    paletteGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.palette-card');
      if (!card) return;
      const palette = PALETTES.find((p) => p.id === card.dataset.id);
      if (!palette) return;
      saveSetting(KEYS.presenterBg, palette.bg);
      saveSetting(KEYS.presenterText, palette.text);
      syncBgColorUI();
      syncTextColorUI();
      syncPaletteGrid();
      syncPreview();
    });
  }

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

  function pushSettingsToIframes() {
    const s = collectPresenterSettings();
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'settingsUpdate', ...s }, '*');
      } catch (e) {}
    });
  }

  function pushBibleMaxFont() {
    const val = Number(loadSetting(KEYS.bibleFontMax, DEFAULTS.bibleFontMax));
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'bibleMaxFontUpdate', maxFont: val }, '*');
      } catch (e) {}
    });
  }

  function pushBibleSettings() {
    const showRef = loadSetting(KEYS.bibleShowRef, DEFAULTS.bibleShowRef) === 'true';
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'bibleSettingsUpdate', showRef }, '*');
      } catch (e) {}
    });
  }

  function pushHymnSettings() {
    const s = {
      type: 'hymnSettingsUpdate',
      align: loadSetting(KEYS.hymnAlign, DEFAULTS.hymnAlign),
      layout: loadSetting(KEYS.hymnLayout, DEFAULTS.hymnLayout),
      showNumbers: loadSetting(KEYS.hymnShowNumbers, DEFAULTS.hymnShowNumbers) === 'true',
      titleSize: Number(loadSetting(KEYS.hymnTitleSize, DEFAULTS.hymnTitleSize)),
    };
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        frame.contentWindow?.postMessage(s, '*');
      } catch (e) {}
    });
  }

  // ── Sidebar Tabs ──
  const sidebarBtns = document.querySelectorAll('.settings-sidebar-btn');
  const panels = document.querySelectorAll('.settings-panel');

  sidebarBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      sidebarBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== btn.dataset.panel;
      });
    });
  });

  // ── Theme Cards ──
  const themeCards = document.querySelectorAll('.theme-card');

  function syncThemeCards() {
    const current = window.Theme ? window.Theme.current() : loadSetting(KEYS.theme, DEFAULTS.theme);
    themeCards.forEach((c) => c.classList.toggle('active', c.dataset.theme === current));
  }

  themeCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (window.Theme) window.Theme.apply(card.dataset.theme);
      syncThemeCards();
    });
  });

  // ── Presenter Background Color ──
  const bgSwatches = document.getElementById('bgSwatches');
  const bgColorPicker = document.getElementById('bgColorPicker');

  function syncBgColorUI() {
    const current = loadSetting(KEYS.presenterBg, DEFAULTS.presenterBg);
    if (bgColorPicker) bgColorPicker.value = current;
    if (bgSwatches) {
      bgSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
        s.classList.toggle('active', s.dataset.color === current);
      });
    }
  }

  if (bgSwatches) {
    bgSwatches.querySelectorAll('.swatch[data-color]').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        saveSetting(KEYS.presenterBg, color);
        syncBgColorUI();
        syncPaletteGrid();
        syncPreview();
      });
    });
  }

  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', () => {
      saveSetting(KEYS.presenterBg, bgColorPicker.value);
      if (bgSwatches) {
        bgSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
          s.classList.remove('active');
        });
      }
      syncPaletteGrid();
      syncPreview();
    });
  }

  // ── Presenter Text Color ──
  const textSwatches = document.getElementById('textSwatches');
  const textColorPicker = document.getElementById('textColorPicker');

  function syncTextColorUI() {
    const current = loadSetting(KEYS.presenterText, DEFAULTS.presenterText);
    if (textColorPicker) textColorPicker.value = current;
    if (textSwatches) {
      textSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
        s.classList.toggle('active', s.dataset.color === current);
      });
    }
  }

  if (textSwatches) {
    textSwatches.querySelectorAll('.swatch[data-color]').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        saveSetting(KEYS.presenterText, color);
        syncTextColorUI();
        syncPaletteGrid();
        syncPreview();
      });
    });
  }

  if (textColorPicker) {
    textColorPicker.addEventListener('input', () => {
      saveSetting(KEYS.presenterText, textColorPicker.value);
      if (textSwatches) {
        textSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
          s.classList.remove('active');
        });
      }
      syncPaletteGrid();
      syncPreview();
    });
  }

  // ── Presenter Font Weight ──
  const weightSelect = document.getElementById('weightSelect');

  function syncWeightUI() {
    const current = loadSetting(KEYS.presenterWeight, DEFAULTS.presenterWeight);
    if (weightSelect) weightSelect.value = current;
  }

  if (weightSelect) {
    syncWeightUI();
    weightSelect.addEventListener('change', () => {
      saveSetting(KEYS.presenterWeight, weightSelect.value);
      syncPreview();
    });
  }

  // ── Font Picker (system fonts) ──
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

  function buildFontList() {
    if (!fontList) return;
    FONTS.forEach((f) => {
      const div = document.createElement('div');
      div.className = 'font-option';
      div.dataset.value = f.value;
      div.style.fontFamily = f.value;
      div.textContent = f.name;
      fontList.appendChild(div);
    });
  }

  function syncFontList() {
    if (!fontList) return;
    const current = loadSetting(KEYS.presenterFont, DEFAULTS.presenterFont);
    fontList.querySelectorAll('.font-option').forEach((o) => {
      o.classList.toggle('active', o.dataset.value === current);
    });
  }

  if (fontList) {
    buildFontList();
    fontList.addEventListener('click', (e) => {
      const opt = e.target.closest('.font-option');
      if (!opt) return;
      saveSetting(KEYS.presenterFont, opt.dataset.value);
      fontList.querySelectorAll('.font-option').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      syncPreview();
    });
  }

  // ── Background Image ──
  const bgImagePath = document.getElementById('bgImagePath');
  const bgImageBrowse = document.getElementById('bgImageBrowse');
  const bgImageClear = document.getElementById('bgImageClear');
  const bgOpacityRow = document.getElementById('bgOpacityRow');
  const bgOpacityRange = document.getElementById('bgOpacityRange');
  const bgOpacityValue = document.getElementById('bgOpacityValue');

  function syncBgImageUI() {
    const imgPath = loadSetting(KEYS.presenterBgImage, DEFAULTS.presenterBgImage);
    const opacity = Number(loadSetting(KEYS.presenterBgOpacity, DEFAULTS.presenterBgOpacity));

    if (bgImagePath) {
      if (imgPath) {
        const parts = imgPath.replace(/\\/g, '/').split('/');
        bgImagePath.textContent = parts[parts.length - 1];
        bgImagePath.classList.add('has-image');
      } else {
        bgImagePath.textContent = 'No image selected';
        bgImagePath.classList.remove('has-image');
      }
    }

    if (bgImageClear) bgImageClear.hidden = !imgPath;
    if (bgOpacityRow) bgOpacityRow.hidden = !imgPath;
    if (bgOpacityRange) bgOpacityRange.value = opacity;
    if (bgOpacityValue) bgOpacityValue.textContent = opacity + '%';
  }

  if (bgImageBrowse) {
    bgImageBrowse.addEventListener('click', async () => {
      const api = window.presenterApi;
      if (!api || !api.pickBackgroundImage) {
        alert('File picker not available.');
        return;
      }
      const filePath = await api.pickBackgroundImage();
      if (filePath) {
        saveSetting(KEYS.presenterBgImage, filePath);
        syncBgImageUI();
      }
    });
  }

  if (bgImageClear) {
    bgImageClear.addEventListener('click', () => {
      saveSetting(KEYS.presenterBgImage, '');
      syncBgImageUI();
    });
  }

  if (bgOpacityRange) {
    bgOpacityRange.addEventListener('input', () => {
      const val = Number(bgOpacityRange.value);
      if (bgOpacityValue) bgOpacityValue.textContent = val + '%';
    });
    bgOpacityRange.addEventListener('change', () => {
      const val = Number(bgOpacityRange.value);
      saveSetting(KEYS.presenterBgOpacity, val);
    });
  }

  // ── Bible Max Font Size ──
  const bibleMaxFontInput = document.getElementById('bibleMaxFont');
  const bibleMaxFontRange = document.getElementById('bibleMaxFontRange');

  function syncBibleMaxFontUI(val) {
    if (bibleMaxFontInput) bibleMaxFontInput.value = val;
    if (bibleMaxFontRange) bibleMaxFontRange.value = val;
  }

  function applyBibleMaxFont(val) {
    const clamped = Math.min(800, Math.max(100, Number(val) || DEFAULTS.bibleFontMax));
    saveSetting(KEYS.bibleFontMax, clamped);
    syncBibleMaxFontUI(clamped);
  }

  if (bibleMaxFontInput) {
    bibleMaxFontInput.addEventListener('change', () => {
      const val = Number(bibleMaxFontInput.value) || DEFAULTS.bibleFontMax;
      applyBibleMaxFont(val);
    });
  }

  if (bibleMaxFontRange) {
    bibleMaxFontRange.addEventListener('input', () => {
      const val = Number(bibleMaxFontRange.value) || DEFAULTS.bibleFontMax;
      if (bibleMaxFontInput) bibleMaxFontInput.value = val;
    });
    bibleMaxFontRange.addEventListener('change', () => {
      const val = Number(bibleMaxFontRange.value) || DEFAULTS.bibleFontMax;
      applyBibleMaxFont(val);
    });
  }

  // ── Bible Show Reference ──
  const bibleShowRef = document.getElementById('bibleShowRef');

  function syncBibleShowRefUI() {
    const current = loadSetting(KEYS.bibleShowRef, DEFAULTS.bibleShowRef) === 'true';
    if (bibleShowRef) bibleShowRef.checked = current;
  }

  if (bibleShowRef) {
    syncBibleShowRefUI();
    bibleShowRef.addEventListener('change', () => {
      saveSetting(KEYS.bibleShowRef, String(bibleShowRef.checked));
    });
  }

  // ── Hymn Text Alignment ──
  const hymnAlignGroup = document.getElementById('hymnAlignGroup');

  function syncHymnAlignUI() {
    const current = loadSetting(KEYS.hymnAlign, DEFAULTS.hymnAlign);
    if (hymnAlignGroup) {
      hymnAlignGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === current);
      });
    }
  }

  if (hymnAlignGroup) {
    hymnAlignGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveSetting(KEYS.hymnAlign, btn.dataset.value);
        syncHymnAlignUI();
      });
    });
  }

  // ── Hymn Slide Layout ──
  const hymnLayoutGroup = document.getElementById('hymnLayoutGroup');

  function syncHymnLayoutUI() {
    const current = loadSetting(KEYS.hymnLayout, DEFAULTS.hymnLayout);
    if (hymnLayoutGroup) {
      hymnLayoutGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === current);
      });
    }
  }

  if (hymnLayoutGroup) {
    hymnLayoutGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveSetting(KEYS.hymnLayout, btn.dataset.value);
        syncHymnLayoutUI();
      });
    });
  }

  // ── Hymn Show Verse Numbers ──
  const hymnShowNumbers = document.getElementById('hymnShowNumbers');

  function syncHymnShowNumbersUI() {
    const current = loadSetting(KEYS.hymnShowNumbers, DEFAULTS.hymnShowNumbers) === 'true';
    if (hymnShowNumbers) hymnShowNumbers.checked = current;
  }

  if (hymnShowNumbers) {
    syncHymnShowNumbersUI();
    hymnShowNumbers.addEventListener('change', () => {
      saveSetting(KEYS.hymnShowNumbers, String(hymnShowNumbers.checked));
    });
  }

  // ── Hymn Title Font Size ──
  const hymnTitleSize = document.getElementById('hymnTitleSize');
  const hymnTitleSizeValue = document.getElementById('hymnTitleSizeValue');

  function syncHymnTitleSizeUI() {
    const current = loadSetting(KEYS.hymnTitleSize, DEFAULTS.hymnTitleSize);
    if (hymnTitleSize) hymnTitleSize.value = current;
    if (hymnTitleSizeValue) hymnTitleSizeValue.textContent = current + 'vw';
  }

  if (hymnTitleSize) {
    syncHymnTitleSizeUI();
    hymnTitleSize.addEventListener('input', () => {
      if (hymnTitleSizeValue) hymnTitleSizeValue.textContent = hymnTitleSize.value + 'vw';
    });
    hymnTitleSize.addEventListener('change', () => {
      saveSetting(KEYS.hymnTitleSize, hymnTitleSize.value);
    });
  }

  // ── Segmented Controls (generic) ──
  document.querySelectorAll('.settings-segmented').forEach((group) => {
    group.querySelectorAll('.settings-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.settings-seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // ── Sync All Settings UI ──
  function syncAllSettingsUI() {
    syncThemeCards();
    syncBgColorUI();
    syncTextColorUI();
    syncPaletteGrid();
    syncWeightUI();
    syncFontList();
    syncBgImageUI();
    syncBibleMaxFontUI(loadSetting(KEYS.bibleFontMax, DEFAULTS.bibleFontMax));
    syncBibleShowRefUI();
    syncHymnAlignUI();
    syncHymnLayoutUI();
    syncHymnShowNumbersUI();
    syncHymnTitleSizeUI();
    syncPreview();
  }

  // ── Live Preview ──
  const previewVerse = document.getElementById('previewVerse');
  const previewRef = document.getElementById('previewRef');
  const previewBgDot = document.getElementById('previewBgDot');
  const previewBgLabel = document.getElementById('previewBgLabel');
  const previewTextDot = document.getElementById('previewTextDot');
  const previewTextLabel = document.getElementById('previewTextLabel');
  const previewFontLabel = document.getElementById('previewFontLabel');
  const settingsPreview = document.getElementById('settingsPreview');

  const biblePanelPreview = document.getElementById('biblePanelPreview');
  const biblePreviewVerse = document.getElementById('biblePreviewVerse');
  const biblePreviewRef = document.getElementById('biblePreviewRef');
  const hymnPanelPreview = document.getElementById('hymnPanelPreview');
  const hymnPreviewVerse = document.getElementById('hymnPreviewVerse');
  const hymnPreviewTitle = document.getElementById('hymnPreviewTitle');

  const COLOR_NAMES = {
    '#000000': 'Black',
    '#1a1a2e': 'Dark Gray',
    '#0d1b2a': 'Navy',
    '#1b2838': 'Deep Blue',
    '#ffffff': 'White',
    '#f0f0f0': 'Off-white',
    '#ffd700': 'Gold',
    '#e8e8e8': 'Light Gray',
  };

  const FONT_DISPLAY_NAMES = {
    "'Segoe UI', system-ui, sans-serif": 'Segoe UI',
    "Arial, sans-serif": 'Arial',
    "Verdana, sans-serif": 'Verdana',
    "'Trebuchet MS', sans-serif": 'Trebuchet MS',
    "Georgia, serif": 'Georgia',
    "'Times New Roman', serif": 'Times New Roman',
    "'Palatino Linotype', serif": 'Palatino',
    "'Courier New', monospace": 'Courier New',
  };

  function syncPreview() {
    const bg = loadSetting(KEYS.presenterBg, DEFAULTS.presenterBg);
    const text = loadSetting(KEYS.presenterText, DEFAULTS.presenterText);
    const font = loadSetting(KEYS.presenterFont, DEFAULTS.presenterFont);
    const weight = loadSetting(KEYS.presenterWeight, DEFAULTS.presenterWeight);

    if (settingsPreview) {
      settingsPreview.style.background = bg;
      settingsPreview.style.color = text;
    }
    if (previewVerse) {
      previewVerse.style.fontFamily = font;
      previewVerse.style.fontWeight = weight;
    }
    if (previewBgDot) previewBgDot.style.background = bg;
    if (previewBgLabel) previewBgLabel.textContent = COLOR_NAMES[bg] || 'Custom';
    if (previewTextDot) previewTextDot.style.background = text;
    if (previewTextLabel) previewTextLabel.textContent = COLOR_NAMES[text] || 'Custom';
    if (previewFontLabel) previewFontLabel.textContent = FONT_DISPLAY_NAMES[font] || 'Custom';

    if (biblePanelPreview) {
      biblePanelPreview.style.background = bg;
      biblePanelPreview.style.color = text;
    }
    if (biblePreviewVerse) {
      biblePreviewVerse.style.fontFamily = font;
      biblePreviewVerse.style.fontWeight = weight;
    }

    if (hymnPanelPreview) {
      hymnPanelPreview.style.background = bg;
      hymnPanelPreview.style.color = text;
    }
    if (hymnPreviewVerse) {
      hymnPreviewVerse.style.fontFamily = font;
      hymnPreviewVerse.style.fontWeight = weight;
    }
    if (hymnPreviewTitle) {
      hymnPreviewTitle.style.fontFamily = font;
      hymnPreviewTitle.style.fontWeight = weight;
    }
  }

  // ── Hook syncPreview into all appearance change handlers ──

  // ── Modal Open / Close ──
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsModal.hidden = false;
      syncAllSettingsUI();
    });
  }

  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', () => {
      settingsModal.hidden = true;
    });
  }

  const settingsClose = document.getElementById('settingsClose');
  if (settingsClose) {
    settingsClose.addEventListener('click', () => {
      settingsModal.hidden = true;
    });
  }

  const settingsApply = document.getElementById('settingsApply');
  if (settingsApply) {
    settingsApply.addEventListener('click', (e) => {
      e.stopPropagation();
      pushSettingsToIframes();
      pushBibleMaxFont();
      pushBibleSettings();
      pushHymnSettings();
      settingsModal.hidden = true;
    });
  }

  const settingsReset = document.getElementById('settingsReset');
  if (settingsReset) {
    settingsReset.addEventListener('click', (e) => {
      e.stopPropagation();
      Object.entries(KEYS).forEach(([key, storageKey]) => {
        if (key === 'theme') return;
        localStorage.removeItem(storageKey);
      });
      if (window.Theme) window.Theme.apply(DEFAULTS.theme);
      syncAllSettingsUI();
      pushSettingsToIframes();
      pushBibleMaxFont();
      pushBibleSettings();
      pushHymnSettings();
    });
  }

  // Push initial settings to iframes on load
  [bibleFrame, hymnFrame].forEach((frame) => {
    frame.addEventListener('load', () => {
      pushSettingsToIframes();
      pushBibleMaxFont();
      pushBibleSettings();
      pushHymnSettings();
    });
  });

  // ── Presenter API Proxy ──
  const api = window.presenterApi;

  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'presenterApiRequest') return;

    const { requestId, method, args } = data;
    const respond = (result, error) => {
      e.source.postMessage({ type: 'presenterApiResponse', requestId, result, error }, '*');
    };

    if (!api) {
      respond(null, 'presenterApi not available');
      return;
    }

    try {
      if (method === 'get-displays') {
        api.getDisplays().then((result) => respond(result)).catch((err) => respond(null, err.message));
      } else if (method === 'set-presenter-display') {
        api.setPresenterDisplay(args[0]);
        respond({ ok: true });
      } else if (method === 'get-hymns') {
        api.getHymns().then((result) => respond(result)).catch((err) => respond(null, err.message));
      } else if (method === 'save-hymns') {
        api.saveHymns(args[0]).then((result) => respond(result)).catch((err) => respond(null, err.message));
      } else {
        respond(null, 'Unknown method: ' + method);
      }
    } catch (err) {
      respond(null, err.message);
    }
  });

  // ── Window Controls ──
  const maximizeBtn = document.getElementById('maximizeBtn');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const winCloseBtn = document.getElementById('closeBtn');
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      if (isElectron && window.windowControls) {
        window.windowControls.minimize();
      }
    });
  }

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      if (isElectron && window.windowControls) {
        window.windowControls.maximize();
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    });
  }

  if (winCloseBtn) {
    winCloseBtn.addEventListener('click', () => {
      if (isElectron && window.windowControls) {
        window.windowControls.close();
      } else {
        window.close();
      }
    });
  }
})();
