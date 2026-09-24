(function () {
  'use strict';

  /* ── Theme toggle ── */

  var root = document.documentElement;

  function applyTheme(theme) {
    root.classList.toggle('theme-dark', theme === 'dark');
    var btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function propagateTheme() {
    var theme = root.classList.contains('theme-dark') ? 'dark' : 'light';
    var links = document.querySelectorAll('.site-nav a');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href || href.charAt(0) === '#') continue;
      var file = href.split('#')[0];
      var anchor = href.indexOf('#') !== -1 ? '#' + href.split('#').slice(1).join('#') : '';
      if (!/\.html$/i.test(file)) continue;
      file = file.replace(/([?&])theme=(dark|light)/g, '');
      var sep = file.indexOf('?') !== -1 ? '&' : '?';
      links[i].setAttribute('href', file + sep + 'theme=' + theme + anchor);
    }
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('docs-theme'); } catch (e) {}
    if (!saved) {
      var n = window.name;
      if (n && n.indexOf('bc-theme:') === 0) saved = n.slice(9);
    }
    if (!saved) {
      var m = window.location.search.match(/[?&]theme=(dark|light)/);
      if (m) saved = m[1];
    }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = (saved === 'dark' || saved === 'light') ? saved : (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    window.name = 'bc-theme:' + theme;
    if (window.location.search && window.history.replaceState) {
      try { window.history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) {}
    }
    propagateTheme();
  })();

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var isDark = root.classList.contains('theme-dark');
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('docs-theme', next); } catch (e) {}
      window.name = 'bc-theme:' + next;
      propagateTheme();
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === 'docs-theme') {
      applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
      propagateTheme();
    }
  });

  /* ── Back to top ── */

  var btn = document.createElement('button');
  btn.id = 'backToTop';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '&uarr;';
  document.body.appendChild(btn);

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ── Copy to clipboard on pre blocks ── */

  var blocks = document.querySelectorAll('pre');
  blocks.forEach(function (pre) {
    var copy = document.createElement('button');
    copy.className = 'copy-btn';
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', 'Copy code block');
    pre.appendChild(copy);
    pre.classList.add('has-copy');

    copy.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : pre.innerText;
      function done() {
        copy.textContent = 'Copied!';
        copy.classList.add('copied');
        setTimeout(function () {
          copy.textContent = 'Copy';
          copy.classList.remove('copied');
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });
})();