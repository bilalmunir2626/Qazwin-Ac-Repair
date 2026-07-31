/**
 * QAZWIN AC REPAIR KUWAIT — main.js
 * Pure Vanilla JavaScript (no frameworks)
 *
 * Loads AFTER lang-router.js. Ownership split:
 *   lang-router.js  -> language system, URL/hash routing, smooth scroll
 *   main.js         -> navbar state, hamburger, reveal, slider, ticker, misc
 *
 * CHANGELOG (this revision)
 *  - REMOVED initSmoothScroll(): its e.preventDefault() cancelled the browser's
 *    hash navigation, which is why the URL never updated. lang-router.js now
 *    owns anchor clicks and writes the URL with history.pushState().
 *  - Ticker no longer clones itself on every resize event (DOM growth + it
 *    reverted cloned items to English while in Arabic mode).
 *  - Lazy-load no longer targets the above-the-fold logo (was hurting LCP).
 *  - .review-card removed from scroll-reveal: cards sitting outside the
 *    viewport inside the carousel never fired the observer and stayed at
 *    opacity 0 as they slid into view.
 *  - Reveal stagger capped so late items don't wait ~2s to appear.
 *  - Active-link selector no longer matches header#navbar.
 */

'use strict';

/* =============================================
   1. NAVBAR — Scroll effect & active state
   ============================================= */
(function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link, .mob-link');
  // FIX: was 'main section[id], header[id]' — header[id] matched #navbar itself
  const sections = document.querySelectorAll('main section[id]');

  if (!navbar) return;

  let ticking = false;

  function highlightActiveLink() {
    let current = '';
    const line = navbar.offsetHeight + 30;

    sections.forEach(section => {
      const r = section.getBoundingClientRect();
      if (r.top <= line) current = section.getAttribute('id');
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', !!current && href === '#' + current);
    });
  }

  function onScroll() {
    ticking = false;
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    highlightActiveLink();
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  onScroll(); // run once on load
})();


/* =============================================
   2. HAMBURGER MENU — Mobile toggle
   ============================================= */
(function initHamburger() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  // Hash links are closed by lang-router.js; these are the tel:/wa.me ones
  const mobLinks   = document.querySelectorAll('.mob-link, .mob-cta a');

  if (!hamburger || !mobileMenu) return;

  function toggleMenu(open) {
    hamburger.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(!mobileMenu.classList.contains('open'));
  });

  mobLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      toggleMenu(false);
    }
  });

  // Close on Escape for keyboard users
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(false);
  });
})();


/* =============================================
   3. SMOOTH SCROLL — REMOVED
   ---------------------------------------------
   This block used to live here:

     e.preventDefault();
     window.scrollTo({ top: targetTop, behavior: 'smooth' });

   preventDefault() cancelled the browser's hash navigation and nothing
   wrote the URL back, so clicking "Why Us" scrolled but left the address
   bar unchanged. lang-router.js now handles anchor clicks, applies the
   navbar offset, and calls history.pushState().

   DO NOT re-add a second smooth-scroll handler here — two of them fight
   over window.scrollTo and cause visible jitter.
   ============================================= */


/* =============================================
   4. SCROLL REVEAL — fade-in on scroll
   ============================================= */
(function initScrollReveal() {
  // NOTE: .review-card intentionally excluded — those cards live inside a
  // transform-driven carousel, so off-screen ones never trigger the observer
  // and would stay permanently invisible as they slide in.
  const revealTargets = [
    '.service-card',
    '.why-item',
    '.step-card',
    '.stat-item',
    '.section-header',
    '.contact-box',
    '.footer-brand',
    '.footer-col',
  ];

  // Respect users who asked for reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  revealTargets.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      // FIX: cap the stagger so the 12th card isn't waiting ~1s
      el.style.transitionDelay = (Math.min(i, 5) * 0.08) + 's';
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();


/* =============================================
   5. REVIEWS SLIDER — drag to scroll
   ---------------------------------------------
   This is the ONLY thing animating the carousel now. The old inline
   script in index.html was also driving it via wrap.scrollLeft, so the
   two were fighting every frame. Make sure .reviews-scroll-wrap uses
   style="direction:ltr; overflow:hidden;" — with overflow-x:auto you
   get a stray scrollbar under the transform.
   ============================================= */
(function initReviewsSlider() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;

  const wrap = track.parentElement;
  if (!wrap) return;

  const speed = 0.5;   // px per frame
  let position     = 0;
  let isPaused     = false;
  let isDragging   = false;
  let dragStartX   = 0;
  let dragStartPos = 0;
  let rafId        = null;

  function getHalfWidth() {
    return track.scrollWidth / 2;
  }

  function tick() {
    if (!isPaused && !isDragging) {
      position += speed;
      if (position >= getHalfWidth()) position -= getHalfWidth();
      track.style.transform = `translateX(${-position}px)`;
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // Stop burning frames when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  });

  // ── Pause on hover ──
  wrap.addEventListener('mouseenter', () => { isPaused = true; });
  wrap.addEventListener('mouseleave', () => { if (!isDragging) isPaused = false; });

  // ── Mouse drag ──
  wrap.addEventListener('mousedown', (e) => {
    isDragging   = true;
    isPaused     = true;
    dragStartX   = e.clientX;
    dragStartPos = position;
    wrap.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    position = dragStartPos + (dragStartX - e.clientX);

    const half = getHalfWidth();
    if (position < 0)     position += half;
    if (position >= half) position -= half;

    track.style.transform = `translateX(${-position}px)`;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    isPaused   = false;
    wrap.classList.remove('dragging');
  });

  // ── Touch drag ──
  let touchStartX   = 0;
  let touchStartPos = 0;

  wrap.addEventListener('touchstart', (e) => {
    touchStartX   = e.touches[0].clientX;
    touchStartPos = position;
    isPaused      = true;
  }, { passive: true });

  wrap.addEventListener('touchmove', (e) => {
    position = touchStartPos + (touchStartX - e.touches[0].clientX);

    const half = getHalfWidth();
    if (position < 0)     position += half;
    if (position >= half) position -= half;

    track.style.transform = `translateX(${-position}px)`;
  }, { passive: true });

  wrap.addEventListener('touchend', () => { isPaused = false; });
})();


/* =============================================
   6. TICKER — seamless loop
   ---------------------------------------------
   FIX: the old version ran on every resize event and did
   track.innerHTML += clone each time. On a phone rotation or a desktop
   window drag that fires dozens of times and keeps growing the DOM.
   It also re-inserted the English text while the page was in Arabic,
   because the clones bypassed applyLanguage().
   ============================================= */
(function initTicker() {
  const track = document.querySelector('.ticker-track');
  const wrap  = document.querySelector('.ticker-wrap');
  if (!track || !wrap) return;

  const MAX_CLONES = 2;
  let clones = 0;

  function ensureEnoughContent() {
    while (clones < MAX_CLONES && track.scrollWidth < wrap.offsetWidth * 2) {
      track.insertAdjacentHTML('beforeend', track.innerHTML);
      clones++;
    }

    // Re-translate the freshly cloned nodes if we're in Arabic
    if (clones > 0 && typeof window.qazwinApplyLanguage === 'function') {
      window.qazwinApplyLanguage(
        document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en'
      );
    }
  }

  ensureEnoughContent();

  // Debounced, and it stops calling once MAX_CLONES is reached
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (clones >= MAX_CLONES) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(ensureEnoughContent, 200);
  }, { passive: true });
})();


/* =============================================
   7. LOGO FALLBACK — show letter if no image
   ============================================= */
(function initLogoFallback() {
  function showFallback(img) {
    img.style.display = 'none';
    const fallback = img.parentElement && img.parentElement.querySelector('.logo-fallback');
    if (fallback) fallback.style.display = 'flex';
  }

  document.querySelectorAll('.logo-img').forEach(img => {
    if (img.complete && img.naturalWidth === 0) showFallback(img);
    img.addEventListener('error', function () { showFallback(this); });
  });
})();


/* =============================================
   8. PERFORMANCE — lazy load images
   ---------------------------------------------
   FIX: the old selector included .logo-img, which sits above the fold
   in the navbar. Lazy-loading an above-the-fold image delays LCP.
   ============================================= */
(function initLazyLoad() {
  if ('loading' in HTMLImageElement.prototype) {
    document
      .querySelectorAll('img:not([loading]):not(.logo-img)')
      .forEach(img => img.setAttribute('loading', 'lazy'));
    return;
  }

  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) img.src = img.dataset.src;
      imgObserver.unobserve(img);
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
})();


/* =============================================
   9. CONSOLE BRANDING
   ---------------------------------------------
   The old section 8 (initPhoneLinks) was removed — it attached an empty
   click listener to every tel: link and did nothing.
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  console.log(
    '%c🇰🇼 Qazwin AC Repair Kuwait %c— Built with ❄️',
    'color:#42A5F5;font-size:14px;font-weight:bold;',
    'color:#FF6F00;font-size:13px;'
  );
  console.log('%cCall: 97904179 | WhatsApp: +965 97904179', 'color:#1565C0;font-size:12px;');
});
