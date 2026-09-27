(() => {
  const refs = {
    search: document.getElementById('searchBox'),
    hymnList: document.getElementById('hymnList'),
    currentSlide: document.getElementById('currentSlide'),
    nextSlide: document.getElementById('nextSlide'),
    thumbnails: document.getElementById('thumbnails'),
    currentHymnTitle: document.getElementById('currentHymnTitle'),
    currentHymnVerse: document.getElementById('currentHymnVerse'),
    currentHymnTotal: document.getElementById('currentHymnTotal'),
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
    presenterWindows: new Map(),
  };

let presenterStatusTimer = null;
  let presenterAutoDisplayId = null;
  let presenterDisplayLabel = '';
  let displayPicker = null;

  const setStatus = (msg, isError = false) => {
    refs.status.textContent = msg || '';
    refs.status.classList.toggle('error', Boolean(isError));
  };

const setPresenterState = (isOpen) => {
    if (refs.presentStatus) {
      const parts = [isOpen ? 'Live' : 'Off'];
      if (presenterDisplayLabel) parts.push(presenterDisplayLabel);
      refs.presentStatus.textContent = parts.join(' · ');
      refs.presentStatus.classList.toggle('is-active', isOpen);
    }
    if (refs.presentBtn) {
      refs.presentBtn.textContent = isOpen ? 'Active' : 'Present';
    }
  };

const monitorPresenterWindow = () => {
    if (presenterStatusTimer) return;
    presenterStatusTimer = setInterval(() => {
      const before = state.presenterWindows.size;
      prunePresenterWindows();
      if (state.presenterWindows.size === 0) {
        setPresenterState(false);
        if (presenterStatusTimer) {
          clearInterval(presenterStatusTimer);
          presenterStatusTimer = null;
        }
        return;
      }
      if (state.presenterWindows.size !== before) setPresenterState(true);
    }, 1000);
  };

  const prunePresenterWindows = () => {
    for (const [id, win] of state.presenterWindows) {
      if (!win || win.closed) state.presenterWindows.delete(id);
    }
  };

  const forEachPresenterWindow = (fn) => {
    for (const [id, win] of state.presenterWindows) {
      if (win && !win.closed && fn) fn(win, id);
    }
  };

  const isPresenterOpen = () => {
    prunePresenterWindows();
    return state.presenterWindows.size > 0;
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
    if (!lines || !lines.length) return 4;
    const longLines = lines.filter((line) => line.length > 35).length;
    const ratio = longLines / lines.length;
    if (ratio === 0) return 4;
    if (ratio <= 0.3) return 3;
    return 2;
  };

  const buildSlidesFromLines = (type, lines, number = null) => {
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

const getHymnSettings = () => ({
    align: localStorage.getItem('settings_hymnAlign') || 'left',
    layout: localStorage.getItem('settings_hymnLayout') || 'full',
    showNumbers: localStorage.getItem('settings_hymnShowNumbers') !== 'false',
    titleSize: Number(localStorage.getItem('settings_hymnTitleSize')) || 7,
    fontSize: Number(localStorage.getItem('settings_hymnFontSize')) || 7,
    transition: localStorage.getItem('settings_hymnTransition') || 'none',
  });

  const slideToHtml = (slide, mode = 'current') => {
    const wrapper = document.createElement('div');
    wrapper.className = 'resizable-text';
    const settings = getHymnSettings();
    wrapper.style.textAlign = settings.align;
    if (settings.layout === 'compact' && mode !== 'thumb') {
      wrapper.style.maxWidth = '70%';
    }
    if (slide.type === 'title') {
      const titleSizeStyle =
        mode === 'thumb'
          ? 'font-size:inherit'
          : `font-size:${settings.titleSize}vw`;
      wrapper.innerHTML = `<div class="slide-title" style="${titleSizeStyle}">${escapeHtml(slide.title)}</div>`;
    } else {
      const label = slide.type === 'chorus' ? 'Chorus' : `Verse ${slide.number}`;
      const content = (slide.lines || []).map(escapeHtml).join('<br>');
      wrapper.innerHTML = `${settings.showNumbers ? `<div class="verse-label">${label}</div>` : ''}${content}`;
    }

    let fontSize;
    if (mode === 'current') fontSize = (3 * (settings.fontSize / 7)).toFixed(2) + 'vw';
    else if (mode === 'next') fontSize = '1.4rem';
    else fontSize = '0.8rem';
    wrapper.style.fontSize = fontSize;
    return wrapper.outerHTML;
  };

const renderList = () => {
    refs.hymnList.innerHTML = '';
    const query = refs.search.value.trim();
    state.filtered.forEach((hymn, idx) => {
      const row = document.createElement('button');
      row.className = 'hymn-row';
      row.type = 'button';
      row.innerHTML = highlightMatch(hymn.title, query);
      if (state.selectedId && (hymn.id === state.selectedId || hymn.title === state.selectedId)) {
        row.classList.add('active');
      }
      row.addEventListener('click', () => selectHymn(idx));
      refs.hymnList.appendChild(row);
    });
  };

  const highlightMatch = (text, query) => {
    if (!query) return escapeHtml(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHtml(text).replace(
      new RegExp(`(${escaped})`, 'ig'),
      '<mark class="search-match">$1</mark>'
    );
  };

  const renderSlides = () => {
    if (!state.slides.length) return;
    const current = state.slides[state.currentIndex] || { lines: ['End of hymn'] };
    const next = state.slides[state.currentIndex + 1];

    refs.currentSlide.innerHTML = slideToHtml(current, 'current');
    if (current.type === 'title') {
      fitCurrentTitle();
    } else {
      fitFrameText(refs.currentSlide, 14);
    }
    refs.nextSlide.innerHTML = next ? slideToHtml(next, 'next') : '<em>End of hymn</em>';
    fitFrameText(refs.nextSlide, 11);
    if (refs.currentHymnVerse) {
      const totalVerses = state.slides.reduce((m, s) => (s.type === 'verse' ? Math.max(m, s.number || 0) : m), 0);
      let label;
      if (current.type === 'title') label = 'Title';
      else if (current.type === 'verse') {
        label = current.number === totalVerses ? 'Last verse' : `${current.number}/${totalVerses}`;
      }
      else if (current.type === 'chorus') label = 'Chorus';
      else label = '—';
      refs.currentHymnVerse.textContent = label;
    }

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
  };

  const fitCurrentTitle = () => {
    const title = refs.currentSlide.querySelector('.slide-title');
    if (!title) return;
    let size = getHymnSettings().titleSize;
    const frameStyle = getComputedStyle(refs.currentSlide);
    const availW =
      refs.currentSlide.clientWidth -
      parseFloat(frameStyle.paddingLeft) -
      parseFloat(frameStyle.paddingRight);
    const availH =
      refs.currentSlide.clientHeight -
      parseFloat(frameStyle.paddingTop) -
      parseFloat(frameStyle.paddingBottom);
    if (!availW || !availH) return;
    title.style.fontSize = size + 'vw';
    while (
      size > 4 &&
      (title.scrollWidth > availW || title.offsetHeight > availH)
    ) {
      size = Math.round((size - 0.25) * 100) / 100;
      title.style.fontSize = size + 'vw';
    }
  };

  const fitFrameText = (frame, minSize = 11) => {
    if (!frame) return;
    const text = frame.querySelector('.resizable-text');
    if (!text) return;
    const frameStyle = getComputedStyle(frame);
    const availW =
      frame.clientWidth -
      parseFloat(frameStyle.paddingLeft) -
      parseFloat(frameStyle.paddingRight);
    const availH =
      frame.clientHeight -
      parseFloat(frameStyle.paddingTop) -
      parseFloat(frameStyle.paddingBottom);
    if (!availW || !availH) return;
    const base = parseFloat(getComputedStyle(text).fontSize) || 16;
    let size = base;
    text.style.fontSize = size + 'px';
    let guard = 0;
    while (
      size > minSize &&
      (text.scrollHeight > availH || text.scrollWidth > availW) &&
      guard++ < 60
    ) {
      size = Math.round((size - 0.5) * 100) / 100;
      text.style.fontSize = size + 'px';
    }
  };

  const navigate = (step) => {
    if (!state.slides.length) return;
    const nextIndex = Math.min(Math.max(0, state.currentIndex + step), state.slides.length - 1);
    if (nextIndex === state.currentIndex) return;
state.currentIndex = nextIndex;
    renderSlides();
    forEachPresenterWindow((win) => {
      win.postMessage({ type: 'navigate', currentIndex: state.currentIndex }, '*');
    });
  };

  const selectHymn = (idx) => {
    state.selectedIndex = idx;
    const hymn = state.filtered[idx];
    state.selectedId = hymn.id ?? hymn.title;
    state.slides = buildSlides(hymn);
    state.currentIndex = 0;
    if (refs.currentHymnTitle) refs.currentHymnTitle.textContent = hymn.title;
    if (refs.currentHymnTotal) refs.currentHymnTotal.textContent = String((hymn.verses || []).length);
    renderSlides();
    renderList();
    updateDeleteState();
  };

  const filterList = () => {
    const query = refs.search.value.toLowerCase();
    state.filtered = state.hymns.filter((h) => h.title.toLowerCase().includes(query));
    if (state.selectedId !== null) {
      const nextIndex = state.filtered.findIndex(
        (h) => (h.id ?? h.title) === state.selectedId
      );
      state.selectedIndex = nextIndex >= 0 ? nextIndex : null;
    } else {
      state.selectedIndex = null;
    }
    renderList();
    updateDeleteState();
  };

const startPresentation = () => {
    if (!state.slides.length) return;
    const api = window.presenterApi;
    const selected = getSelectedPresenterDisplayIds();
    const targets = selected.length > 0 ? selected : [null];

    const sendInitTo = (win) => {
      win.postMessage({
        type: 'init',
        slides: state.slides,
        currentIndex: state.currentIndex,
        ...getHymnSettings(),
      }, '*');
    };

    let touched = false;
    targets.forEach((displayId) => {
      const existing = state.presenterWindows.get(displayId);
      if (existing && !existing.closed) {
        existing.focus();
        sendInitTo(existing);
        touched = true;
        return;
      }
      const name = displayId == null ? 'HymnPresentation-auto' : `HymnPresentation-d${displayId}`;
      const popup = window.open('presentation.html', name, 'width=960,height=720');
      if (!popup) {
        if (displayId == null && api) {
          const stored = localStorage.getItem('presenterDisplayId');
          api.setPresenterDisplay(stored ? Number(stored) : presenterAutoDisplayId ?? null);
        }
        return;
      }
      popup.onload = () => sendInitTo(popup);
      setTimeout(() => sendInitTo(popup), 300);
      state.presenterWindows.set(displayId, popup);
      popup.addEventListener('beforeunload', () => {
        state.presenterWindows.delete(displayId);
        setPresenterState(isPresenterOpen());
        monitorPresenterWindow();
      });
      touched = true;
    });

    if (!touched) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }
    setPresenterState(isPresenterOpen());
    monitorPresenterWindow();
  };

const handleMessage = (event) => {
    const data = event.data || {};
    if (data.type === 'navigateFromPopup') {
      let isFromPresenter = false;
      forEachPresenterWindow((win) => {
        if (event.source === win) isFromPresenter = true;
      });
      if (isFromPresenter) {
        state.currentIndex = data.currentIndex;
        renderSlides();
        forEachPresenterWindow((win) => {
          if (event.source !== win) {
            win.postMessage({ type: 'navigate', currentIndex: state.currentIndex }, '*');
          }
        });
      }
      return;
    }
    if (event.source !== window.parent) return;
    if (data.type === 'hymnSettingsUpdate') {
      renderSlides();
    }
    if (data.type === 'settingsUpdate' || data.type === 'hymnSettingsUpdate') {
      forEachPresenterWindow((win) => {
        win.postMessage(data, '*');
      });
    }
  };

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
    refs.search.value = '';
    filterList();
    setStatus(`Added "${newHymn.title}". Saving hymns.json...`);
    try {
      await persistHymns();
      setStatus(`Added "${newHymn.title}".`);
    } catch (err) {
      console.error(err);
      state.hymns = state.hymns.filter((h) => h !== newHymn);
      if (state.selectedId === (newHymn.id ?? newHymn.title)) {
        state.selectedId = null;
        state.selectedIndex = null;
        state.slides = [];
        refs.currentSlide.innerHTML = '<em>Select a hymn...</em>';
        refs.nextSlide.innerHTML = '';
        refs.thumbnails.innerHTML = '';
        refs.prevBtn.disabled = true;
        refs.nextBtn.disabled = true;
        refs.presentBtn.disabled = true;
      }
      filterList();
      setStatus('Could not save hymns.json; hymn rolled back.', true);
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
      URL.revokeObjectURL(url);
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
      state.hymns.push(hymn);
      state.hymns.sort((a, b) => a.title.localeCompare(b.title));
      filterList();
      const restoredIndex = state.filtered.findIndex((h) => h === hymn);
      if (restoredIndex >= 0) {
        state.selectedIndex = restoredIndex;
        state.selectedId = hymn.id ?? hymn.title;
        selectHymn(restoredIndex);
      }
      setStatus('Could not save hymns.json; deletion rolled back.', true);
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
    } catch (err) {
      console.error(err);
      setStatus('Could not load hymns.json.', true);
      refs.search.disabled = true;
    }
  };

const onPickerChange = (s) => {
    presenterDisplayLabel = s.label || '';
    presenterAutoDisplayId = s.autoDisplayId ?? null;
    setPresenterState(isPresenterOpen());
  };

  const initPresenterDisplayPicker = () => {
    const api = window.presenterApi;
    if (!api || !refs.presenterDisplayWrap || !refs.presenterDisplayPicker || !window.DisplayPicker) return;
    if (displayPicker) return;
    displayPicker = window.DisplayPicker.create(refs.presenterDisplayPicker, {
      api,
      onChange: onPickerChange,
    });
  };

  const getSelectedPresenterDisplayIds = () => {
    return displayPicker ? displayPicker.getSelectedIds() : [];
  };

  refs.search.addEventListener('input', filterList);
  refs.prevBtn.addEventListener('click', () => navigate(-1));
  refs.nextBtn.addEventListener('click', () => navigate(1));
  refs.presentBtn.addEventListener('click', startPresentation);
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
    const modalOpen = Boolean(refs.addModal && !refs.addModal.hidden);
    if (e.key === 'Escape') {
      if (modalOpen) {
        e.preventDefault();
        closeModal();
      }
      return;
    }
    if (modalOpen) return;
    const tag = e.target && e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startPresentation();
    }
  });

  window.addEventListener('message', handleMessage);
  document.addEventListener('DOMContentLoaded', () => {
    initPresenterDisplayPicker();
    setPresenterState(false);
    init();
  });
})();






