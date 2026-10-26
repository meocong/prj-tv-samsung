/*
 * Cầu nối remote Samsung ↔ game HTML5 có sẵn (2048, Tetris, Snakes, Breakout — mã gốc giữ nguyên).
 * Thêm vào cuối <body> của game:
 *
 *   <script src="../tv.js" data-ok="32" data-zoom="1.5"></script>
 *   <script src="../tv.js" data-fit=".container"></script>   # scale that element to fill the screen instead
 *
 *   Back (remote)          → về màn hình chính
 *   OK                     → phím data-ok (vd. 32 = Space) cho game cần phím khác Enter
 *   Play/Pause, phím vàng  → Esc (tạm dừng / thoát ván trong game hỗ trợ)
 *   Tay cầm Bluetooth      → mũi tên, A = Enter, B = Back, Start = Esc
 *
 * Chữ tiếng Việt thêm vào game có thuộc tính data-en: màn hình chính đang ở tiếng Anh thì đổi sang câu đó.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var OK_AS = Number(script && script.getAttribute('data-ok')) || 0;
  var ZOOM = script && script.getAttribute('data-zoom');
  var FIT = script && script.getAttribute('data-fit');
  var BACK = 10009, ENTER = 13, ESC = 27;

  if (ZOOM) document.body.style.zoom = ZOOM;
  document.body.style.cursor = 'none';

  // data-fit: scale one element (with transform, which keeps absolutely placed pieces such as 2048's tiles where they
  // belong; zoom does not) as large as the 1920×1080 screen allows, centred.
  function fit() {
    var el = FIT && document.querySelector(FIT);
    if (!el) return;
    el.style.transform = 'none';
    var r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    var s = Math.min(W * 0.94 / r.width, H * 0.92 / r.height);
    el.style.transformOrigin = '0 0';
    el.style.transform = 'translate(' + Math.round((W - r.width * s) / 2 - r.left) + 'px,' + Math.round((H - r.height * s) / 2 - r.top) +
      'px) scale(' + s.toFixed(3) + ')';
  }
  if (FIT) {
    fit();
    window.addEventListener('load', fit);
    window.addEventListener('resize', fit);
  }

  // The home screen's language (Cài đặt → Ngôn ngữ), as js/i18n.js works it out.
  try {
    var lang = (JSON.parse(localStorage.getItem('nhaminh.settings') || '{}') || {}).language || 'auto';
    if (lang === 'en' || (lang === 'auto' && !/^vi/i.test(navigator.language || ''))) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-en]'), function (el) { el.innerHTML = el.getAttribute('data-en'); });
    }
  } catch (e) { /* no storage: Vietnamese */ }

  function home() { location.href = '../../index.html'; }

  /** A keydown/keyup that old-style handlers (reading keyCode/which) accept as real. */
  function fake(type, code) {
    var e = document.createEvent('Event');
    e.initEvent(type, true, true);
    Object.defineProperty(e, 'keyCode', { get: function () { return code; } });
    Object.defineProperty(e, 'which', { get: function () { return code; } });
    e.fake = true;
    document.dispatchEvent(e);
  }

  function translate(e, type) {
    if (e.fake) return;
    var k = e.keyCode;
    if (k === BACK) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === 'keydown') home();
    } else if (k === ENTER && OK_AS) {
      e.preventDefault();
      e.stopImmediatePropagation();
      fake(type, OK_AS);
    } else if (k === 10252 || k === 19 || k === 415 || k === 405) {   // play/pause, pause, play, yellow
      e.preventDefault();
      e.stopImmediatePropagation();
      fake(type, ESC);
    }
  }

  window.addEventListener('keydown', function (e) { translate(e, 'keydown'); }, true);
  window.addEventListener('keyup', function (e) { translate(e, 'keyup'); }, true);

  try {
    ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'ColorF2Yellow'].forEach(function (k) {
      try { tizen.tvinputdevice.registerKey(k); } catch (e) { /* not on this remote */ }
    });
  } catch (e) { /* not on a TV */ }

  // ---- gamepads -------------------------------------------------------------------------------

  var PAD = { 12: 38, 13: 40, 14: 37, 15: 39, 0: ENTER, 9: ESC };
  var held = {};

  function poll() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var now = {};
    for (var p = 0; p < pads.length; p++) {
      var pad = pads[p];
      if (!pad) continue;
      for (var b in PAD) { if (pad.buttons[b] && pad.buttons[b].pressed) now[PAD[b]] = true; }
      if (pad.buttons[1] && pad.buttons[1].pressed) { home(); return; }
      if (pad.axes && pad.axes.length >= 2) {
        if (pad.axes[0] < -0.6) now[37] = true;
        if (pad.axes[0] > 0.6) now[39] = true;
        if (pad.axes[1] < -0.6) now[38] = true;
        if (pad.axes[1] > 0.6) now[40] = true;
      }
    }
    [37, 38, 39, 40, ENTER, ESC].forEach(function (code) {
      var out = code === ENTER && OK_AS ? OK_AS : code;
      if (now[code] && !held[code]) fake('keydown', out);
      if (!now[code] && held[code]) fake('keyup', out);
      held[code] = !!now[code];
    });
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
})();
