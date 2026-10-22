/*
 * Cầu nối remote Samsung ↔ game HTML5 có sẵn (2048, Tetris, Snakes, Breakout — mã gốc giữ nguyên).
 * Thêm vào cuối <body> của game:
 *
 *   <script src="../tv.js" data-ok="32" data-zoom="1.5"></script>
 *
 *   Back (remote)          → về màn hình chính
 *   OK                     → phím data-ok (vd. 32 = Space) cho game cần phím khác Enter
 *   Play/Pause, phím vàng  → Esc (tạm dừng / thoát ván trong game hỗ trợ)
 *   Tay cầm Bluetooth      → mũi tên, A = Enter, B = Back, Start = Esc
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var OK_AS = Number(script && script.getAttribute('data-ok')) || 0;
  var ZOOM = script && script.getAttribute('data-zoom');
  var BACK = 10009, ENTER = 13, ESC = 27;

  if (ZOOM) document.body.style.zoom = ZOOM;
  document.body.style.cursor = 'none';

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
