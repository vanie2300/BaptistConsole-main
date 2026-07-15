// ======== GLOBAL STATE ========

let bibleFlat = null;              // flat JSON from kjv1611.json
let bible = {};                    // structured: bible[bookSlug][chapter][verse]
let bookMeta = {};                 // bookSlug -> { displayName, chapters: [], verseCounts: {} }
let bookOrder = [];                // ordered list of book slugs

let currentBook = null;
let currentChapter = null;
let currentVerse = null;
let liveVerse = null;
let previewOnSelect = true;

let isSearchResultsMode = false;
let searchResults = [];
let lastSearchQuery = "";

let presentWindow = null;
let presenterStatusTimer = null;
let presenterWindowId = 0;
const PRESENTER_BIAS_DEFAULT = 1.3;
let presenterFitBias = PRESENTER_BIAS_DEFAULT;
let presenterAutoDisplayId = null;
let presenterDisplayLabel = "";
let presenterDisplayIsAuto = true;

const RECENT_SEARCH_KEY = "bibleRecentSearches";
const MAX_RECENT_SEARCHES = 5;

// separate font sizes
let centerFontSizePx = 50;
let presenterFontSizePx = 90;
const CENTER_FONT_MIN = 18;
const CENTER_FONT_MAX = 96;
const PRESENTER_FONT_MIN = 36;
const PRESENTER_FONT_MAX = 800;
const PRESENTER_BIAS_MIN = 0.7;
const PRESENTER_BIAS_MAX = 1.55;
const PRESENTER_BIAS_STEP = 0.06;

// cached DOM elements
const els = {};

// ======== INIT ========

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  wireEvents();
  initPreviewToggle();
  initPresenterDisplayPicker();
  applyCenterFontSize(centerFontSizePx);
  setPresenterState(false);
  loadBibleData();
});

// ======== DOM CACHE ========

function cacheDom() {
  els.bookSelect        = document.getElementById("bookSelect");
  els.chapterSelect     = document.getElementById("chapterSelect");
  els.verseSelect       = document.getElementById("verseSelect");
  els.displayBtn        = document.getElementById("displayBtn");
  els.previewToggle     = document.getElementById("previewToggle");
  els.presentStatus     = document.getElementById("presentStatus");
  els.presenterDisplayWrap = document.getElementById("presenterDisplayWrap");
  els.presenterDisplayPicker = document.getElementById("presenterDisplayPicker");

  els.searchToggle      = document.getElementById("searchToggle");
  els.searchDropdown    = document.getElementById("searchDropdown");
  els.searchScope       = document.getElementById("searchScope");
  els.searchInput       = document.getElementById("searchInput");
  els.searchSubmit      = document.getElementById("searchSubmit");
  els.searchClear       = document.getElementById("searchClear");
  els.searchResultHint  = document.getElementById("searchResultHint");

  els.currentReference  = document.getElementById("currentReference");
  els.currentText       = document.getElementById("currentText");
  els.verseBody         = document.querySelector(".verse-body");

  els.prevVerseBtn      = document.getElementById("prevVerseBtn");
  els.nextVerseBtn      = document.getElementById("nextVerseBtn");

  els.fontMinus         = document.getElementById("fontMinus");
  els.fontPlus          = document.getElementById("fontPlus");
  els.fontAuto          = document.getElementById("fontAuto");

  els.statusMessage     = document.getElementById("statusMessage");

  els.versesHeader      = document.getElementById("versesHeader");
  els.versesSubHeader   = document.getElementById("versesSubHeader");
  els.versesList        = document.getElementById("versesList");
}

// ======== EVENT WIRING ========

function wireEvents() {
  // Dropdowns
  els.bookSelect.addEventListener("change", onBookChange);
  els.chapterSelect.addEventListener("change", onChapterChange);
  els.verseSelect.addEventListener("change", onVerseChange);

  // Search toggle
  els.searchToggle.addEventListener("click", toggleSearchDropdown);

  // Search actions
  els.searchSubmit.addEventListener("click", runSearch);
  els.searchClear.addEventListener("click", clearSearch);
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });
  els.searchInput.addEventListener("input", () => updateSearchHint());

  if (els.displayBtn) {
    els.displayBtn.addEventListener("click", displayCurrentVerse);
  }
  if (els.previewToggle) {
    els.previewToggle.addEventListener("change", onPreviewToggleChange);
  }

  // Prev / next
  els.prevVerseBtn.addEventListener("click", goToPrevVerse);
  els.nextVerseBtn.addEventListener("click", goToNextVerse);

  // Font size buttons
  if (els.fontMinus) {
    els.fontMinus.addEventListener("click", () => {
      // center -1, presenter fit bias down
      centerFontSizePx = Math.max(CENTER_FONT_MIN, centerFontSizePx - 1);
      presenterFitBias = clampPresenterBias(presenterFitBias - PRESENTER_BIAS_STEP);
      applyCenterFontSize(centerFontSizePx);
      setPresenterState(isPresenterOpen());
      pushLiveVerseToPresenter();
    });
  }

  if (els.fontPlus) {
    els.fontPlus.addEventListener("click", () => {
      // center +1, presenter fit bias up
      centerFontSizePx = Math.min(CENTER_FONT_MAX, centerFontSizePx + 1);
      presenterFitBias = clampPresenterBias(presenterFitBias + PRESENTER_BIAS_STEP);
      applyCenterFontSize(centerFontSizePx);
      setPresenterState(isPresenterOpen());
      pushLiveVerseToPresenter();
    });
  }

  if (els.fontAuto) {
    els.fontAuto.addEventListener("click", () => {
      presenterFitBias = PRESENTER_BIAS_DEFAULT;
      setPresenterState(isPresenterOpen());
      pushLiveVerseToPresenter();
    });
  }

  // Keyboard arrows for prev/next (not in inputs)
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNextVerse();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrevVerse();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.searchDropdown && !els.searchDropdown.hidden) {
      closeSearchDropdown();
    }
  });

  window.addEventListener("resize", () => {
    if (window._resizeTimer) cancelAnimationFrame(window._resizeTimer);
    window._resizeTimer = requestAnimationFrame(() => {
      autoFitCenterText(centerFontSizePx);
    });
  });
}

// ======== SETTINGS FROM SHELL ========

let appSettings = {};

window.addEventListener("message", (evt) => {
  if (!evt.data || evt.data.type !== "settingsUpdate") return;
  appSettings = evt.data.settings || {};
  applyBibleSettings();
});

function applyBibleSettings() {
  const versesList = els.versesList;
  if (versesList) {
    // Show/hide verse numbers
    versesList.classList.toggle("hide-verse-numbers", appSettings.showVerseNumbers === false);
    // Highlight active verse
    versesList.classList.toggle("no-highlight-verse", appSettings.highlightVerse === false);
  }
  // Bible font size → update presenter font size
  if (appSettings.bibleFontSize) {
    presenterFontSizePx = appSettings.bibleFontSize;
  }
  // Projection font
  if (appSettings.projectionFont && appSettings.projectionFont !== "system-ui") {
    const fontMap = {
      "Inter, sans-serif": "Inter, sans-serif",
      "Georgia, serif": "Georgia, serif",
      "'Times New Roman', serif": "'Times New Roman', serif",
    };
    const mapped = fontMap[appSettings.projectionFont] || appSettings.projectionFont;
    document.documentElement.style.setProperty("--font-main", mapped);
  }
}

function openSearchDropdown() {
  if (!els.searchDropdown) return;
  els.searchDropdown.hidden = false;
  requestAnimationFrame(() => {
    els.searchDropdown.classList.add("is-open");
  });
  updateSearchHint();
}

function closeSearchDropdown() {
  if (!els.searchDropdown) return;
  els.searchDropdown.classList.remove("is-open");
  const fallback = setTimeout(() => {
    if (!els.searchDropdown.classList.contains("is-open")) {
      els.searchDropdown.hidden = true;
    }
  }, 260);
  els.searchDropdown.addEventListener("transitionend", function handler() {
    if (!els.searchDropdown.classList.contains("is-open")) {
      els.searchDropdown.hidden = true;
    }
    clearTimeout(fallback);
    els.searchDropdown.removeEventListener("transitionend", handler);
  });
}

function toggleSearchDropdown() {
  if (!els.searchDropdown) return;
  if (els.searchDropdown.hidden || !els.searchDropdown.classList.contains("is-open")) {
    openSearchDropdown();
  } else {
    closeSearchDropdown();
  }
}

// ======== PREVIEW TOGGLE ========

function initPreviewToggle() {
  const stored = localStorage.getItem("biblePreviewOnSelect");
  if (stored !== null) {
    previewOnSelect = stored === "true";
  }
  if (els.previewToggle) {
    els.previewToggle.checked = previewOnSelect;
  }
}

function onPreviewToggleChange() {
  previewOnSelect = Boolean(els.previewToggle?.checked);
  try {
    localStorage.setItem("biblePreviewOnSelect", String(previewOnSelect));
  } catch (e) {}
  if (previewOnSelect && isPresenterOpen()) {
    const location = getCurrentLocation();
    if (location) {
      setLiveVerse(location.book, location.chapter, location.verse);
      pushLiveVerseToPresenter();
    }
  }
}

// ======== PRESENTER DISPLAY PICKER ========

function initPresenterDisplayPicker() {
  const api = window.presenterApi;
  if (!api || !els.presenterDisplayWrap || !els.presenterDisplayPicker) return;

  const stored = localStorage.getItem("biblePresenterDisplayId");
  const storedId = stored ? Number(stored) : null;
  let autoLabel = "";

  const formatLabel = (display, index) => {
    const size = display.size || display.bounds || {};
    const labelBase = display.isPrimary ? "Primary" : `Display ${index + 1}`;
    if (size.width && size.height) {
      return `${labelBase} (${size.width}x${size.height})`;
    }
    return labelBase;
  };

  const pickAutoDisplay = (displays) =>
    displays.find((display) => !display.isPrimary) || displays[0] || null;

  api.getDisplays().then((displays) => {
    if (!Array.isArray(displays) || displays.length === 0) return;
    els.presenterDisplayWrap.hidden = false;
    els.presenterDisplayPicker.innerHTML = '<option value="">Default Display</option>';
    displays.forEach((display, index) => {
      const option = document.createElement("option");
      option.value = String(display.id);
      option.textContent = formatLabel(display, index);
      if (storedId && display.id === storedId) {
        option.selected = true;
      }
      els.presenterDisplayPicker.appendChild(option);
    });

    const autoDisplay = pickAutoDisplay(displays);
    presenterAutoDisplayId = autoDisplay ? autoDisplay.id : null;
    if (autoDisplay) {
      autoLabel = formatLabel(autoDisplay, displays.findIndex((d) => d.id === autoDisplay.id));
    }

    if (storedId) {
      const storedDisplay = displays.find((display) => display.id === storedId);
      if (storedDisplay) {
        presenterDisplayIsAuto = false;
        presenterDisplayLabel = formatLabel(
          storedDisplay,
          displays.findIndex((d) => d.id === storedId)
        );
        els.presenterDisplayPicker.value = String(storedId);
        api.setPresenterDisplay(storedId);
      } else {
        presenterDisplayIsAuto = true;
        presenterDisplayLabel = autoLabel;
        if (presenterAutoDisplayId) {
          els.presenterDisplayPicker.value = String(presenterAutoDisplayId);
          api.setPresenterDisplay(presenterAutoDisplayId);
        }
      }
    } else if (presenterAutoDisplayId) {
      presenterDisplayIsAuto = true;
      presenterDisplayLabel = autoLabel;
      els.presenterDisplayPicker.value = String(presenterAutoDisplayId);
      api.setPresenterDisplay(presenterAutoDisplayId);
    } else {
      presenterDisplayIsAuto = true;
      presenterDisplayLabel = "";
    }

    setPresenterState(isPresenterOpen());
  }).catch(() => {});

  els.presenterDisplayPicker.addEventListener("change", () => {
    const value = els.presenterDisplayPicker.value;
    if (!value) {
      localStorage.removeItem("biblePresenterDisplayId");
      api.setPresenterDisplay(null);
      presenterDisplayIsAuto = true;
      presenterDisplayLabel = autoLabel;
      setPresenterState(isPresenterOpen());
      return;
    }
    const displayId = Number(value);
    localStorage.setItem("biblePresenterDisplayId", String(displayId));
    api.setPresenterDisplay(displayId);
    presenterDisplayIsAuto = false;
    presenterDisplayLabel = els.presenterDisplayPicker.selectedOptions[0]?.textContent || "";
    setPresenterState(isPresenterOpen());
  });
}

// ======== LOAD BIBLE DATA ========

async function loadBibleData() {
  try {
    els.statusMessage.textContent = "Loading Bible data...";

    const res = await fetch("kjv1611.json");
    if (!res.ok) throw new Error("Failed to load kjv1611.json");
    bibleFlat = await res.json();

    buildBibleStructure();
    setupRecentSearches();
    populateBookSelect();
    setupSearchSuggestions();
    restoreLastLocation();

    els.statusMessage.textContent =
      'Ready. Select a verse or search (e.g. "John 3:16" or keyword).';
  } catch (err) {
    console.error(err);
    els.statusMessage.textContent = "Error loading Bible data.";
  }
}

// ======== STRUCTURE BIBLE ========

function buildBibleStructure() {
  bible = {};
  bookMeta = {};
  bookOrder = [];

  const seenBooks = new Set();

  for (const [key, value] of Object.entries(bibleFlat)) {
    const m = key.match(/(.+?)\s+(\d+):(\d+)$/);
    if (!m) continue;

    const rawBook = m[1];
    const chapter = Number(m[2]);
    const verse = Number(m[3]);
    const bookSlug = normalizeBookName(rawBook);

    if (!seenBooks.has(bookSlug)) {
      seenBooks.add(bookSlug);
      bookOrder.push(bookSlug);

      const ref = value.reference || "";
      const refMatch = ref.match(/^(.+?)\s+\d+:\d+$/);
      const displayName = refMatch ? refMatch[1] : capitalizeWords(rawBook);

      bible[bookSlug] = {};
      bookMeta[bookSlug] = {
        displayName,
        chapters: new Set(),
        verseCounts: {},
      };
    }

    if (!bible[bookSlug][chapter]) {
      bible[bookSlug][chapter] = {};
    }

    const meta = bookMeta[bookSlug];
    const displayName = meta.displayName;

    bible[bookSlug][chapter][verse] = {
      text: value.text || "",
      reference: value.reference || `${displayName} ${chapter}:${verse}`,
    };

    meta.chapters.add(chapter);
    const currentMax = meta.verseCounts[chapter] || 0;
    if (verse > currentMax) {
      meta.verseCounts[chapter] = verse;
    }
  }

  for (const meta of Object.values(bookMeta)) {
    meta.chapters = Array.from(meta.chapters).sort((a, b) => a - b);
  }
}

// ======== DROPDOWNS ========

function populateBookSelect() {
  clearOptions(els.bookSelect, "Select a book...");
  for (const slug of bookOrder) {
    const opt = document.createElement("option");
    opt.value = slug;
    opt.textContent = bookMeta[slug].displayName;
    els.bookSelect.appendChild(opt);
  }
}

function populateChapterSelect(bookSlug) {
  clearOptions(els.chapterSelect, "Select a chapter...");
  els.chapterSelect.disabled = true;

  if (!bookSlug || !bookMeta[bookSlug]) return;
  for (const ch of bookMeta[bookSlug].chapters) {
    const opt = document.createElement("option");
    opt.value = String(ch);
    opt.textContent = String(ch);
    els.chapterSelect.appendChild(opt);
  }
  els.chapterSelect.disabled = false;
}

function populateVerseSelect(bookSlug, chapter) {
  clearOptions(els.verseSelect, "Select a verse...");
  els.verseSelect.disabled = true;

  if (!bookSlug || !chapter || !bible[bookSlug] || !bible[bookSlug][chapter]) {
    return;
  }

  const versesObj = bible[bookSlug][chapter];
  const verseNumbers = Object.keys(versesObj)
    .map(Number)
    .sort((a, b) => a - b);

  for (const v of verseNumbers) {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    els.verseSelect.appendChild(opt);
  }

  els.verseSelect.disabled = false;
}

function clearOptions(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);
}

// ======== DROPDOWN HANDLERS ========

function onBookChange() {
  const slug = els.bookSelect.value || null;
  currentBook = slug;
  currentChapter = null;
  currentVerse = null;
  isSearchResultsMode = false;

  populateChapterSelect(slug);
  clearOptions(els.verseSelect, "Select a verse...");
  els.verseSelect.disabled = true;
  els.versesList.innerHTML = "";
  updateVerseDisplay(null);
  updateVersesHeader();
  saveLastLocation();
}

function onChapterChange() {
  if (!currentBook) return;
  const chapter = Number(els.chapterSelect.value) || null;
  currentChapter = chapter;
  currentVerse = null;
  isSearchResultsMode = false;

  populateVerseSelect(currentBook, currentChapter);
  renderChapterVerses(currentBook, currentChapter);
  updateVerseDisplay(null);
  updateVersesHeader();

  if (chapter && bible[currentBook][chapter] && bible[currentBook][chapter][1]) {
    currentVerse = 1;
    els.verseSelect.value = "1";
    maybePreviewVerse(bible[currentBook][chapter][1]);
    highlightCurrentVerseRow(true);
  }

  saveLastLocation();
}

function onVerseChange() {
  if (!currentBook || !currentChapter) return;
  const verse = Number(els.verseSelect.value) || null;
  if (!verse) return;

  currentVerse = verse;
  const verseObj = bible[currentBook][currentChapter][currentVerse];
  maybePreviewVerse(verseObj);
  isSearchResultsMode = false;
  renderChapterVerses(currentBook, currentChapter);
  highlightCurrentVerseRow(true);

  saveLastLocation();
}

// ======== RIGHT PANEL RENDERING ========

function renderChapterVerses(bookSlug, chapter) {
  els.versesList.innerHTML = "";
  if (!bookSlug || !chapter || !bible[bookSlug] || !bible[bookSlug][chapter]) {
    els.versesSubHeader.textContent = "Select a book and chapter to view verses.";
    return;
  }

  const versesObj = bible[bookSlug][chapter];
  const verseNumbers = Object.keys(versesObj)
    .map(Number)
    .sort((a, b) => a - b);

  for (const v of verseNumbers) {
    const verseData = versesObj[v];
    const row = document.createElement("div");
    row.className = "verse-row";
    row.dataset.book = bookSlug;
    row.dataset.chapter = String(chapter);
    row.dataset.verse = String(v);

    const num = document.createElement("div");
    num.className = "verse-row-number";
    num.textContent = v;

    const txt = document.createElement("div");
    txt.className = "verse-row-text";
    txt.textContent = verseData.text;

    row.appendChild(num);
    row.appendChild(txt);

    row.addEventListener("click", () => {
      goToVerse(bookSlug, chapter, v);
    });

    els.versesList.appendChild(row);
  }

  highlightCurrentVerseRow(false);
  applyBibleSettings();
}

function renderSearchResults(list) {
  els.versesList.innerHTML = "";
  if (!list || list.length === 0) {
    els.versesSubHeader.textContent = "No results for that search.";
    return;
  }

  for (const item of list) {
    const row = document.createElement("div");
    row.className = "verse-row";
    row.dataset.book = item.bookSlug;
    row.dataset.chapter = String(item.chapter);
    row.dataset.verse = String(item.verse);

    const num = document.createElement("div");
    num.className = "verse-row-number";
    num.textContent = `${item.chapter}:${item.verse}`;

    const txt = document.createElement("div");
    txt.className = "verse-row-text";
    const refSpan = document.createElement("span");
    refSpan.className = "search-ref";
    refSpan.textContent = `${item.reference} - `;
    txt.appendChild(refSpan);
    appendHighlightedText(txt, item.text, lastSearchQuery);

    row.appendChild(num);
    row.appendChild(txt);

    row.addEventListener("click", () => {
      isSearchResultsMode = false;
      goToVerse(item.bookSlug, item.chapter, item.verse);
    });

    els.versesList.appendChild(row);
  }
  applyBibleSettings();
}

function appendHighlightedText(container, text, query) {
  if (!query) {
    container.appendChild(document.createTextNode(text));
    return;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mark = document.createElement("mark");
    mark.className = "search-highlight";
    mark.textContent = text.slice(match.index, match.index + match[0].length);
    container.appendChild(mark);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

// highlight & auto-scroll
function highlightCurrentVerseRow(scrollIntoView = true) {
  const rows = els.versesList.querySelectorAll(".verse-row");
  rows.forEach((r) => r.classList.remove("active"));

  if (!currentBook || !currentChapter || !currentVerse) return;

  const selector = `.verse-row[data-book="${currentBook}"][data-chapter="${currentChapter}"][data-verse="${currentVerse}"]`;
  const activeRow = els.versesList.querySelector(selector);
  if (activeRow) {
    activeRow.classList.add("active");
    if (scrollIntoView) {
      activeRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

// ======== CENTER VERSE DISPLAY ========

function updateVerseDisplay(verseData) {
  if (!verseData) {
    els.currentReference.textContent = "No verse selected";
    els.currentText.textContent =
      "Select a book, chapter, and verse from the left, or use the search dropdown above.";
    autoFitCenterText(centerFontSizePx);
    return;
  }
  els.currentReference.textContent = verseData.reference || "Verse";
  els.currentText.textContent = verseData.text || "";
  autoFitCenterText(centerFontSizePx);
}

function getCurrentVerseData() {
  if (!currentBook || !currentChapter || !currentVerse) return null;
  if (!bible[currentBook] || !bible[currentBook][currentChapter]) return null;
  return bible[currentBook][currentChapter][currentVerse] || null;
}

function getCurrentLocation() {
  if (!currentBook || !currentChapter || !currentVerse) return null;
  return {
    book: currentBook,
    chapter: currentChapter,
    verse: currentVerse,
  };
}

function setLiveVerse(book, chapter, verse) {
  const verseData = bible?.[book]?.[chapter]?.[verse];
  if (!verseData) return false;
  liveVerse = {
    book,
    chapter,
    verse,
    reference: verseData.reference || "",
    text: verseData.text || "",
  };
  return true;
}

function hasLiveVerse() {
  return Boolean(liveVerse && liveVerse.book && liveVerse.chapter && liveVerse.verse);
}

function isPresenterOpen() {
  return Boolean(presentWindow && !presentWindow.closed);
}

function showLiveVerse(book, chapter, verse) {
  if (!setLiveVerse(book, chapter, verse)) return;
  goToVerse(book, chapter, verse, true);
  pushLiveVerseToPresenter();
}

function maybePreviewVerse(verseData, force = false) {
  if (!verseData) {
    updateVerseDisplay(null);
    return;
  }
  updateVerseDisplay(verseData);
  if (previewOnSelect && isPresenterOpen()) {
    const location = getCurrentLocation();
    if (location) {
      setLiveVerse(location.book, location.chapter, location.verse);
      pushLiveVerseToPresenter();
    }
  }
}

function displayCurrentVerse() {
  const verseData = getCurrentVerseData();
  const location = getCurrentLocation();
  if (!verseData) {
    if (els.statusMessage) {
      els.statusMessage.textContent = "Select a verse to display.";
    }
    return;
  }
  updateVerseDisplay(verseData);
  if (location) {
    setLiveVerse(location.book, location.chapter, location.verse);
  }
  openPresenterWindow();
  pushLiveVerseToPresenter();
}

// ======== SEARCH ========

function runSearch() {
  if (!bibleFlat) return;

  const mode = document.querySelector('input[name="searchMode"]:checked')?.value || "reference";
  const scope = els.searchScope.value || "bible";
  const query = (els.searchInput.value || "").trim();

  if (!query) return;

  if (mode === "reference") {
    lastSearchQuery = "";
    if (!goToReference(query)) {
      els.statusMessage.textContent = 'Could not find reference. Try "John 3:16".';
      setSearchHint(`No match for "${query}".`);
    } else {
      setSearchHint(`Found ${query}.`);
    }
  } else {
    lastSearchQuery = query;
    searchResults = keywordSearch(query, scope);
    isSearchResultsMode = true;
    els.versesHeader.textContent = "Search Results";
    els.versesSubHeader.textContent = `${searchResults.length} result(s) for "${query}"`;
    renderSearchResults(searchResults);
    setSearchHint(`${searchResults.length} result(s) for "${query}".`);
  }

  addRecentSearch({ mode, scope, query });
}

function clearSearch() {
  els.searchInput.value = "";
  isSearchResultsMode = false;
  lastSearchQuery = "";
  updateVersesHeader();
  setSearchHint("Cleared.");

  if (currentBook && currentChapter) {
    renderChapterVerses(currentBook, currentChapter);
  } else {
    els.versesList.innerHTML = "";
  }
}

function setSearchHint(message) {
  if (els.searchResultHint) {
    els.searchResultHint.textContent = message;
  }
}

function updateSearchHint() {
  const query = (els.searchInput?.value || "").trim();
  if (!query) {
    setSearchHint("Ready to search.");
  } else {
    setSearchHint(`Searching for "${query}"...`);
  }
}

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list) {
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list));
  } catch (e) {}
}

function addRecentSearch(item) {
  const list = getRecentSearches();
  const normalized = {
    mode: item.mode,
    scope: item.scope,
    query: item.query,
  };
  const filtered = list.filter(
    (entry) =>
      entry.query !== normalized.query ||
      entry.mode !== normalized.mode ||
      entry.scope !== normalized.scope
  );
  filtered.unshift(normalized);
  saveRecentSearches(filtered.slice(0, MAX_RECENT_SEARCHES));
  setupRecentSearches();
}

function setupRecentSearches() {
  let dataList = document.getElementById("searchSuggestions");
  if (!dataList) {
    dataList = document.createElement("datalist");
    dataList.id = "searchSuggestions";
    document.body.appendChild(dataList);
  }

  dataList.innerHTML = "";
  const recent = getRecentSearches();
  for (const item of recent) {
    const opt = document.createElement("option");
    opt.value = item.query;
    opt.label = `${item.mode === "reference" ? "Ref" : "Keyword"} | ${item.scope}`;
    dataList.appendChild(opt);
  }
}

// reference search: "John 3:16"
function goToReference(refString) {
  const match = refString.trim().match(/(.+?)\s+(\d+):(\d+)$/i);
  if (!match) return false;

  const rawBook = match[1];
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  const bookSlug = normalizeBookName(rawBook);

  if (!bookMeta[bookSlug]) return false;
  if (!bible[bookSlug] || !bible[bookSlug][chapter] || !bible[bookSlug][chapter][verse]) return false;

  goToVerse(bookSlug, chapter, verse, true);
  return true;
}

// keyword search, sorted Genesis -> Revelation
function keywordSearch(query, scope) {
  const q = query.toLowerCase();
  const results = [];

  const inBook = scope === "book" ? currentBook : null;
  const inChapter = scope === "chapter" ? currentChapter : null;

  for (const [key, value] of Object.entries(bibleFlat)) {
    if (!value || !value.text) continue;
    const textLower = value.text.toLowerCase();
    if (!textLower.includes(q)) continue;

    const m = key.match(/(.+?)\s+(\d+):(\d+)$/);
    if (!m) continue;

    const bookSlug = normalizeBookName(m[1]);
    const ch = Number(m[2]);
    const vs = Number(m[3]);

    if (inBook && bookSlug !== inBook) continue;
    if (inChapter && ch !== inChapter) continue;

    results.push({
      bookSlug,
      chapter: ch,
      verse: vs,
      reference: value.reference,
      text: value.text,
    });
  }

  results.sort((a, b) => {
    const ia = bookOrder.indexOf(a.bookSlug);
    const ib = bookOrder.indexOf(b.bookSlug);
    if (ia !== ib) return ia - ib;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return results;
}

// ======== SEARCH SUGGESTIONS ========

function setupSearchSuggestions() {
  const input = els.searchInput;
  if (!input) return;

  let dataList = document.getElementById("searchSuggestions");
  if (!dataList) {
    dataList = document.createElement("datalist");
    dataList.id = "searchSuggestions";
    document.body.appendChild(dataList);
  }
  input.setAttribute("list", "searchSuggestions");
  dataList.innerHTML = "";

  const recent = getRecentSearches();
  for (const item of recent) {
    const opt = document.createElement("option");
    opt.value = item.query;
    opt.label = `${item.mode === "reference" ? "Ref" : "Keyword"} | ${item.scope}`;
    dataList.appendChild(opt);
  }

  for (const slug of bookOrder) {
    const opt = document.createElement("option");
    opt.value = bookMeta[slug].displayName;
    dataList.appendChild(opt);
  }

  const examples = ["John 3:16", "Psalm 23:1", "love", "faith", "grace"];
  for (const ex of examples) {
    const opt = document.createElement("option");
    opt.value = ex;
    dataList.appendChild(opt);
  }
}

// ======== VERSE NAV HELPERS ========

function goToVerse(bookSlug, chapter, verse, forcePreview = false) {
  if (!bible[bookSlug] || !bible[bookSlug][chapter] || !bible[bookSlug][chapter][verse]) {
    return;
  }

  currentBook = bookSlug;
  currentChapter = chapter;
  currentVerse = verse;

  els.bookSelect.value = bookSlug;
  populateChapterSelect(bookSlug);
  els.chapterSelect.value = String(chapter);
  populateVerseSelect(bookSlug, chapter);
  els.verseSelect.value = String(verse);

  updateVersesHeader();
  const verseData = bible[bookSlug][chapter][verse];
  maybePreviewVerse(verseData, forcePreview);

  isSearchResultsMode = false;
  renderChapterVerses(bookSlug, chapter);
  highlightCurrentVerseRow(true);

  saveLastLocation();
}

function getNextLocation(book, chapter, verse) {
  const meta = bookMeta[book];
  if (!meta) return null;

  const chapterVerses = meta.verseCounts;
  let b = book;
  let ch = chapter;
  let vs = verse + 1;

  if (vs > (chapterVerses[ch] || 0)) {
    const chapters = meta.chapters;
    const idx = chapters.indexOf(ch);
    if (idx >= 0 && idx < chapters.length - 1) {
      ch = chapters[idx + 1];
      vs = 1;
    } else {
      const bIndex = bookOrder.indexOf(book);
      if (bIndex >= 0 && bIndex < bookOrder.length - 1) {
        b = bookOrder[bIndex + 1];
        const bMeta = bookMeta[b];
        ch = bMeta.chapters[0];
        vs = 1;
      } else {
        return null;
      }
    }
  }

  if (bible[b] && bible[b][ch] && bible[b][ch][vs]) {
    return { book: b, chapter: ch, verse: vs };
  }
  return null;
}

function getPrevLocation(book, chapter, verse) {
  const meta = bookMeta[book];
  if (!meta) return null;

  const chapterVerses = meta.verseCounts;
  let b = book;
  let ch = chapter;
  let vs = verse - 1;

  if (vs <= 0) {
    const chapters = meta.chapters;
    const idx = chapters.indexOf(ch);
    if (idx > 0) {
      ch = chapters[idx - 1];
      vs = chapterVerses[ch];
    } else {
      const bIndex = bookOrder.indexOf(book);
      if (bIndex > 0) {
        b = bookOrder[bIndex - 1];
        const bMeta = bookMeta[b];
        ch = bMeta.chapters[bMeta.chapters.length - 1];
        vs = bMeta.verseCounts[ch];
      } else {
        return null;
      }
    }
  }

  if (bible[b] && bible[b][ch] && bible[b][ch][vs]) {
    return { book: b, chapter: ch, verse: vs };
  }
  return null;
}

function goToNextVerse() {
  const useLive = hasLiveVerse() && isPresenterOpen();
  const source = useLive ? liveVerse : getCurrentLocation();
  if (!source) return;

  const next = getNextLocation(source.book, source.chapter, source.verse);
  if (!next) return;

  if (useLive) {
    showLiveVerse(next.book, next.chapter, next.verse);
  } else {
    goToVerse(next.book, next.chapter, next.verse, true);
  }
}

function goToPrevVerse() {
  const useLive = hasLiveVerse() && isPresenterOpen();
  const source = useLive ? liveVerse : getCurrentLocation();
  if (!source) return;

  const prev = getPrevLocation(source.book, source.chapter, source.verse);
  if (!prev) return;

  if (useLive) {
    showLiveVerse(prev.book, prev.chapter, prev.verse);
  } else {
    goToVerse(prev.book, prev.chapter, prev.verse, true);
  }
}

// ======== HEADERS / STATUS ========

function updateVersesHeader() {
  if (isSearchResultsMode) {
    els.versesHeader.textContent = "Search Results";
    return;
  }
  if (!currentBook || !currentChapter) {
    els.versesHeader.textContent = "Verses";
    els.versesSubHeader.textContent =
      "Select a book and chapter to view verses.";
  } else {
    const name = bookMeta[currentBook].displayName;
    els.versesHeader.textContent = `${name} ${currentChapter}`;
    els.versesSubHeader.textContent = "Click a verse to show it.";
  }
}

// ======== FONT SIZE HELPERS ========

function applyCenterFontSize(px) {
  els.currentText.style.fontSize = px + "px";
  autoFitCenterText(px);
}

function autoFitCenterText(maxPx = centerFontSizePx) {
  if (!els.currentText || !els.verseBody) return;
  const textEl = els.currentText;
  const container = els.verseBody;
  let fontSize = maxPx;
  textEl.style.fontSize = fontSize + "px";

  requestAnimationFrame(() => {
    const maxHeight = container.clientHeight;
    const maxWidth = container.clientWidth;
    let guard = 200;
    while ((textEl.scrollHeight > maxHeight || textEl.scrollWidth > maxWidth) && fontSize > CENTER_FONT_MIN && guard > 0) {
      fontSize -= 1;
      textEl.style.fontSize = fontSize + "px";
      guard -= 1;
    }
  });
}

function setPresenterState(isOpen) {
  if (els.presentStatus) {
    const mode = `Auto (${Math.round(presenterFitBias * 100)}%)`;
    els.presentStatus.textContent = `${isOpen ? "Presenter: On" : "Presenter: Off"} \u2022 ${mode}`;
    els.presentStatus.classList.toggle("is-active", isOpen);
  }
  if (els.fontAuto) {
    els.fontAuto.classList.toggle("active", Math.abs(presenterFitBias - PRESENTER_BIAS_DEFAULT) < 0.01);
  }
  if (els.displayBtn) {
    els.displayBtn.textContent = isOpen ? "Display Active" : "Display Verse";
  }
}

function clampPresenterBias(value) {
  return Math.min(PRESENTER_BIAS_MAX, Math.max(PRESENTER_BIAS_MIN, value));
}

function monitorPresenterWindow() {
  if (presenterStatusTimer) return;
  presenterStatusTimer = setInterval(() => {
    if (presentWindow && presentWindow.closed) {
      presentWindow = null;
      setPresenterState(false);
      clearInterval(presenterStatusTimer);
      presenterStatusTimer = null;
    }
  }, 1000);
}



// ======== PRESENTER POPUP ========

function openPresenterWindow() {
  const api = window.presenterApi;
  if (api) {
    const stored = localStorage.getItem("biblePresenterDisplayId");
    const storedId = stored ? Number(stored) : null;
    const preferredId = storedId ?? presenterAutoDisplayId ?? null;
    api.setPresenterDisplay(preferredId);
  }

  if (presentWindow && !presentWindow.closed) {
    presentWindow.focus();
    setPresenterState(true);
    monitorPresenterWindow();
    return;
  }

  presentWindow = window.open("", "bible-presenter", "width=1024,height=768");
  if (!presentWindow) {
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  const initialData = liveVerse || {
    reference: els.currentReference.textContent || "",
    text: els.currentText.textContent || "",
  };
  const initialRef = initialData.reference || "";
  const initialText = initialData.text || "";
  const initialSize = presenterFontSizePx + "px";
  const initialFitBias = presenterFitBias;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bible Presenter</title>
  <link rel="stylesheet" href="../theme.css?v=5">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-main, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    }
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      padding: clamp(12px, 2.2vw, 28px);
    }
    #presentRef {
      font-size: clamp(0.58rem, 1vw, 0.9rem);
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 0.9rem;
      text-align: center;
      max-width: min(92vw, 1400px);
    }
    #presentText {
      font-size: ${initialSize};
      font-weight: 600;
      line-height: 1.16;
      text-align: center;
      width: min(94vw, 1800px);
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div id="presentRef"></div>
  <div id="presentText"></div>
  <script>
    function applyThemeFromStorage() {
      const theme = localStorage.getItem('globalTheme');
      document.documentElement.classList.toggle('theme-light', theme === 'light');
    }

    function requestFullscreenSafe() {
      try {
        if (document.fullscreenElement) return;
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        }
      } catch (err) {
        // Ignore fullscreen errors (browser policy, etc).
      }
    }

    const isElectron = navigator.userAgent.toLowerCase().includes('electron');
    function maximizeWindow() {
      if (isElectron) return;
      try {
        window.moveTo(0, 0);
        window.resizeTo(screen.availWidth, screen.availHeight);
      } catch (err) {
        // Ignore resize errors (browser policy, etc).
      }
    }

    const FIT_FONT_MIN = ${PRESENTER_FONT_MIN};
    const FIT_FONT_MAX = ${PRESENTER_FONT_MAX};
    const FIT_BIAS_MIN = ${PRESENTER_BIAS_MIN};
    const FIT_BIAS_MAX = ${PRESENTER_BIAS_MAX};

    let lastRequestedSize = ${presenterFontSizePx};
    let fitBias = ${initialFitBias};
    let fitRaf = null;
    let fitTimers = [];

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function parsePx(value, fallback) {
      const num = Number.parseFloat(value);
      return Number.isFinite(num) ? num : fallback;
    }

    function overflows(textEl, availableWidth, availableHeight) {
      return textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth;
    }

    function getAvailableSpace(refEl) {
      const bodyRect = document.body.getBoundingClientRect();
      const bodyStyle = getComputedStyle(document.body);
      const refStyle = getComputedStyle(refEl);

      const paddingX = (parseFloat(bodyStyle.paddingLeft) || 0) + (parseFloat(bodyStyle.paddingRight) || 0);
      const paddingY = (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
      const refMargins = (parseFloat(refStyle.marginTop) || 0) + (parseFloat(refStyle.marginBottom) || 0);

      const width = Math.floor(bodyRect.width - paddingX - 8);
      const height = Math.floor(bodyRect.height - paddingY - refEl.offsetHeight - refMargins - 8);

      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    function runFitNow() {
      fitPresenterText(lastRequestedSize);
    }

    function clearFitQueue() {
      if (fitRaf !== null) {
        cancelAnimationFrame(fitRaf);
        fitRaf = null;
      }
      for (const timerId of fitTimers) {
        clearTimeout(timerId);
      }
      fitTimers = [];
    }

    function schedulePresenterFit() {
      clearFitQueue();
      fitRaf = requestAnimationFrame(runFitNow);
      // Fullscreen/monitor moves can settle over a few frames.
      for (const delay of [90, 220]) {
        const timerId = setTimeout(() => {
          requestAnimationFrame(runFitNow);
        }, delay);
        fitTimers.push(timerId);
      }
    }

    function fitPresenterText(maxPx) {
      const textEl = document.getElementById('presentText');
      const refEl = document.getElementById('presentRef');
      if (!textEl || !refEl) return;

      const space = getAvailableSpace(refEl);
      if (!space) return;

      const minDim = Math.max(1, Math.min(window.innerHeight || space.height, window.innerWidth || space.width));
      const normalizedBias = clamp(fitBias, FIT_BIAS_MIN, FIT_BIAS_MAX);
      const coverage = clamp(0.965 + (normalizedBias - 1) * 0.14, 0.86, 0.995);
      const availableWidth = Math.max(1, Math.floor(space.width * coverage));
      const availableHeight = Math.max(1, Math.floor(space.height * coverage));
      const dynamicMaxBase = Math.round(
        clamp(Math.min(minDim * 0.58, availableHeight * 0.98, availableWidth * 0.64), FIT_FONT_MIN + 20, FIT_FONT_MAX)
      );
      const requestedMax = parsePx(maxPx, dynamicMaxBase);
      const biasedMax = Math.round(Math.max(dynamicMaxBase, requestedMax) * normalizedBias);
      const upperBound = clamp(biasedMax, FIT_FONT_MIN, FIT_FONT_MAX);

      textEl.style.width = '100%';
      textEl.style.maxWidth = availableWidth + 'px';

      textEl.style.fontSize = upperBound + 'px';
      const widthRatio = textEl.scrollWidth / availableWidth;
      const heightRatio = textEl.scrollHeight / availableHeight;
      const overflowRatio = Math.max(1, widthRatio, heightRatio);

      let high = Math.max(FIT_FONT_MIN, Math.floor(upperBound / overflowRatio));
      textEl.style.fontSize = high + 'px';
      while (high > FIT_FONT_MIN && overflows(textEl, availableWidth, availableHeight)) {
        high -= 2;
        textEl.style.fontSize = high + 'px';
      }

      let low = FIT_FONT_MIN;
      let best = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        textEl.style.fontSize = mid + 'px';
        if (!overflows(textEl, availableWidth, availableHeight)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (best === 0) {
        // Emergency fallback: prefer fitting without clipping over preferred minimum.
        let emergency = FIT_FONT_MIN;
        while (emergency > 16 && overflows(textEl, availableWidth, availableHeight)) {
          emergency -= 1;
          textEl.style.fontSize = emergency + 'px';
        }
        best = emergency;
      }

      textEl.style.fontSize = best + 'px';
    }

    function updateVerse(data) {
      if (!data) return;
      if (data.fitBias !== undefined) {
        const incomingBias = Number.parseFloat(data.fitBias);
        if (Number.isFinite(incomingBias)) {
          fitBias = clamp(incomingBias, FIT_BIAS_MIN, FIT_BIAS_MAX);
        }
      }
      if (data.reference !== undefined) {
        document.getElementById('presentRef').textContent = data.reference || '';
      }
      if (data.text !== undefined) {
        document.getElementById('presentText').textContent = data.text || '';
      }
      if (data.size) {
        const requested = parsePx(data.size, ${presenterFontSizePx});
        lastRequestedSize = requested;
        document.getElementById('presentText').style.fontSize = requested + 'px';
      }
      schedulePresenterFit();
    }
    window.addEventListener('message', function(evt) {
      if (!evt.data || evt.data.type !== 'verseUpdate') return;
      updateVerse(evt.data);
    });
    window.addEventListener('storage', function(evt) {
      if (evt.key === 'globalTheme') {
        applyThemeFromStorage();
      }
    });
    window.addEventListener('keydown', function(evt) {
      if (evt.key === 'Escape') {
        window.close();
      }
    });
    window.addEventListener('load', function() {
      applyThemeFromStorage();
      maximizeWindow();
      requestFullscreenSafe();
      schedulePresenterFit();
    });
    window.addEventListener('resize', function() {
      schedulePresenterFit();
    });
    document.addEventListener('fullscreenchange', function() {
      schedulePresenterFit();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', schedulePresenterFit);
    }
    window.addEventListener('beforeunload', function() {
      clearFitQueue();
    });
    window.addEventListener('click', requestFullscreenSafe);
    updateVerse(${JSON.stringify({
      reference: initialRef,
      text: initialText,
      size: initialSize,
      fitBias: initialFitBias,
    })});
  <\/script>
</body>
</html>
    `;
  presentWindow.document.open();
  presentWindow.document.write(html);
  presentWindow.document.close();
  const myWindowId = ++presenterWindowId;
  presentWindow.addEventListener("beforeunload", () => {
    if (presenterWindowId === myWindowId) {
      presentWindow = null;
      setPresenterState(false);
      if (presenterStatusTimer) {
        clearInterval(presenterStatusTimer);
        presenterStatusTimer = null;
      }
    }
  });
  setPresenterState(true);
  monitorPresenterWindow();
}

function pushLiveVerseToPresenter() {
  if (!presentWindow || presentWindow.closed) return;
  const verse = liveVerse || getCurrentVerseData();
  if (!verse) return;
  const payload = {
    type: "verseUpdate",
    reference: verse.reference || "",
    text: verse.text || "",
    size: presenterFontSizePx + "px",
    fitBias: presenterFitBias,
  };
  presentWindow.postMessage(payload, "*");
}

// ======== SAVE / RESTORE LAST LOCATION ========

function saveLastLocation() {
  const data = {
    book: currentBook,
    chapter: currentChapter,
    verse: currentVerse,
  };
  try {
    localStorage.setItem("bibleLastLocation", JSON.stringify(data));
  } catch (e) {}
}

function restoreLastLocation() {
  try {
    const raw = localStorage.getItem("bibleLastLocation");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.book || !bible[data.book]) return;
    const ch = data.chapter;
    const vs = data.verse;
    if (!bible[data.book][ch] || !bible[data.book][ch][vs]) return;
    goToVerse(data.book, ch, vs, true);
  } catch (e) {
    console.warn("Could not restore last location", e);
  }
}

// ======== HELPERS ========

function normalizeBookName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function capitalizeWords(str) {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}


