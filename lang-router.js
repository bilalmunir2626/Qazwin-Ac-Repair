/* ============================================================================
   Qazwin AC Repair — Language + URL Router  (v3, hardened)

   v3 changes:
     - Language button and options now use EVENT DELEGATION on document.
       The previous version bound handlers with querySelectorAll at load time,
       so if this file was placed in <head> (or before the navbar markup),
       langBtn came back null and the dropdown silently did nothing.
     - Whole thing waits for DOMContentLoaded when needed.
     - history.pushState wrapped in try/catch — it throws a SecurityError on
       file:// origins, which killed the click handler mid-way when testing
       locally without a server.
     - Added window.qazwinDebugLang() to check wiring from the console.

   Ownership split:
     lang-router.js -> language system, URL/hash routing, smooth scroll
     main.js        -> navbar state, hamburger, reveal, slider, ticker
   ========================================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'qazwin_lang';
  var SECTIONS = ['home', 'services', 'why-us', 'how-it-works', 'reviews'];
  var currentLang = 'en';
  var suppressSpyUntil = 0;

  /* ==========================================================
     0. DOM READY GUARD
     ========================================================== */

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* ==========================================================
     1. URL MODEL
     Language -> ?lang=en|ar   Section -> #why-us
     Separate namespaces so they can never overwrite each other.
     ========================================================== */

  function buildUrl(hash, lang) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang || currentLang);
      url.hash = hash || '';
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return hash || '';
    }
  }

  // Every history write goes through here. file:// throws SecurityError.
  function writeUrl(hash, push) {
    try {
      var target = buildUrl(hash, currentLang);
      if (push) {
        history.pushState(null, '', target);
      } else {
        history.replaceState(null, '', target);
      }
    } catch (e) {
      // Local file testing — fall back to a plain hash so nav still works
      if (hash && window.location.hash !== hash) {
        try { window.location.hash = hash; } catch (e2) {}
      }
    }
  }

  function sectionFromHash() {
    var id = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
    return SECTIONS.indexOf(id) !== -1 ? id : '';
  }

  function navHeight() {
    var nav = document.getElementById('navbar');
    return nav ? nav.offsetHeight : 0;
  }

  function scrollToSection(id, smooth) {
    var el = document.getElementById(id);
    if (!el) return false;
    var top = el.getBoundingClientRect().top + window.pageYOffset - navHeight() - 8;
    window.scrollTo({ top: top < 0 ? 0 : top, behavior: smooth ? 'smooth' : 'auto' });
    return true;
  }

  // Class names match main.js initHamburger()
  function closeMobileMenu() {
    var menu = document.getElementById('mobileMenu');
    var burger = document.getElementById('hamburger');
    if (menu) {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
    }
    if (burger) {
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  }

  /* ==========================================================
     2. APPLY LANGUAGE
     Preserves the section hash instead of overwriting it.
     ========================================================== */

  function applyLanguage(lang) {
    var isAr = lang === 'ar';
    var html = document.getElementById('htmlRoot') || document.documentElement;
    currentLang = isAr ? 'ar' : 'en';

    html.setAttribute('lang', isAr ? 'ar' : 'en');
    html.setAttribute('dir', isAr ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-en], [data-ar]').forEach(function (el) {
      var val = isAr ? el.getAttribute('data-ar') : el.getAttribute('data-en');
      if (!val) return;
      if (val.indexOf('<') !== -1) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    var metaLang = document.querySelector('meta[name="language"]');
    if (metaLang) metaLang.setAttribute('content', isAr ? 'Arabic' : 'English');

    var metaDesc = document.querySelector('meta[name="description"]');
    if (isAr) {
      document.title = 'قزوين لتصليح المكيفات الكويت | أفضل خدمة تصليح مكيفات | 97904179';
      if (metaDesc) metaDesc.setAttribute('content', 'قزوين لتصليح المكيفات في الكويت — أكثر خدمة تصليح مكيفات موثوقة. تصليح مكيفات سبليت ومركزية وشحن غاز وصيانة في نفس اليوم. اتصل 97904179. نخدم جميع محافظات الكويت.');
    } else {
      document.title = 'Qazwin AC Repair Kuwait | Best AC Repair Service in Kuwait | 97904179';
      if (metaDesc) metaDesc.setAttribute('content', "Qazwin AC Repair Kuwait — Kuwait's #1 trusted AC repair service. Same-day split AC repair, central AC service, gas refill & maintenance. Call 97904179. Serving all Kuwait governorates.");
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://qazwinacrepair.com/' + (isAr ? '?lang=ar' : ''));
    }

    var label = document.getElementById('langLabel');
    if (label) label.textContent = isAr ? 'AR' : 'EN';

    document.querySelectorAll('.lang-option').forEach(function (opt) {
      opt.classList.toggle('active', opt.getAttribute('data-lang') === currentLang);
    });

    writeUrl(window.location.hash, false);

    try { localStorage.setItem(STORAGE_KEY, currentLang); } catch (e) {}
  }

  // Exposed so main.js can re-translate cloned ticker nodes
  window.qazwinApplyLanguage = applyLanguage;

  /* ==========================================================
     3. LANGUAGE DROPDOWN — delegated, placement-proof
     No querySelectorAll binding at load time, so it cannot
     silently fail when markup isn't parsed yet.
     ========================================================== */

  function getDropdown() { return document.getElementById('langDropdown'); }
  function getLangBtn()  { return document.getElementById('langBtn'); }

  function setDropdown(open) {
    var dd = getDropdown();
    var btn = getLangBtn();
    if (dd) dd.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  function closeLangDropdown() { setDropdown(false); }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // Clicked the EN/AR toggle button
    if (e.target.closest('#langBtn, .lang-btn')) {
      var dd = getDropdown();
      setDropdown(!(dd && dd.classList.contains('open')));
      return;
    }

    // Clicked a language option
    var opt = e.target.closest('.lang-option');
    if (opt) {
      var chosen = opt.getAttribute('data-lang');
      if (chosen) applyLanguage(chosen);
      closeLangDropdown();
      return;
    }

    // Clicked anywhere else
    if (!e.target.closest('#langSwitcher, .lang-switcher')) {
      closeLangDropdown();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangDropdown();
  });

  /* ==========================================================
     4. THE URL FIX — anchor clicks that actually write the URL
     Capture phase so it beats any stray handler in main.js.
     ========================================================== */

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var raw = link.getAttribute('href') || '';
    if (raw === '#') return;

    var id = raw.slice(1).replace(/^\//, '');
    if (!id || !document.getElementById(id)) return;   // leave unknown anchors alone

    e.preventDefault();
    e.stopPropagation();

    writeUrl('#' + id, true);          // <- this is what main.js was missing

    suppressSpyUntil = Date.now() + 900;
    scrollToSection(id, true);
    closeMobileMenu();
    closeLangDropdown();
  }, true);   // capture phase — do not change to false

  /* ==========================================================
     5. BACK / FORWARD BUTTONS
     ========================================================== */

  window.addEventListener('popstate', function () {
    var id = sectionFromHash();
    if (id) {
      suppressSpyUntil = Date.now() + 900;
      scrollToSection(id, true);
    }
  });

  /* ==========================================================
     6. SCROLL SPY — URL only
     Nav-link .active highlighting stays in main.js section 1.
     ========================================================== */

  var spyTicking = false;

  function syncHashToScroll() {
    spyTicking = false;
    if (Date.now() < suppressSpyUntil) return;

    var line = navHeight() + 30;
    var active = '';

    for (var i = 0; i < SECTIONS.length; i++) {
      var el = document.getElementById(SECTIONS[i]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { active = SECTIONS[i]; break; }
    }

    if (window.innerHeight + window.pageYOffset >= document.body.scrollHeight - 4) {
      active = SECTIONS[SECTIONS.length - 1];
    }

    var wanted = active ? '#' + active : '';
    if (window.location.hash !== wanted) writeUrl(wanted, false);
  }

  window.addEventListener('scroll', function () {
    if (!spyTicking) {
      spyTicking = true;
      requestAnimationFrame(syncHashToScroll);
    }
  }, { passive: true });

  /* ==========================================================
     7. INIT
     ========================================================== */

  function detectLang() {
    try {
      var q = (new URLSearchParams(window.location.search).get('lang') || '').toLowerCase();
      if (q === 'ar' || q === 'en') return q;
    } catch (e) {}

    var hash = (window.location.hash || '').toLowerCase();
    if (hash === '#/ar' || hash === '#ar') return 'ar';
    if (hash === '#/en' || hash === '#en') return 'en';

    var path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path.endsWith('/ar')) return 'ar';
    if (path.endsWith('/en')) return 'en';

    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') return saved;
    } catch (e) {}

    return 'en';
  }

  ready(function () {
    var initialHash = (window.location.hash || '').toLowerCase();
    var isLegacyLangHash = ['#/ar', '#ar', '#/en', '#en'].indexOf(initialHash) !== -1;
    var deepLinkSection = isLegacyLangHash ? '' : sectionFromHash();

    applyLanguage(detectLang());

    if (isLegacyLangHash) writeUrl('', false);

    if (deepLinkSection) {
      suppressSpyUntil = Date.now() + 1500;
      window.addEventListener('load', function () {
        setTimeout(function () { scrollToSection(deepLinkSection, false); }, 80);
      });
    }
  });

  /* ==========================================================
     8. DEBUG HELPER — run qazwinDebugLang() in the console
     ========================================================== */

  window.qazwinDebugLang = function () {
    var report = {
      langBtn:     !!document.getElementById('langBtn'),
      langDropdown:!!document.getElementById('langDropdown'),
      langSwitcher:!!document.getElementById('langSwitcher'),
      langOptions: document.querySelectorAll('.lang-option').length,
      optionValues: Array.prototype.map.call(
        document.querySelectorAll('.lang-option'),
        function (o) { return o.getAttribute('data-lang'); }
      ),
      dropdownOpen: !!(getDropdown() && getDropdown().classList.contains('open')),
      currentLang: currentLang,
      readyState: document.readyState
    };
    console.table(report);
    return report;
  };
})();