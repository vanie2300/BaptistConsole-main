(() => {
  // ── Tab Switching ──
  const tabs = document.querySelectorAll('.tab');
  const bibleFrame = document.getElementById('bible-frame');
  const hymnFrame = document.getElementById('hymn-frame');
  const indicator = document.getElementById('tabIndicator');
  const activeModuleLabel = document.getElementById('activeModule');

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
    const barRect = bar.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    indicator.style.left = (tabRect.left - barRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Initialize indicator position
  requestAnimationFrame(() => {
    moveIndicator(document.querySelector('.tab.active'));
  });

  // ── Settings Modal ──
  const settingsBtn = document.getElementById('settingsBtn');
  const overlay = document.getElementById('settingsOverlay');
  const closeBtn = document.getElementById('settingsClose');
  const cancelBtn = document.getElementById('settingsCancel');
  const saveBtn = document.getElementById('settingsSave');
  const resetBtn = document.getElementById('settingsReset');
  const sidebar = document.getElementById('settingsSidebar');
  const content = document.getElementById('settingsContent');

  // Settings state
  const DEFAULTS = {
    _v: 5,
    theme: 'dark',
    accent: 'blue',
    density: 'comfortable',
    animations: true,
    font: 'Inter',
    corners: 'medium',
    aspectRatio: '16:9',
    presentationBg: 'solid',
    bgColor: '#000000',
    autoFullscreen: false,
    autoOpenPopup: true,
    screenTransition: 'fade',
    rememberState: true,
    bibleDefaultBook: '',
    showVerseNumbers: true,
    highlightVerse: true,
    rememberLastPassage: true,
    autoScroll: true,
    bibleFontSize: 220,
    projectionFont: 'system-ui',
    rememberLastHymn: true,
    hymnFontSize: 48,
    autoSplitStanzas: true,
    showChorusLabels: true,
    hymnDefaultSort: 'number',
  };

  let settings = { ...DEFAULTS };
  let settingsBackup = null;

  // Load settings from localStorage
  function loadSettings() {
    try {
      const stored = localStorage.getItem('baptistSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed._v === DEFAULTS._v) {
          settings = { ...DEFAULTS, ...parsed };
        } else {
          localStorage.removeItem('baptistSettings');
        }
      }
    } catch (e) {}
  }

  function saveSettings() {
    localStorage.setItem('baptistSettings', JSON.stringify(settings));
  }

  // ── Settings UI Panels ──
  const ACCENT_COLORS = {
    blue: '#4169E1',
    purple: '#7b5aad',
    green: '#4a9b72',
    red: '#b55454',
    orange: '#b87a48',
    teal: '#4a9b92',
  };

  const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins'];
  const DENSITY_OPTIONS = ['comfortable', 'compact'];
  const CORNER_OPTIONS = ['small', 'medium', 'large'];
  const ASPECT_OPTIONS = ['16:9', '4:3'];
  const BG_OPTIONS = ['solid', 'gradient', 'image'];
  const TRANSITION_OPTIONS = ['instant', 'fade', 'slide'];
  const SORT_OPTIONS = ['number', 'title'];

  function renderRadioGroup(name, options, current) {
    return `<div class="radio-group">
      ${options.map((o) =>
        `<button class="radio-btn${o === current ? ' active' : ''}" data-setting="${name}" data-value="${o}">${o}</button>`
      ).join('')}
    </div>`;
  }

  function renderSwatches(name, colors, current) {
    return `<div class="swatch-group">
      ${Object.entries(colors).map(([key, hex]) =>
        `<button class="swatch${key === current ? ' active' : ''}" data-setting="${name}" data-value="${key}" style="background:${hex}" title="${key}"></button>`
      ).join('')}
    </div>`;
  }

  function renderToggle(name, current) {
    return `<button class="toggle${current ? ' active' : ''}" data-setting="${name}" data-type="toggle"></button>`;
  }

  function getPanel(catId) {
    const panels = {
      appearance: `
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="settings-row">
            <span class="settings-label">Theme</span>
            ${renderRadioGroup('theme', ['light', 'dark'], settings.theme)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Accent Color</span>
            ${renderSwatches('accent', ACCENT_COLORS, settings.accent)}
          </div>
          <div class="settings-row">
            <span class="settings-label">UI Density</span>
            ${renderRadioGroup('density', DENSITY_OPTIONS, settings.density)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Animations</span>
            ${renderToggle('animations', settings.animations)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Interface Font</span>
            ${renderRadioGroup('font', FONT_OPTIONS, settings.font)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Rounded Corners</span>
            ${renderRadioGroup('corners', CORNER_OPTIONS, settings.corners)}
          </div>
        </div>
      `,
      presentation: `
        <div class="settings-section">
          <div class="settings-section-title">Presentation</div>
          <div class="settings-row">
            <span class="settings-label">Default Aspect Ratio</span>
            ${renderRadioGroup('aspectRatio', ASPECT_OPTIONS, settings.aspectRatio)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Default Background</span>
            ${renderRadioGroup('presentationBg', BG_OPTIONS, settings.presentationBg)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Auto Fullscreen</span>
            ${renderToggle('autoFullscreen', settings.autoFullscreen)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Auto Open Presentation Window</span>
            ${renderToggle('autoOpenPopup', settings.autoOpenPopup)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Screen Transition</span>
            ${renderRadioGroup('screenTransition', TRANSITION_OPTIONS, settings.screenTransition)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Remember Presentation State</span>
            ${renderToggle('rememberState', settings.rememberState)}
          </div>
        </div>
      `,
      bible: `
        <div class="settings-section">
          <div class="settings-section-title">Bible</div>
          <div class="settings-row">
            <span class="settings-label">Show Verse Numbers</span>
            ${renderToggle('showVerseNumbers', settings.showVerseNumbers)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Highlight Current Verse</span>
            ${renderToggle('highlightVerse', settings.highlightVerse)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Remember Last Passage</span>
            ${renderToggle('rememberLastPassage', settings.rememberLastPassage)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Auto Scroll</span>
            ${renderToggle('autoScroll', settings.autoScroll)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Projection Font Size</span>
            <div class="settings-control">
              <input type="number" id="bibleFontSize" value="${settings.bibleFontSize}" min="36" max="800" step="10">
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Projection Font</span>
            <div class="settings-control">
              <select id="projectionFont">
                <option value="system-ui"${settings.projectionFont === 'system-ui' ? ' selected' : ''}>System Default</option>
                <option value="Inter, sans-serif"${settings.projectionFont === 'Inter, sans-serif' ? ' selected' : ''}>Inter</option>
                <option value="Georgia, serif"${settings.projectionFont === 'Georgia, serif' ? ' selected' : ''}>Georgia</option>
                <option value="'Times New Roman', serif"${settings.projectionFont === "'Times New Roman', serif" ? ' selected' : ''}>Times New Roman</option>
              </select>
            </div>
          </div>
        </div>
      `,
      hymns: `
        <div class="settings-section">
          <div class="settings-section-title">Hymns</div>
          <div class="settings-row">
            <span class="settings-label">Remember Last Hymn</span>
            ${renderToggle('rememberLastHymn', settings.rememberLastHymn)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Projection Font Size</span>
            <div class="settings-control">
              <input type="number" id="hymnFontSize" value="${settings.hymnFontSize}" min="24" max="120" step="4">
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Auto Split Stanzas</span>
            ${renderToggle('autoSplitStanzas', settings.autoSplitStanzas)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Show Chorus Labels</span>
            ${renderToggle('showChorusLabels', settings.showChorusLabels)}
          </div>
          <div class="settings-row">
            <span class="settings-label">Default Sort</span>
            ${renderRadioGroup('hymnDefaultSort', SORT_OPTIONS, settings.hymnDefaultSort)}
          </div>
        </div>
      `,
      advanced: `
        <div class="settings-section">
          <div class="settings-section-title">Advanced</div>
          <div class="settings-row">
            <span class="settings-label">Export Configuration</span>
            <button class="settings-btn secondary" id="exportConfig">Export</button>
          </div>
          <div class="settings-row">
            <span class="settings-label">Import Configuration</span>
            <button class="settings-btn secondary" id="importConfig">Import</button>
            <input type="file" id="importFile" accept=".json" hidden>
          </div>
          <div class="settings-row">
            <span class="settings-label">Reset All Settings</span>
            <button class="settings-btn secondary" id="resetAllSettings" style="color:var(--text-muted)">Reset</button>
          </div>
          <div class="settings-row" style="margin-top:16px;">
            <div>
              <div class="settings-label" style="margin-bottom:4px;">Baptist Console</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">Version 2.0.0</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">Created by Jovanie Cangke</div>
            </div>
          </div>
        </div>
      `,
    };
    return panels[catId] || '';
  }

  function showPanel(catId) {
    content.innerHTML = getPanel(catId);
    wirePanelEvents();
  }

  function wirePanelEvents() {
    // Radio buttons
    content.querySelectorAll('.radio-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.radio-group');
        group.querySelectorAll('.radio-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        settings[btn.dataset.setting] = btn.dataset.value;
        applySettingLive(btn.dataset.setting, btn.dataset.value);
      });
    });

    // Swatches
    content.querySelectorAll('.swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        sw.closest('.swatch-group').querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
        sw.classList.add('active');
        settings[sw.dataset.setting] = sw.dataset.value;
        applySettingLive(sw.dataset.setting, sw.dataset.value);
      });
    });

    // Toggles
    content.querySelectorAll('.toggle').forEach((tg) => {
      tg.addEventListener('click', () => {
        tg.classList.toggle('active');
        const val = tg.classList.contains('active');
        settings[tg.dataset.setting] = val;
        applySettingLive(tg.dataset.setting, val);
      });
    });

    // Number inputs
    content.querySelectorAll('input[type="number"]').forEach((inp) => {
      inp.addEventListener('change', () => {
        settings[inp.id] = Number(inp.value);
      });
    });

    // Selects
    content.querySelectorAll('select').forEach((sel) => {
      sel.addEventListener('change', () => {
        settings[sel.id] = sel.value;
      });
    });

    // Export
    const exportBtn = document.getElementById('exportConfig');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'baptist-console-settings.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Import
    const importBtn = document.getElementById('importConfig');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', () => {
        const file = importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            settings = { ...DEFAULTS, ...JSON.parse(reader.result) };
            saveSettings();
            applyAllSettings();
            showPanel('advanced');
          } catch (e) {}
        };
        reader.readAsText(file);
      });
    }

    // Reset all
    const resetAll = document.getElementById('resetAllSettings');
    if (resetAll) {
      resetAll.addEventListener('click', () => {
        settings = { ...DEFAULTS };
        saveSettings();
        applyAllSettings();
        showPanel('advanced');
      });
    }
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function setAccentVars(el, hex) {
    el.style.setProperty('--primary', hex);
    const [r, g, b] = hexToRgb(hex);
    el.style.setProperty('--primary-14', `rgba(${r},${g},${b},0.14)`);
    el.style.setProperty('--primary-20', `rgba(${r},${g},${b},0.2)`);
    el.style.setProperty('--primary-25', `rgba(${r},${g},${b},0.25)`);
    el.style.setProperty('--primary-40', `rgba(${r},${g},${b},0.4)`);
    el.style.setProperty('--primary-60', `rgba(${r},${g},${b},0.6)`);
    el.style.setProperty('--link', hex);
    el.style.setProperty('--highlight', hex);
    el.style.setProperty('--highlight-soft', `rgba(${r},${g},${b},0.15)`);
  }

  function applySettingLive(key, value) {
    if (key === 'theme') {
      document.documentElement.classList.toggle('theme-light', value === 'light');
      localStorage.setItem('globalTheme', value);
      pushToIframes({ theme: value });
    }
    if (key === 'accent') {
      const color = ACCENT_COLORS[value] || ACCENT_COLORS.blue;
      setAccentVars(document.documentElement, color);
      pushToIframes({ accent: color });
    }
    if (key === 'font') {
      document.body.style.fontFamily = `'${value}', system-ui, sans-serif`;
    }
  }

  function pushToIframes(opts) {
    [bibleFrame, hymnFrame].forEach((frame) => {
      try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        if (opts.theme) {
          doc.documentElement.classList.toggle('theme-light', opts.theme === 'light');
        }
        if (opts.accent) {
          setAccentVars(doc.documentElement, opts.accent);
        }
      } catch (e) {}
    });
  }

  function applyAllSettings() {
    applySettingLive('theme', settings.theme);
    applySettingLive('accent', settings.accent);
    applySettingLive('font', settings.font);
  }

  // ── Modal Open/Close ──
  function openSettings() {
    loadSettings();
    settingsBackup = JSON.parse(JSON.stringify(settings));
    showPanel('appearance');
    overlay.hidden = false;
    // Sync sidebar active state
    sidebar.querySelectorAll('.settings-cat').forEach((c) => {
      c.classList.toggle('active', c.dataset.cat === 'appearance');
    });
  }

  function closeSettings(cancel) {
    if (cancel && settingsBackup) {
      settings = settingsBackup;
      applyAllSettings();
    }
    settingsBackup = null;
    overlay.hidden = true;
  }

  settingsBtn.addEventListener('click', openSettings);
  closeBtn.addEventListener('click', () => closeSettings(true));
  cancelBtn.addEventListener('click', () => closeSettings(true));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings(true);
  });

  saveBtn.addEventListener('click', () => {
    settingsBackup = null;
    saveSettings();
    applyAllSettings();
    closeSettings(false);
  });

  resetBtn.addEventListener('click', () => {
    settings = { ...DEFAULTS };
    applyAllSettings();
    showPanel('appearance');
    sidebar.querySelectorAll('.settings-cat').forEach((c) => {
      c.classList.toggle('active', c.dataset.cat === 'appearance');
    });
  });

  // Sidebar navigation
  sidebar.querySelectorAll('.settings-cat').forEach((cat) => {
    cat.addEventListener('click', () => {
      sidebar.querySelectorAll('.settings-cat').forEach((c) => c.classList.remove('active'));
      cat.classList.add('active');
      showPanel(cat.dataset.cat);
    });
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + , for settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      openSettings();
    }
    // Escape to close settings (cancel)
    if (e.key === 'Escape' && !overlay.hidden) {
      closeSettings(true);
    }
    // 1/2 for tab switching when not in input
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '1') switchTab('bible');
      if (e.key === '2') switchTab('hymns');
    }
  });

  // ── Window Controls ──
  const collapseBtn = document.getElementById('collapseBtn');
  const maximizeBtn = document.getElementById('maximizeBtn');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const header = document.querySelector('.shell-header');
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  // Minimize
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      if (isElectron && window.windowControls) {
        window.windowControls.minimize();
      }
    });
  }

  // Maximize — fullscreen in browser
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

  // Collapse — toggle compact header
  let headerCollapsed = localStorage.getItem('headerCollapsed') === 'true';

  function applyCollapse() {
    header.classList.toggle('compact', headerCollapsed);
    moveIndicator(document.querySelector('.tab.active'));
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      headerCollapsed = !headerCollapsed;
      localStorage.setItem('headerCollapsed', String(headerCollapsed));
      applyCollapse();
    });
  }

  applyCollapse();

  // ── Init ──
  loadSettings();

  // Push settings once each iframe finishes loading
  [bibleFrame, hymnFrame].forEach((frame) => {
    frame.addEventListener('load', () => {
      const color = ACCENT_COLORS[settings.accent] || ACCENT_COLORS.blue;
      pushToIframes({ theme: settings.theme, accent: color });
    });
  });

  // Also push immediately (may work if cached)
  applyAllSettings();
})();
