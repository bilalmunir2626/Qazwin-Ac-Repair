/**
 * QAZWIN AC REPAIR KUWAIT — main.js
 * Pure Vanilla JavaScript (no frameworks)
 * Features:
 *  - Navbar scroll effect & active link highlighting
 *  - Mobile hamburger menu
 *  - Smooth scroll
 *  - Scroll reveal animations
 *  - Draggable reviews slider
 *  - Ticker pause on hover
 */

'use strict';

/* =============================================
   1. NAVBAR — Scroll effect & active state
   ============================================= */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const navLinks  = document.querySelectorAll('.nav-link');
  const sections  = document.querySelectorAll('main section[id], header[id]');

  // Add "scrolled" class for shadow
  function onScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    highlightActiveLink();
  }

  // Highlight nav link matching visible section
  function highlightActiveLink() {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href && href === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();


/* =============================================
   2. HAMBURGER MENU — Mobile toggle
   ============================================= */
(function initHamburger() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobLinks   = document.querySelectorAll('.mob-link, .mob-cta a');

  if (!hamburger || !mobileMenu) return;

  function toggleMenu(open) {
    hamburger.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    toggleMenu(!isOpen);
  });

  // Close on link click
  mobLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      toggleMenu(false);
    }
  });
})();


/* =============================================
   3. SMOOTH SCROLL — anchor links
   ============================================= */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      const navHeight = document.getElementById('navbar').offsetHeight;
      const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });
})();


/* =============================================
   4. SCROLL REVEAL — fade-in on scroll
   ============================================= */
(function initScrollReveal() {
  // Add reveal class to elements
  const revealTargets = [
    '.service-card',
    '.why-item',
    '.step-card',
    '.review-card',
    '.stat-item',
    '.section-header',
    '.contact-box',
    '.footer-brand',
    '.footer-col',
  ];

  revealTargets.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i * 0.08) + 's';
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
   ============================================= */
(function initReviewsSlider() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;

  const wrap       = track.parentElement;
  const speed      = 0.5;   // px per frame — increase for faster scroll
  let   position   = 0;
  let   isPaused   = false;
  let   isDragging = false;
  let   dragStartX = 0;
  let   dragStartPos = 0;
  let   rafId      = null;

  // Half = width of original 5 cards + their gaps
  // We reset when we've scrolled exactly one full set
  function getHalfWidth() {
    return track.scrollWidth / 2;
  }

  // Core animation loop
  function tick() {
    if (!isPaused && !isDragging) {
      position += speed;
      // When we've scrolled through exactly the first set, jump back seamlessly
      if (position >= getHalfWidth()) {
        position -= getHalfWidth();
      }
      track.style.transform = `translateX(${-position}px)`;
    }
    rafId = requestAnimationFrame(tick);
  }

  // Start
  rafId = requestAnimationFrame(tick);

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
    const delta = dragStartX - e.clientX;
    position = dragStartPos + delta;

    // Keep in bounds
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
    const delta = touchStartX - e.touches[0].clientX;
    position = touchStartPos + delta;

    const half = getHalfWidth();
    if (position < 0)     position += half;
    if (position >= half) position -= half;

    track.style.transform = `translateX(${-position}px)`;
  }, { passive: true });

  wrap.addEventListener('touchend', () => {
    isPaused = false;
  });

})();


/* =============================================
   6. TICKER — ensure seamless loop
   ============================================= */
(function initTicker() {
  // The ticker duplication is already done in HTML
  // This just ensures it works on very wide screens
  const track = document.querySelector('.ticker-track');
  if (!track) return;

  // Calculate if we need more copies
  function ensureEnoughContent() {
    const wrapWidth = document.querySelector('.ticker-wrap').offsetWidth;
    const trackWidth = track.scrollWidth;

    // We need at least 2x the viewport width
    if (trackWidth < wrapWidth * 2) {
      // Clone existing content and append
      const clone = track.innerHTML;
      track.innerHTML += clone;
    }
  }

  ensureEnoughContent();
  window.addEventListener('resize', ensureEnoughContent, { passive: true });
})();


/* =============================================
   7. LOGO FALLBACK — show letter if no image
   ============================================= */
(function initLogoFallback() {
  document.querySelectorAll('.logo-img').forEach(img => {
    // Check if already failed
    if (!img.complete || img.naturalWidth === 0) {
      img.style.display = 'none';
      const fallback = img.parentElement.querySelector('.logo-fallback');
      if (fallback) fallback.style.display = 'flex';
    }
    img.addEventListener('error', function () {
      this.style.display = 'none';
      const fallback = this.parentElement.querySelector('.logo-fallback');
      if (fallback) fallback.style.display = 'flex';
    });
  });
})();


/* =============================================
   8. PHONE NUMBER — format display (optional)
   ============================================= */
(function initPhoneLinks() {
  // Ensure all phone links are clickable on mobile
  document.querySelectorAll('a[href="tel:97904179"]').forEach(link => {
    link.addEventListener('click', (e) => {
      // On desktop, prevent default (optional — leave it as-is to allow dial)
      // This is intentionally left to allow native call behavior
    });
  });
})();


/* =============================================
   9. PERFORMANCE — lazy load images
   ============================================= */
(function initLazyLoad() {
  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    document.querySelectorAll('img:not([loading])').forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
  } else {
    // Fallback: IntersectionObserver
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          imgObserver.unobserve(img);
        }
      });
    });
    document.querySelectorAll('img[data-src]').forEach(img => {
      imgObserver.observe(img);
    });
  }
})();


/* =============================================
   10. ACTIVE SECTION INDICATOR
       (highlight navbar on page load too)
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Trigger scroll event to set initial active state
  window.dispatchEvent(new Event('scroll'));

  // Console branding
  console.log(
    '%c🇰🇼 Qazwin AC Repair Kuwait %c— Built with ❄️',
    'color:#42A5F5;font-size:14px;font-weight:bold;',
    'color:#FF6F00;font-size:13px;'
  );
  console.log('%cCall: 97904179 | WhatsApp: +965 97904179', 'color:#1565C0;font-size:12px;');
});