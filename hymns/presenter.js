(() => {
  const refs = {
    search: document.getElementById('searchBox'),
    hymnList: document.getElementById('hymnList'),
    currentSlide: document.getElementById('currentSlide'),
    nextSlide: document.getElementById('nextSlide'),
    thumbnails: document.getElementById('thumbnails'),
    presentBtn: document.getElementById('presentBtn'),
    presentStatus: document.getElementById('presentStatus'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    status: document.getElementById('statusMessage'),
    addHymnBtn: document.getElementById('addHymnBtn'),
    deleteHymnBtn: document.getElementById('deleteHymnBtn'),
    addModal: document.getElementById('addModal'),
    addForm: document.getElementById('addHymnForm'),
    modalTitle: document.getElementById('modalTitle'),
    modalVerses: document.getElementById('modalVerses'),
    modalChorus: document.getElementById('modalChorus'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    presenterDisplayWrap: document.getElementById('presenterDisplayWrap'),
    presenterDisplayPicker: document.getElementById('presenterDisplayPicker'),
  };

  const state = {
    hymns: [],
    filtered: [],
    selectedIndex: null,
    selectedId: null,
    slides: [],
    currentIndex: 0,
    presentationWindow: null,
  };

  let presenterStatusTimer = null;
  let presenterAutoDisplayId = null;
  let presenterDisplayLabel = '';
  let presenterDisplayIsAuto = true;
  let presenterAutoDisplayLabel = '';
  let isInitialized = false;

  const setStatus = (msg, isError = false) => {
    refs.status.textContent = msg || '';
    refs.status.classList.toggle('error', Boolean(isError));
  };

  const setPresenterState = (isOpen) => {
    if (refs.presentStatus) {
      const base = isOpen ? 'Presenter: On' : 'Presenter: Off';
      const label = presenterDisplayLabel
        ? `${presenterDisplayIsAuto ? 'Auto: ' : ''}${presenterDisplayLabel}`
        : '';
      refs.presentStatus.textContent = label ? `${base} · ${label}` : base;
      refs.presentStatus.classList.toggle('is-active', isOpen);
    }
    if (refs.presentBtn) {
      refs.presentBtn.textContent = isOpen ? 'Presenter Active' : 'Present';
    }
  };

  const monitorPresenterWindow = () => {
    if (presenterStatusTimer) return;
    presenterStatusTimer = setInterval(() => {
      if (state.presentationWindow && state.presentationWindow.closed) {
        state.presentationWindow = null;
        setPresenterState(false);
        clearInterval(presenterStatusTimer);
        presenterStatusTimer = null;
      }
    }, 1000);
  };

  const escapeHtml = (text = '') => text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));

  const chunkLines = (lines, maxLines) => {
    const chunks = [];
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines));
    }
    return chunks;
  };

  const getMaxLines = (lines) => {
    if (!lines || lines.length === 0) return 2;
    const longLines = lines.filter((line) => line.length > 35).length;
    const ratio = longLines / lines.length;
    if (ratio === 0) return 4;
    if (ratio <= 0.3) return 3;
    return 2;
  };

  const buildSlidesFromLines = (type, lines, number = null) => {
    if (appSettings.autoSplitStanzas === false) {
      return [{ type, lines, ...(number !== null && { number }) }];
    }
    const maxLines = getMaxLines(lines);
    const chunks = chunkLines(lines, maxLines);
    return chunks.map((chunk) => ({
      type,
      lines: chunk,
      ...(number !== null && { number }),
    }));
  };

  const buildSlides = (hymn) => {
    const slides = [];
    slides.push({ type: 'title', title: hymn.title });
    hymn.verses.forEach((verse, i) => {
      slides.push(...buildSlidesFromLines('verse', verse, i + 1));
      if (hymn.chorus?.length) {
        slides.push(...buildSlidesFromLines('chorus', hymn.chorus));
      }
    });
    return slides;
  };

  const slideToHtml = (slide, mode = 'current') => {
    const wrapper = document.createElement('div');
    wrapper.className = 'resizable-text';
    if (slide.type === 'title') {
      wrapper.innerHTML = `<div class="slide-title">${escapeHtml(slide.title)}</div>`;
    } else {
      const label = slide.type === 'chorus' ? 'Chorus' : `Verse ${slide.number}`;
      const content = (slide.lines || []).map(escapeHtml).join('<br>');
      wrapper.innerHTML = `<div class="verse-label">${label}</div>${content}`;
    }

    const textLength = wrapper.textContent.length;
    const fontScale = (appSettings.hymnFontSize || 48) / 48;
    let fontSize;
    if (mode === 'current') fontSize = textLength < 80 ? (3.6 * fontScale) + 'vw' : (2.6 * fontScale) + 'vw';
    else if (mode === 'next') fontSize = textLength < 80 ? (2 * fontScale) + 'vw' : (1.4 * fontScale) + 'vw';
    else fontSize = textLength > 150 ? '0.65rem' : '0.8rem';
    wrapper.style.fontSize = fontSize;
    return wrapper.outerHTML;
  };

  const renderList = () => {
    refs.hymnList.innerHTML = '';
    state.filtered.forEach((hymn, idx) => {
      const row = document.createElement('button');
      row.className = 'hymn-row';
      row.type = 'button';
      row.textContent = hymn.title;
      if (state.selectedId && (hymn.id === state.selectedId || hymn.title === state.selectedId)) {
        row.classList.add('active');
      }
      row.addEventListener('click', () => selectHymn(idx));
      refs.hymnList.appendChild(row);
    });
  };

  const renderSlides = () => {
    if (!state.slides.length) return;
    const current = state.slides[state.currentIndex] || { lines: ['End of hymn'] };
    const next = state.slides[state.currentIndex + 1];

    refs.currentSlide.innerHTML = slideToHtml(current, 'current');
    refs.nextSlide.innerHTML = next ? slideToHtml(next, 'next') : '<em>End of hymn</em>';

    refs.thumbnails.innerHTML = '';
    state.slides.slice(state.currentIndex + 2, state.currentIndex + 8).forEach((slide) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      thumb.innerHTML = slideToHtml(slide, 'thumb');
      refs.thumbnails.appendChild(thumb);
    });

    refs.prevBtn.disabled = state.currentIndex <= 0;
    refs.nextBtn.disabled = state.currentIndex >= state.slides.length - 1;
    refs.presentBtn.disabled = false;
    updateDeleteState();
    applyHymnsSettings();
  };

  const navigate = (step) => {
    if (!state.slides.length) return;
    const nextIndex = Math.min(Math.max(0, state.currentIndex + step), state.slides.length - 1);
    if (nextIndex === state.currentIndex) return;
    state.currentIndex = nextIndex;
    renderSlides();
    if (state.presentationWindow && !state.presentationWindow.closed) {
      state.presentationWindow.postMessage({ type: 'navigate', currentIndex: state.currentIndex }, '*');
    }
  };

  const selectHymn = (idx) => {
    state.selectedIndex = idx;
    const hymn = state.filtered[idx];
    state.selectedId = hymn.id ?? hymn.title;
    state.slides = buildSlides(hymn);
    state.currentIndex = 0;
    renderSlides();
    renderList();
    updateDeleteState();
    if (state.presentationWindow && !state.presentationWindow.closed) {
      state.presentationWindow.postMessage({
        type: 'init',
        slides: state.slides,
        currentIndex: state.currentIndex,
      }, '*');
    }
  };

  const filterList = () => {
    const query = refs.search.value.toLowerCase();
    state.filtered = state.hymns.filter((h) => h.title.toLowerCase().includes(query));
    if (state.selectedId !== null) {
      const nextIndex = state.filtered.findIndex(
        (h) => (h.id ?? h.title) === state.selectedId
      );
      state.selectedIndex = nextIndex >= 0 ? nextIndex : null;
      if (nextIndex < 0) {
        state.selectedId = null;
        state.slides = [];
        state.currentIndex = 0;
        refs.currentSlide.innerHTML = '<em>Select a hymn...</em>';
        refs.nextSlide.innerHTML = '';
        refs.thumbnails.innerHTML = '';
        refs.prevBtn.disabled = true;
        refs.nextBtn.disabled = true;
        refs.presentBtn.disabled = true;
      }
    } else {
      state.selectedIndex = null;
    }
    renderList();
    updateDeleteState();
  };

  const startPresentation = () => {
    if (!state.slides.length) return;
    const api = window.presenterApi;
    if (api) {
      const stored = localStorage.getItem('hymnsPresenterDisplayId');
      const storedId = stored ? Number(stored) : null;
      const preferredId = storedId ?? presenterAutoDisplayId ?? null;
      api.setPresenterDisplay(preferredId);
    }
    if (state.presentationWindow && !state.presentationWindow.closed) {
      state.presentationWindow.focus();
      state.presentationWindow.postMessage({
        type: 'init',
        slides: state.slides,
        currentIndex: state.currentIndex,
      }, '*');
      setPresenterState(true);
      monitorPresenterWindow();
      return;
    }

    const popup = window.open('presentation.html', 'HymnPresentation', 'width=960,height=720');
    if (!popup) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    state.presentationWindow = popup;
    const sendInit = () => {
      popup.postMessage({
        type: 'init',
        slides: state.slides,
        currentIndex: state.currentIndex,
        settings: appSettings,
      }, '*');
    };
    popup.onload = sendInit;
    popup.addEventListener('beforeunload', () => {
      state.presentationWindow = null;
      setPresenterState(false);
      if (presenterStatusTimer) {
        clearInterval(presenterStatusTimer);
        presenterStatusTimer = null;
      }
    });
    setPresenterState(true);
    monitorPresenterWindow();
  };

  let appSettings = {};

  const handleMessage = (event) => {
    const data = event.data || {};
    if (data.type === 'settingsUpdate') {
      appSettings = data.settings || {};
      applyHymnsSettings();
      return;
    }
    if (data.type === 'navigateFromPopup') {
      const idx = Number(data.currentIndex);
      if (Number.isFinite(idx) && idx >= 0 && idx < state.slides.length) {
        state.currentIndex = idx;
        renderSlides();
      }
    }
  };

  function applyHymnsSettings() {
    if (appSettings.projectionFont && appSettings.projectionFont !== 'system-ui') {
      const fontMap = {
        'Inter, sans-serif': 'Inter, sans-serif',
        'Georgia, serif': 'Georgia, serif',
        "'Times New Roman', serif": "'Times New Roman', serif",
      };
      const mapped = fontMap[appSettings.projectionFont] || appSettings.projectionFont;
      document.documentElement.style.setProperty('--font-main', mapped);
    }
    document.querySelectorAll('.verse-label').forEach((el) => {
      el.style.display = appSettings.showChorusLabels === false ? 'none' : '';
    });
  }

  const parseStanzas = (raw) => {
    if (!raw.trim()) return [];
    return raw
      .split(/\n\s*\n/) // blank line separates verses
      .map((block) =>
        block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      )
      .filter((lines) => lines.length);
  };

  const openModal = () => {
    if (refs.addModal) {
      refs.addModal.hidden = false;
      refs.modalTitle.value = '';
      refs.modalVerses.value = '';
      refs.modalChorus.value = '';
      refs.modalTitle.focus();
    }
  };

  const closeModal = () => {
    if (refs.addModal) refs.addModal.hidden = true;
  };

  const addHymnFromModal = async (e) => {
    e.preventDefault();
    if (!isInitialized) {
      alert('Still loading hymns. Please wait.');
      return;
    }
    const title = (refs.modalTitle.value || '').trim();
    if (!title) {
      alert('Title is required.');
      return;
    }

    const verses = parseStanzas(refs.modalVerses.value || '');
    if (!verses.length) {
      alert('Please provide at least one verse. Use blank lines to separate verses.');
      return;
    }

    const chorusLines = (refs.modalChorus.value || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const maxId = state.hymns.reduce((max, h) => Math.max(max, h.id || 0), 0);
    const newHymn = {
      id: maxId + 1,
      title,
      verses,
      ...(chorusLines.length ? { chorus: chorusLines } : {}),
    };

    state.hymns.push(newHymn);
    state.hymns.sort((a, b) => a.title.localeCompare(b.title));
    state.filtered = [...state.hymns];
    renderList();
    setStatus(`Added "${newHymn.title}". Saving hymns.json...`);
    try {
      await persistHymns();
      setStatus(`Added "${newHymn.title}".`);
    } catch (err) {
      console.error(err);
      setStatus('Could not save hymns.json.', true);
    }
    closeModal();
  };

  const downloadUpdatedHymns = () => {
    try {
      const blob = new Blob([JSON.stringify(state.hymns, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hymns.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      setStatus('Could not generate hymns.json download.', true);
    }
  };

  const persistHymns = async () => {
    const api = window.presenterApi;
    if (api && typeof api.saveHymns === 'function') {
      const result = await api.saveHymns(state.hymns);
      if (!result || !result.ok) {
        throw new Error(result?.error || 'Could not save hymns.json');
      }
      return true;
    }
    downloadUpdatedHymns();
    return false;
  };

  const updateDeleteState = () => {
    if (refs.deleteHymnBtn) {
      refs.deleteHymnBtn.disabled = state.selectedIndex === null;
    }
  };

  const deleteSelectedHymn = async () => {
    if (state.selectedIndex === null) return;
    const hymn = state.filtered[state.selectedIndex];
    if (!hymn) return;
    const confirmDelete = confirm(`Delete "${hymn.title}"?`);
    if (!confirmDelete) return;

    state.hymns = state.hymns.filter((h) => h !== hymn);
    state.filtered = state.filtered.filter((h) => h !== hymn);
    state.selectedIndex = null;
    state.selectedId = null;
    state.slides = [];
    refs.currentSlide.innerHTML = '<em>Select a hymn...</em>';
    refs.nextSlide.innerHTML = '';
    refs.thumbnails.innerHTML = '';
    refs.prevBtn.disabled = true;
    refs.nextBtn.disabled = true;
    refs.presentBtn.disabled = true;
    renderList();
    updateDeleteState();
    setStatus(`Deleted "${hymn.title}". Saving hymns.json...`);
    try {
      await persistHymns();
      setStatus(`Deleted "${hymn.title}".`);
    } catch (err) {
      console.error(err);
      setStatus('Could not save hymns.json.', true);
    }
  };

  const loadHymns = async () => {
    const api = window.presenterApi;
    if (api && typeof api.getHymns === 'function') {
      const result = await api.getHymns();
      if (!result || !result.ok) {
        throw new Error(result?.error || 'Could not load hymns.json');
      }
      return result.data;
    }
    const res = await fetch('hymns.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const init = async () => {
    setStatus('Loading hymns...');
    try {
      const data = await loadHymns();
      state.hymns = data.sort((a, b) => a.title.localeCompare(b.title));
      state.filtered = [...state.hymns];
      renderList();
      setStatus('Select a hymn to begin.');
      updateDeleteState();
      isInitialized = true;
    } catch (err) {
      console.error(err);
      setStatus('Could not load hymns.json.', true);
      refs.search.disabled = true;
      if (refs.addHymnBtn) refs.addHymnBtn.disabled = true;
    }
  };

  const initPresenterDisplayPicker = () => {
    const api = window.presenterApi;
    if (!api || !refs.presenterDisplayWrap || !refs.presenterDisplayPicker) return;

    const stored = localStorage.getItem('hymnsPresenterDisplayId');
    const storedId = stored ? Number(stored) : null;
    let autoLabel = '';

    const formatLabel = (display, index) => {
      const size = display.size || display.bounds || {};
      const labelBase = display.isPrimary ? 'Primary' : `Display ${index + 1}`;
      if (size.width && size.height) {
        return `${labelBase} (${size.width}x${size.height})`;
      }
      return labelBase;
    };

    const pickAutoDisplay = (displays) =>
      displays.find((display) => !display.isPrimary) || displays[0] || null;

    api.getDisplays().then((displays) => {
      if (!Array.isArray(displays) || displays.length === 0) return;
      refs.presenterDisplayWrap.hidden = false;
      refs.presenterDisplayPicker.innerHTML = '<option value=\"\">Default Display</option>';
      displays.forEach((display, index) => {
        const option = document.createElement('option');
        option.value = String(display.id);
        option.textContent = formatLabel(display, index);
        if (storedId && display.id === storedId) {
          option.selected = true;
        }
        refs.presenterDisplayPicker.appendChild(option);
      });

      const autoDisplay = pickAutoDisplay(displays);
      presenterAutoDisplayId = autoDisplay ? autoDisplay.id : null;
      presenterAutoDisplayLabel = '';
      if (autoDisplay) {
        autoLabel = formatLabel(autoDisplay, displays.findIndex((d) => d.id === autoDisplay.id));
        presenterAutoDisplayLabel = autoLabel;
      }

      if (storedId) {
        const storedDisplay = displays.find((display) => display.id === storedId);
        if (storedDisplay) {
          presenterDisplayIsAuto = false;
          presenterDisplayLabel = formatLabel(
            storedDisplay,
            displays.findIndex((d) => d.id === storedId)
          );
          refs.presenterDisplayPicker.value = String(storedId);
          api.setPresenterDisplay(storedId);
        } else {
          presenterDisplayIsAuto = true;
          presenterDisplayLabel = presenterAutoDisplayLabel;
          if (presenterAutoDisplayId) {
            refs.presenterDisplayPicker.value = String(presenterAutoDisplayId);
            api.setPresenterDisplay(presenterAutoDisplayId);
          }
        }
      } else if (presenterAutoDisplayId) {
        presenterDisplayIsAuto = true;
        presenterDisplayLabel = presenterAutoDisplayLabel;
        refs.presenterDisplayPicker.value = String(presenterAutoDisplayId);
        api.setPresenterDisplay(presenterAutoDisplayId);
      } else {
        presenterDisplayIsAuto = true;
        presenterDisplayLabel = '';
      }

      setPresenterState(Boolean(state.presentationWindow && !state.presentationWindow.closed));
    }).catch(() => {});

    refs.presenterDisplayPicker.addEventListener('change', () => {
      const value = refs.presenterDisplayPicker.value;
      if (!value) {
        localStorage.removeItem('hymnsPresenterDisplayId');
        api.setPresenterDisplay(null);
        presenterDisplayIsAuto = true;
        presenterDisplayLabel = presenterAutoDisplayLabel;
        setPresenterState(Boolean(state.presentationWindow && !state.presentationWindow.closed));
        return;
      }
      const displayId = Number(value);
      localStorage.setItem('hymnsPresenterDisplayId', String(displayId));
      api.setPresenterDisplay(displayId);
      presenterDisplayIsAuto = false;
      presenterDisplayLabel = refs.presenterDisplayPicker.selectedOptions[0]?.textContent || '';
      setPresenterState(Boolean(state.presentationWindow && !state.presentationWindow.closed));
    });
  };

  if (refs.search) refs.search.addEventListener('input', filterList);
  if (refs.prevBtn) refs.prevBtn.addEventListener('click', () => navigate(-1));
  if (refs.nextBtn) refs.nextBtn.addEventListener('click', () => navigate(1));
  if (refs.presentBtn) refs.presentBtn.addEventListener('click', startPresentation);
  if (refs.addHymnBtn) refs.addHymnBtn.addEventListener('click', openModal);
  if (refs.deleteHymnBtn) refs.deleteHymnBtn.addEventListener('click', deleteSelectedHymn);
  if (refs.addForm) refs.addForm.addEventListener('submit', addHymnFromModal);
  if (refs.closeModalBtn) refs.closeModalBtn.addEventListener('click', closeModal);
  if (refs.cancelModalBtn) refs.cancelModalBtn.addEventListener('click', closeModal);
  if (refs.addModal) {
    refs.addModal.addEventListener('click', (e) => {
      if (e.target === refs.addModal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
    if (isInput) return;
    const modalOpen = refs.addModal && !refs.addModal.hidden;
    if (modalOpen) {
      if (e.key === 'Escape') {
        closeModal();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startPresentation();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  window.addEventListener('message', handleMessage);
  document.addEventListener('DOMContentLoaded', () => {
    initPresenterDisplayPicker();
    setPresenterState(false);
    init();
  });
})();






