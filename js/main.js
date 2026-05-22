/* =========================================================
   APCD, African People Collaboration Donegal
   Shared JavaScript (Version 2)
   ========================================================= */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initActiveNav();
    initMobileNav();
    initCustomCursor();
    initScrollAnimations();
    initRsvpForm();
    initContactForm();
    setFooterYear();
    initCountryNames();
    startCountryNamesLoop();
    initCookieBanner();
  });

  /* ---------- 1. Active nav link ---------- */
  function initActiveNav() {
    var path = window.location.pathname.split('/').pop().toLowerCase();
    if (!path || path === '') {
      path = 'index.html';
    }

    var links = document.querySelectorAll('[data-nav-link]');
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (href === path) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- 2. Mobile navigation drawer ---------- */
  function initMobileNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('[data-mobile-drawer]');
    if (!toggle || !drawer) return;

    function closeDrawer() {
      drawer.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    function openDrawer() {
      drawer.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (drawer.classList.contains('is-open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('click', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (drawer.contains(e.target) || toggle.contains(e.target)) return;
      closeDrawer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    var mq = window.matchMedia('(min-width: 900px)');
    var handleResize = function () {
      if (mq.matches) closeDrawer();
    };
    if (mq.addEventListener) mq.addEventListener('change', handleResize);
    else if (mq.addListener) mq.addListener(handleResize);
  }

  /* ---------- 3. Custom cursor (desktop only) ---------- */
  function initCustomCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    var dot  = document.createElement('div');
    var ring = document.createElement('div');
    dot.id = 'cursor-dot';
    ring.id = 'cursor-ring';
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var dotX = mouseX, dotY = mouseY;
    var ringX = mouseX, ringY = mouseY;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', function () {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    function render() {
      dotX  += (mouseX - dotX)  * 0.55;
      dotY  += (mouseY - dotY)  * 0.55;
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      dot.style.transform  = 'translate(' + dotX  + 'px,' + dotY  + 'px) translate(-50%, -50%)';
      ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%, -50%)';

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    var hoverSelector = 'a, button, input, textarea, select';
    function addHoverListeners() {
      document.querySelectorAll(hoverSelector).forEach(function (el) {
        if (el.dataset.cursorBound === '1') return;
        el.dataset.cursorBound = '1';
        el.addEventListener('mouseenter', function () {
          document.body.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', function () {
          document.body.classList.remove('cursor-hover');
        });
      });
    }
    addHoverListeners();
  }

  /* ---------- 4. Scroll animations ---------- */
  function initScrollAnimations() {
    var els = document.querySelectorAll('.fade-in');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.15
    });

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 5. RSVP form (events.html) ---------- */
  function initRsvpForm() {
    var form = document.getElementById('rsvp-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wrapper = this.parentElement;
      this.remove();
      var msg = document.createElement('div');
      msg.className = 'form-success';
      msg.setAttribute('role', 'status');
      msg.textContent = 'Thank you for registering your interest. We will be in touch with event details shortly.';
      wrapper.appendChild(msg);
    });
  }

  /* ---------- 6. Contact form (contact.html) ---------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wrapper = this.parentElement;
      this.remove();
      var msg = document.createElement('div');
      msg.className = 'form-success';
      msg.setAttribute('role', 'status');
      msg.textContent = 'Thank you for your message. We will be in touch shortly.';
      wrapper.appendChild(msg);
    });
  }

  /* ---------- 7. Drifting country names (home hero background) ---------- */
  /*
     54 African sovereign states plus Ireland and United Kingdom drift
     individually across the hero. Each name has its own random heading and
     a slow base speed, and its heading is nudged a little every frame so
     trajectories curve gently rather than running in straight lines. Names
     wrap around the hero bounds, so motion is continuous indefinitely.
  */
  var countryNames = [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
    'Democratic Republic of Congo', 'Republic of Congo', 'Djibouti', 'Egypt',
    'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia',
    'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
    'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
    'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
    'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone',
    'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
    'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
    'Ireland', 'United Kingdom'
  ];

  var countryNodes = [];
  var heroBounds = { width: 0, height: 0 };
  var lastDriftTimestamp = null;
  var driftLoopRunning = false;

  function shuffleIndices(n) {
    var arr = [];
    for (var i = 0; i < n; i += 1) arr.push(i);
    for (var j = arr.length - 1; j > 0; j -= 1) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = arr[j];
      arr[j] = arr[k];
      arr[k] = tmp;
    }
    return arr;
  }

  function measureHero(container) {
    var hero = container.parentElement;
    if (!hero) return;
    var rect = hero.getBoundingClientRect();
    heroBounds.width = rect.width;
    heroBounds.height = rect.height;
  }

  function initCountryNames() {
    var container = document.getElementById('country-scroll-container');
    if (!container) return;

    container.innerHTML = '';
    countryNodes = [];
    measureHero(container);

    // Jittered grid: 8 columns x 7 rows = 56 cells, one per name.
    // Shuffling the cell assignment keeps adjacent names in the source
    // list from sitting next to each other in the layout.
    var cols = 8;
    var rows = 7;
    var cellW = heroBounds.width / cols;
    var cellH = heroBounds.height / rows;
    var order = shuffleIndices(countryNames.length);

    countryNames.forEach(function (name, i) {
      var cellIndex = order[i];
      var col = cellIndex % cols;
      var row = Math.floor(cellIndex / cols);

      var jitterX = (Math.random() - 0.5) * cellW * 0.7;
      var jitterY = (Math.random() - 0.5) * cellH * 0.7;
      var x = (col + 0.5) * cellW + jitterX;
      var y = (row + 0.5) * cellH + jitterY;

      // Slow drift: 3..10 px/s. Direction is fully random and the angle
      // drifts slightly each frame so the path is a gentle curve.
      var angle = Math.random() * Math.PI * 2;
      var speed = 3 + Math.random() * 7;
      var angularDrift = (Math.random() - 0.5) * 0.18; // rad/s

      var el = document.createElement('span');
      el.className = 'country-name';
      el.textContent = name;
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      container.appendChild(el);

      countryNodes.push({
        el: el,
        x: x,
        y: y,
        angle: angle,
        speed: speed,
        angularDrift: angularDrift,
        w: 0,
        h: 0
      });
    });

    var measureNodes = function () {
      countryNodes.forEach(function (node) {
        node.w = node.el.offsetWidth;
        node.h = node.el.offsetHeight;
      });
    };
    setTimeout(measureNodes, 50);
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(measureNodes).catch(function () {});
    }

    window.addEventListener('resize', function () {
      measureHero(container);
    });
  }

  function animateCountryNames(timestamp) {
    if (lastDriftTimestamp === null) lastDriftTimestamp = timestamp;
    var delta = (timestamp - lastDriftTimestamp) / 1000;
    lastDriftTimestamp = timestamp;

    // Guard against huge deltas when the tab has been backgrounded so
    // names do not teleport across the hero on focus return.
    if (delta > 0.1) delta = 0.1;

    var w = heroBounds.width;
    var h = heroBounds.height;
    if (w <= 0 || h <= 0) {
      requestAnimationFrame(animateCountryNames);
      return;
    }

    for (var i = 0; i < countryNodes.length; i += 1) {
      var node = countryNodes[i];

      node.angle += node.angularDrift * delta;
      node.x += Math.cos(node.angle) * node.speed * delta;
      node.y += Math.sin(node.angle) * node.speed * delta;

      // Wrap around hero bounds. We use the measured glyph width so a name
      // is fully off-screen before it reappears on the opposite edge.
      var padX = node.w || 80;
      var padY = node.h || 20;
      if (node.x < -padX) node.x = w;
      else if (node.x > w) node.x = -padX;
      if (node.y < -padY) node.y = h;
      else if (node.y > h) node.y = -padY;

      node.el.style.transform = 'translate3d(' + node.x + 'px,' + node.y + 'px,0)';
    }

    requestAnimationFrame(animateCountryNames);
  }

  function startCountryNamesLoop() {
    if (driftLoopRunning) return;
    if (!document.getElementById('country-scroll-container')) return;
    if (countryNodes.length === 0) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Names stay at their initial jittered positions, no motion.
      return;
    }

    driftLoopRunning = true;
    requestAnimationFrame(animateCountryNames);
  }

  /* ---------- Helpers ---------- */
  function setFooterYear() {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- 8. Cookie consent banner ---------- */
  function initCookieBanner() {
    var consent = getCookie('apcd_cookie_consent');
    if (!consent) showCookieBanner();

    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'cookie-settings-link') {
        e.preventDefault();
        showCookieBanner();
      }
    });
  }

  function showCookieBanner() {
    if (document.getElementById('cookie-banner')) return;
    var bannerHTML = '<div id="cookie-banner" role="dialog" aria-label="Cookie consent" aria-live="polite">' +
      '<div class="cookie-banner-inner">' +
        '<div class="cookie-banner-text">' +
          '<p>This website uses a cookie to remember your consent preference. We do not use advertising or tracking cookies. Read our <a href="cookies.html">Cookie Policy</a> for full details.</p>' +
        '</div>' +
        '<div class="cookie-banner-actions">' +
          '<button id="cookie-accept" class="cookie-btn cookie-btn-accept">Accept</button>' +
          '<button id="cookie-decline" class="cookie-btn cookie-btn-decline">Decline</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    document.getElementById('cookie-accept').addEventListener('click', function () {
      setCookie('apcd_cookie_consent', 'accepted', 365);
      hideCookieBanner();
    });
    document.getElementById('cookie-decline').addEventListener('click', function () {
      setCookie('apcd_cookie_consent', 'declined', 365);
      hideCookieBanner();
    });
  }

  function hideCookieBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) b.remove();
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    return document.cookie.split('; ').reduce(function (acc, part) {
      var pair = part.split('=');
      var key = pair[0];
      var val = pair[1];
      return key === name ? val : acc;
    }, '');
  }
})();
