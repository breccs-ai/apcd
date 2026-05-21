/* =========================================================
   APCD, African People Collaboration Donegal
   Ambient Sky Strip (self-contained vanilla JS)
   Tracks Irish Standard Time, places a real-time sun
   along its arc, fades stars at night.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Irish time (UTC with seasonal DST) ---------- */
  function getIrishTime() {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);

    const utcYear = new Date(utcMs).getUTCFullYear();

    // Last Sunday in March, 01:00 UTC (DST starts)
    const marchEnd = new Date(Date.UTC(utcYear, 2, 31));
    const marchOffset = marchEnd.getUTCDay();
    const dstStart = new Date(Date.UTC(utcYear, 2, 31 - marchOffset, 1, 0, 0));

    // Last Sunday in October, 01:00 UTC (DST ends)
    const octoberEnd = new Date(Date.UTC(utcYear, 9, 31));
    const octoberOffset = octoberEnd.getUTCDay();
    const dstEnd = new Date(Date.UTC(utcYear, 9, 31 - octoberOffset, 1, 0, 0));

    const isSummer = utcMs >= dstStart.getTime() && utcMs < dstEnd.getTime();
    const offsetMs = isSummer ? 3600000 : 0;
    const irishDate = new Date(utcMs + offsetMs);

    return { date: irishDate, isSummer: isSummer };
  }

  /* ---------- 2. Solar sunrise / sunset for Donegal ---------- */
  function getSolarTimes(irishDate, isSummer) {
    const year  = irishDate.getFullYear();
    const month = irishDate.getMonth() + 1;
    const day   = irishDate.getDate();

    // Day of year (Julian-style approximation)
    const N = Math.floor(275 * month / 9)
      - Math.floor((month + 9) / 12) * (1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3))
      + day - 30;

    // Donegal, Ireland
    const lat = 54.9;
    const lng = -7.7;

    const decl = 23.45 * Math.sin((360 / 365) * (N - 81) * Math.PI / 180);

    const cosH = -Math.tan(lat * Math.PI / 180) * Math.tan(decl * Math.PI / 180);
    const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * 180 / Math.PI;

    const lngCorrection = lng / 15;          // hours offset from local meridian
    const irishOffsetHours = isSummer ? 1 : 0; // shift UTC solar noon into Irish clock time
    const solarNoon = 12 - lngCorrection + irishOffsetHours;

    return {
      sunrise: solarNoon - H / 15,
      sunset:  solarNoon + H / 15
    };
  }

  /* ---------- 3. Sun position 0..1 along the arc ---------- */
  function getSunPosition(irishDate, sunrise, sunset) {
    const h = irishDate.getHours();
    const m = irishDate.getMinutes();
    const s = irishDate.getSeconds();
    const currentDecimal = h + m / 60 + s / 3600;

    if (currentDecimal < sunrise || currentDecimal > sunset) {
      return null;
    }
    return (currentDecimal - sunrise) / (sunset - sunrise);
  }

  /* ---------- 4. Star opacity (smooth dawn/dusk fade) ---------- */
  function getStarOpacity(currentDecimal, sunrise, sunset) {
    const fadeWindow = 0.75; // hours of fade either side

    if (currentDecimal < sunrise - fadeWindow || currentDecimal > sunset + fadeWindow) {
      return 0.9;
    }
    if (currentDecimal > sunrise && currentDecimal < sunset) {
      return 0;
    }
    if (currentDecimal >= sunrise - fadeWindow && currentDecimal <= sunrise) {
      return 0.9 * (1 - (currentDecimal - (sunrise - fadeWindow)) / fadeWindow);
    }
    if (currentDecimal >= sunset && currentDecimal <= sunset + fadeWindow) {
      return 0.9 * ((currentDecimal - sunset) / fadeWindow);
    }
    return 0;
  }

  /* ---------- 5. Colour interpolation helpers ---------- */
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  }

  function rgbToHex(r, g, b) {
    function comp(v) {
      const s = Math.round(Math.max(0, Math.min(255, v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + comp(r) + comp(g) + comp(b);
  }

  function interpolateColour(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return rgbToHex(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    );
  }

  /* ---------- 6. Sky colour stops (decimal hour, gradient colours) ---------- */
  const skyColourStops = [
    { time: 0,    colours: ['#0a0e1a', '#0d1220'] },                       // Deep night
    { time: 5,    colours: ['#1a1040', '#2d1b4e'] },                       // Pre-dawn
    { time: 6.5,  colours: ['#ff7b35', '#ffb347', '#ffd580'] },            // Dawn / sunrise
    { time: 8,    colours: ['#87ceeb', '#b0e0ff'] },                       // Morning
    { time: 12,   colours: ['#4a90d9', '#6db8f0'] },                       // Midday
    { time: 16,   colours: ['#5ba3e8', '#89c4f4'] },                       // Afternoon
    { time: 19,   colours: ['#f5a623', '#f7c948', '#e8855a'] },            // Golden hour
    { time: 21,   colours: ['#c0392b', '#e67e22', '#f39c12'] },            // Sunset
    { time: 22,   colours: ['#2c1654', '#1a0a2e'] },                       // Dusk
    { time: 23,   colours: ['#0a0e1a', '#0d1220'] },                       // Night
    { time: 24,   colours: ['#0a0e1a', '#0d1220'] }                        // Wrap to midnight
  ];

  /* Resample a small colour stop list up to `n` stops via linear interpolation */
  function resampleColours(arr, n) {
    if (arr.length === n) return arr.slice();
    if (arr.length === 1) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(arr[0]);
      return out;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const idx = (i * (arr.length - 1)) / (n - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) {
        out.push(arr[lo]);
      } else {
        out.push(interpolateColour(arr[lo], arr[hi], idx - lo));
      }
    }
    return out;
  }

  /* ---------- 7. Build CSS gradient for the current decimal time ---------- */
  function getSkyGradient(currentDecimal) {
    let prev = skyColourStops[0];
    let next = skyColourStops[skyColourStops.length - 1];

    for (let i = 0; i < skyColourStops.length - 1; i++) {
      if (currentDecimal >= skyColourStops[i].time && currentDecimal <= skyColourStops[i + 1].time) {
        prev = skyColourStops[i];
        next = skyColourStops[i + 1];
        break;
      }
    }

    const span = next.time - prev.time;
    const t = span > 0 ? (currentDecimal - prev.time) / span : 0;

    const len = Math.max(prev.colours.length, next.colours.length);
    const a = resampleColours(prev.colours, len);
    const b = resampleColours(next.colours, len);

    const interp = [];
    for (let i = 0; i < len; i++) {
      interp.push(interpolateColour(a[i], b[i], t));
    }
    return 'linear-gradient(to right, ' + interp.join(', ') + ')';
  }

  /* ---------- 8. Stars (one-time random placement) ---------- */
  function initStars() {
    const strip = document.getElementById('sky-strip');
    if (!strip) return;

    const STAR_COUNT = 55;
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('div');
      star.className = 'sky-star';
      const size = 1 + Math.random() * 1.5;          // 1px to 2.5px
      const baseOpacity = 0.4 + Math.random() * 0.5; // 0.4 to 0.9

      star.style.width  = size.toFixed(2) + 'px';
      star.style.height = size.toFixed(2) + 'px';
      star.style.left   = (Math.random() * 100).toFixed(2) + '%';
      star.style.top    = (Math.random() * 100).toFixed(2) + '%';
      star.style.opacity = '0';
      star.dataset.baseOpacity = baseOpacity.toFixed(3);

      strip.appendChild(star);
    }
  }

  /* ---------- 9. Per-second tick: sun position + star opacity ---------- */
  function updateSky() {
    const strip = document.getElementById('sky-strip');
    const sun   = document.getElementById('sun-element');
    if (!strip || !sun) return;

    const t = getIrishTime();
    const solar = getSolarTimes(t.date, t.isSummer);
    const progress = getSunPosition(t.date, solar.sunrise, solar.sunset);

    if (progress === null) {
      sun.style.display = 'none';
    } else {
      sun.style.display = 'block';
      const verticalProgress = Math.sin(progress * Math.PI);
      const topPercent = 80 - (verticalProgress * 65);
      sun.style.left = (progress * 100).toFixed(3) + '%';
      sun.style.top  = topPercent.toFixed(3) + '%';
    }

    const h = t.date.getHours();
    const m = t.date.getMinutes();
    const s = t.date.getSeconds();
    const currentDecimal = h + m / 60 + s / 3600;
    const groupOpacity = getStarOpacity(currentDecimal, solar.sunrise, solar.sunset);

    const stars = strip.querySelectorAll('.sky-star');
    stars.forEach(function (star) {
      const base = parseFloat(star.dataset.baseOpacity || '0.7');
      // Normalise: at full night (group 0.9) each star shows at its own base.
      const final = groupOpacity > 0 ? (groupOpacity / 0.9) * base : 0;
      star.style.opacity = final.toFixed(3);
    });
  }

  /* ---------- 10. Every 10 seconds: sky gradient ---------- */
  function updateSkyBackground() {
    const strip = document.getElementById('sky-strip');
    if (!strip) return;
    const t = getIrishTime();
    const h = t.date.getHours();
    const m = t.date.getMinutes();
    const s = t.date.getSeconds();
    const currentDecimal = h + m / 60 + s / 3600;
    strip.style.background = getSkyGradient(currentDecimal);
  }

  /* ---------- 11. Boot ---------- */
  function start() {
    if (!document.getElementById('sky-strip')) return;
    initStars();
    updateSkyBackground();
    updateSky();
    setInterval(updateSky, 1000);
    setInterval(updateSkyBackground, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
