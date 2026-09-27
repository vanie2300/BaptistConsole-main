(() => {
  'use strict';

  // Cleans undesired content from the KJV 1611 verse data.
  //  1. Pilcrow (¶ / U+00B6): paragraph markers, encoded as literal chars or \u00b6 escapes.
  //  2. Square brackets [ ]: KJV italics markers around translator-added words.
  //  3. Psalm superscriptions (musical/introductory notes prefixed to verse 1),
  //     e.g. "A Psalm of David.", "To the chief Musician...", "A Song of
  //     degrees.", "ALEPH.". These are NOT deleted: they are extracted into a
  //     separate `title` field on the verse so the app can show them optionally
  //     with its own styling. Verses that begin with real text are untouched.
  // Usage: node scripts/clean-kjv.js [path-to-kjv1611.json]
  // Default path: bible/kjv1611.json

  const fs = require('fs');
  const path = require('path');

  const filePath = path.resolve(process.argv[2] || 'bible/kjv1611.json');

  // Verse-1 text that starts with any of these is a superscription, not a verse.
  const NOTE_PREFIX = /^(To the chief Musician|A Psalm|A Song|A Prayer|Maschil|Michtam|Shiggaion|A Song of degrees|David's Psalm|ALEPH)/;
  // Psalm 18's note runs on into the verse; the retained verse starts after this.
  const PSALM_18_NOTE_END = 'from the hand of Saul: And he said,';
  // Verses that start with real text (e.g. "Praise ye the LORD") are NOT notes.
  const NO_NOTE = new Set([106, 111, 112, 113, 135, 146, 147, 148, 149, 150]);

  const raw = fs.readFileSync(filePath, 'utf8');
  const pilcrowsBefore = (raw.match(/\\u00b6|¶/g) || []).length;
  const bracketsBefore = (raw.match(/[\[\]]/g) || []).length;

  const data = JSON.parse(raw);

  let notesRemoved = 0;

  function cleanSymbols(value) {
    if (typeof value === 'string') {
      // Drop pilcrows and brackets (and any whitespace they carried), then collapse spaces.
      return value.replace(/[¶\[\]]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (Array.isArray(value)) {
      return value.map(cleanSymbols);
    }
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value)) out[key] = cleanSymbols(value[key]);
      return out;
    }
    return value;
  }

  function cleanVerse(key, verse) {
    if (typeof verse !== 'object' || verse === null || typeof verse.text !== 'string') {
      return verse;
    }
    const text = cleanSymbols(verse.text);
    const m = /^psalms (\d+):1$/.exec(key);
    if (!m || NO_NOTE.has(Number(m[1])) || !NOTE_PREFIX.test(text)) {
      return Object.assign({}, verse, { text });
    }

    let note;
    if (Number(m[1]) === 18) {
      const idx = text.indexOf(PSALM_18_NOTE_END);
      if (idx === -1) return Object.assign({}, verse, { text });
      note = text.slice(0, idx + PSALM_18_NOTE_END.length);
    } else {
      const b = /[.!?]/.exec(text);
      if (!b) return Object.assign({}, verse, { text });
      note = text.slice(0, b.index + 1);
    }
    notesRemoved++;
    const cleaned = Object.assign({}, verse, { text: text.slice(note.length).trim() });
    cleaned.title = note.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  const cleaned = {};
  for (const key of Object.keys(data)) {
    cleaned[key] = cleanVerse(key, data[key]);
  }

  const outRaw = JSON.stringify(cleaned, null, 2) + '\n';
  const pilcrowsAfter = (outRaw.match(/\\u00b6|¶/g) || []).length;
  const bracketsAfter = (outRaw.match(/[\[\]]/g) || []).length;

  fs.writeFileSync(filePath, outRaw, 'utf8');

  console.log(`Pilcrows removed: ${pilcrowsBefore - pilcrowsAfter}`);
  console.log(`Brackets removed: ${bracketsBefore - bracketsAfter}`);
  console.log(`Psalm titles extracted: ${notesRemoved}`);
  console.log(`Output: ${filePath}`);
})();