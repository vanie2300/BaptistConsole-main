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
    bibleBgImage: 'settings_bibleBgImage',
    bibleBgOpacity: 'settings_bibleBgOpacity',
    hymnBgImage: 'settings_hymnBgImage',
    hymnBgOpacity: 'settings_hymnBgOpacity',
    bibleFontMax: 'biblePresenterFontMax',
    bibleShowRef: 'settings_bibleShowRef',
    bibleRefSize: 'settings_bibleRefSize',
    hymnAlign: 'settings_hymnAlign',
    hymnLayout: 'settings_hymnLayout',
    hymnShowNumbers: 'settings_hymnShowNumbers',
    hymnTitleSize: 'settings_hymnTitleSize',
    hymnTransition: 'settings_hymnTransition',
  };

  const DEFAULTS = {
    theme: 'dark',
    presenterBg: '#000000',
    presenterText: '#ffffff',
    presenterWeight: '600',
    presenterFont: "'Segoe UI', system-ui, sans-serif",
    presenterBgImage: '',
    presenterBgOpacity: 30,
    bibleBgImage: '',
    bibleBgOpacity: 30,
    hymnBgImage: '',
    hymnBgOpacity: 30,
    bibleFontMax: 800,
    bibleShowRef: 'true',
    bibleRefSize: '100',
    hymnAlign: 'left',
    hymnLayout: 'full',
    hymnShowNumbers: 'true',
    hymnTitleSize: '7',
    hymnTransition: 'none',
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

  // Migrate the old shared background-image setting into separate per-module ones.
  function migrateBgImageSettings() {
    const legacyImg = localStorage.getItem(KEYS.presenterBgImage);
    if (legacyImg) {
      [{ key: KEYS.bibleBgImage, opacity: KEYS.bibleBgOpacity },
       { key: KEYS.hymnBgImage, opacity: KEYS.hymnBgOpacity }].forEach((mod) => {
        if (!localStorage.getItem(mod.key)) {
          localStorage.setItem(mod.key, legacyImg);
          const legacyOpacity = localStorage.getItem(KEYS.presenterBgOpacity);
          if (legacyOpacity) localStorage.setItem(mod.opacity, legacyOpacity);
        }
      });
      localStorage.removeItem(KEYS.presenterBgImage);
      localStorage.removeItem(KEYS.presenterBgOpacity);
    }
  }
  migrateBgImageSettings();

  // ── Helpers ──
  function isValidHexColor(color) {
    return /^#[0-9a-fA-F]{6}$/.test(color);
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
    };
  }

  function collectBgImage(module) {
    return {
      bgImage: loadSetting(module === 'bible' ? KEYS.bibleBgImage : KEYS.hymnBgImage, ''),
      bgOpacity: Number(loadSetting(module === 'bible' ? KEYS.bibleBgOpacity : KEYS.hymnBgOpacity, DEFAULTS.bibleBgOpacity)),
    };
  }

  function pushSettingsToIframes() {
    const shared = collectPresenterSettings();
    const targets = [
      { frame: bibleFrame, msg: { type: 'settingsUpdate', ...shared, ...collectBgImage('bible') } },
      { frame: hymnFrame, msg: { type: 'settingsUpdate', ...shared, ...collectBgImage('hymns') } },
    ];
    targets.forEach(({ frame, msg }) => {
      try {
        frame.contentWindow?.postMessage(msg, '*');
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
    const refSize = Number(loadSetting(KEYS.bibleRefSize, DEFAULTS.bibleRefSize)) || 100;
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'bibleSettingsUpdate', showRef, refSize }, '*');
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
      transition: loadSetting(KEYS.hymnTransition, DEFAULTS.hymnTransition),
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
      syncPreview();
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
      const value = bgColorPicker.value;
      if (isValidHexColor(value)) {
        saveSetting(KEYS.presenterBg, value);
        if (bgSwatches) {
          bgSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
            s.classList.remove('active');
          });
        }
        syncPaletteGrid();
        syncPreview();
      }
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
      const value = textColorPicker.value;
      if (isValidHexColor(value)) {
        saveSetting(KEYS.presenterText, value);
        if (textSwatches) {
          textSwatches.querySelectorAll('.swatch[data-color]').forEach((s) => {
            s.classList.remove('active');
          });
        }
        syncPaletteGrid();
        syncPreview();
      }
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

  // ── Background Image (per module) ──
  const BG_MODULES = [
    {
      module: 'bible',
      pathId: 'bibleBgImagePath',
      browseId: 'bibleBgImageBrowse',
      clearId: 'bibleBgImageClear',
      opacityRowId: 'bibleBgOpacityRow',
      opacityRangeId: 'bibleBgOpacityRange',
      opacityValueId: 'bibleBgOpacityValue',
    },
    {
      module: 'hymns',
      pathId: 'hymnBgImagePath',
      browseId: 'hymnBgImageBrowse',
      clearId: 'hymnBgImageClear',
      opacityRowId: 'hymnBgOpacityRow',
      opacityRangeId: 'hymnBgOpacityRange',
      opacityValueId: 'hymnBgOpacityValue',
    },
  ];

  const bgModules = BG_MODULES.map((cfg) => {
    const els = {
      path: document.getElementById(cfg.pathId),
      browse: document.getElementById(cfg.browseId),
      clear: document.getElementById(cfg.clearId),
      opacityRow: document.getElementById(cfg.opacityRowId),
      opacityRange: document.getElementById(cfg.opacityRangeId),
      opacityValue: document.getElementById(cfg.opacityValueId),
    };
    const isBible = cfg.module === 'bible';
    const imgKey = isBible ? KEYS.bibleBgImage : KEYS.hymnBgImage;
    const opKey = isBible ? KEYS.bibleBgOpacity : KEYS.hymnBgOpacity;
    const defaultOpacity = isBible ? DEFAULTS.bibleBgOpacity : DEFAULTS.hymnBgOpacity;

    const sync = () => {
      const imgPath = loadSetting(imgKey, '');
      const opacity = Number(loadSetting(opKey, defaultOpacity));
      if (els.path) {
        if (imgPath) {
          const parts = imgPath.replace(/\\/g, '/').split('/');
          els.path.textContent = parts[parts.length - 1];
          els.path.classList.add('has-image');
        } else {
          els.path.textContent = 'No image selected';
          els.path.classList.remove('has-image');
        }
      }
      if (els.clear) els.clear.hidden = !imgPath;
      if (els.opacityRow) els.opacityRow.hidden = !imgPath;
      if (els.opacityRange) els.opacityRange.value = opacity;
      if (els.opacityValue) els.opacityValue.textContent = opacity + '%';
    };

    if (els.browse) {
      els.browse.addEventListener('click', async () => {
        const api = window.presenterApi;
        if (!api || !api.pickBackgroundImage) {
          alert('File picker not available.');
          return;
        }
        const filePath = await api.pickBackgroundImage();
        if (filePath) {
          saveSetting(imgKey, filePath);
          sync();
        }
      });
    }

    if (els.clear) {
      els.clear.addEventListener('click', () => {
        saveSetting(imgKey, '');
        sync();
      });
    }

    if (els.opacityRange) {
      els.opacityRange.addEventListener('input', () => {
        const val = Number(els.opacityRange.value);
        if (els.opacityValue) els.opacityValue.textContent = val + '%';
      });
      els.opacityRange.addEventListener('change', () => {
        saveSetting(opKey, Number(els.opacityRange.value));
      });
    }

    return { module: cfg.module, sync };
  });

  function syncBgImageUI() {
    bgModules.forEach((m) => m.sync());
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
      syncPreview();
      pushBibleSettings();
    });
  }

  // ── Bible Reference Size ──
  const bibleRefSizeInput = document.getElementById('bibleRefSize');
  const bibleRefSizeRange = document.getElementById('bibleRefSizeRange');

  function syncBibleRefSizeUI() {
    const val = Number(loadSetting(KEYS.bibleRefSize, DEFAULTS.bibleRefSize)) || 100;
    if (bibleRefSizeInput) bibleRefSizeInput.value = val;
    if (bibleRefSizeRange) bibleRefSizeRange.value = val;
  }

  function applyBibleRefSize(val) {
    const clamped = Math.min(200, Math.max(50, Number(val) || 100));
    saveSetting(KEYS.bibleRefSize, clamped);
    syncBibleRefSizeUI();
    syncPreview();
    pushBibleSettings();
  }

  if (bibleRefSizeInput) {
    bibleRefSizeInput.addEventListener('change', () => {
      applyBibleRefSize(Number(bibleRefSizeInput.value));
    });
  }

  if (bibleRefSizeRange) {
    bibleRefSizeRange.addEventListener('input', () => {
      if (bibleRefSizeInput) bibleRefSizeInput.value = bibleRefSizeRange.value;
    });
    bibleRefSizeRange.addEventListener('change', () => {
      applyBibleRefSize(Number(bibleRefSizeRange.value));
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

  // ── Hymn Slide Transition ──
  const hymnTransitionGroup = document.getElementById('hymnTransitionGroup');

  function syncHymnTransitionUI() {
    const current = loadSetting(KEYS.hymnTransition, DEFAULTS.hymnTransition);
    if (hymnTransitionGroup) {
      hymnTransitionGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === current);
      });
    }
  }

  if (hymnTransitionGroup) {
    hymnTransitionGroup.querySelectorAll('.settings-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveSetting(KEYS.hymnTransition, btn.dataset.value);
        syncHymnTransitionUI();
      });
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
    syncBibleRefSizeUI();
    syncHymnAlignUI();
    syncHymnLayoutUI();
    syncHymnShowNumbersUI();
    syncHymnTitleSizeUI();
    syncHymnTransitionUI();
    syncPreview();
  }

  // ── Live Preview ──
  const previewVerse = document.getElementById('previewVerse');
  const previewRef = document.getElementById('previewRef');
  const previewLabel = document.getElementById('previewLabel');
  const previewBgDot = document.getElementById('previewBgDot');
  const previewBgLabel = document.getElementById('previewBgLabel');
  const previewTextDot = document.getElementById('previewTextDot');
  const previewTextLabel = document.getElementById('previewTextLabel');
  const previewFontLabel = document.getElementById('previewFontLabel');
  const settingsPreview = document.getElementById('settingsPreview');
  const previewMeta = document.getElementById('previewMeta');
  const previewThemeBible = document.getElementById('previewThemeBible');
  const previewHymn = document.getElementById('previewHymn');
  const previewHymnNum = document.getElementById('previewHymnNum');
  const previewHymnTitle = document.getElementById('previewHymnTitle');
  const previewHymnVerse = document.getElementById('previewHymnVerse');

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

  function getActivePanel() {
    const activeBtn = document.querySelector('.settings-sidebar-btn.active');
    return activeBtn ? activeBtn.dataset.panel : 'theme';
  }

  function syncPreview() {
    const bg = loadSetting(KEYS.presenterBg, DEFAULTS.presenterBg);
    const text = loadSetting(KEYS.presenterText, DEFAULTS.presenterText);
    const font = loadSetting(KEYS.presenterFont, DEFAULTS.presenterFont);
    const weight = loadSetting(KEYS.presenterWeight, DEFAULTS.presenterWeight);
    const activePanel = getActivePanel();

    // Switch preview content based on active panel
    if (previewThemeBible) previewThemeBible.hidden = activePanel === 'hymns';
    if (previewHymn) previewHymn.hidden = activePanel !== 'hymns';
    if (settingsPreview) settingsPreview.classList.toggle('hymn-preview', activePanel === 'hymns');
    if (previewMeta) previewMeta.hidden = activePanel === 'hymns';

    // Always apply bg/color to the preview container
    if (settingsPreview) {
      settingsPreview.style.background = bg;
      settingsPreview.style.color = text;
    }

    if (activePanel === 'hymns') {
      // Hymn preview
      const align = loadSetting(KEYS.hymnAlign, DEFAULTS.hymnAlign);
      const titleSize = Number(loadSetting(KEYS.hymnTitleSize, DEFAULTS.hymnTitleSize)) || 7;
      if (previewHymnNum) {
        previewHymnNum.style.fontFamily = font;
        previewHymnNum.style.fontWeight = weight;
        previewHymnNum.style.textAlign = align;
      }
      if (previewHymnTitle) {
        previewHymnTitle.style.fontFamily = font;
        previewHymnTitle.style.fontWeight = weight;
        previewHymnTitle.style.textAlign = align;
        previewHymnTitle.style.fontSize = titleSize + 'cqw';
      }
      if (previewHymnVerse) {
        previewHymnVerse.style.fontFamily = font;
        previewHymnVerse.style.fontWeight = weight;
        previewHymnVerse.style.textAlign = align;
        const len = (previewHymnVerse.textContent || '').length;
        previewHymnVerse.style.fontSize = (len < 80 ? 3.4 : 2.5) + 'cqw';
      }
    } else {
      // Theme/Bible preview
      const showRef = loadSetting(KEYS.bibleShowRef, DEFAULTS.bibleShowRef) === 'true';
      if (previewVerse) {
        previewVerse.style.fontFamily = font;
        previewVerse.style.fontWeight = weight;
      }
      if (previewLabel) {
        previewLabel.style.fontFamily = font;
        previewLabel.style.fontWeight = weight;
      }
      if (previewRef) {
        const refScale = Number(loadSetting(KEYS.bibleRefSize, DEFAULTS.bibleRefSize)) || 100;
        previewRef.style.fontFamily = font;
        previewRef.style.fontSize = `calc(0.85rem * ${refScale} / 100)`;
        previewRef.hidden = activePanel === 'bible' && !showRef;
      }

      // Chips (only show on Theme panel)
      if (previewMeta) previewMeta.style.display = activePanel === 'theme' ? '' : 'none';
      if (previewBgDot) previewBgDot.style.background = bg;
      if (previewBgLabel) previewBgLabel.textContent = COLOR_NAMES[bg] || 'Custom';
      if (previewTextDot) previewTextDot.style.background = text;
      if (previewTextLabel) previewTextLabel.textContent = COLOR_NAMES[text] || 'Custom';
      if (previewFontLabel) previewFontLabel.textContent = FONT_DISPLAY_NAMES[font] || 'Custom';
    }
  }

  // ── Hook syncPreview into all appearance change handlers ──

  // ── Modal Open / Close ──
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

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
      showToast('Settings saved');
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
      showToast('Settings reset to defaults', 'info');
    });
  }

  // Push initial settings to iframes (immediate + on load)
  pushSettingsToIframes();
  pushBibleMaxFont();
  pushBibleSettings();
  pushHymnSettings();

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
    if (e.source !== bibleFrame.contentWindow && e.source !== hymnFrame.contentWindow) return;

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
