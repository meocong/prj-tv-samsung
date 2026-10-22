/*
 * Một nguồn phím duy nhất cho remote Samsung, bàn phím (xem thử trên máy tính) và tay cầm Bluetooth.
 * Dùng chung cho màn hình chính và các game.
 *
 *   Input.on(function (action, phase, e) { ... });   // phase: 'down' | 'up' | 'repeat'
 *
 * Actions: left right up down ok back play pause playpause stop ff rw red green yellow blue
 *          info 0..9 start select chup chdown
 */
(function (root) {
  'use strict';

  var KEYS = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 32: 'ok',
    10009: 'back', 27: 'back', 8: 'back', 461: 'back',
    415: 'play', 19: 'pause', 10252: 'playpause', 413: 'stop', 417: 'ff', 412: 'rw',
    403: 'red', 404: 'green', 405: 'yellow', 406: 'blue', 457: 'info',
    427: 'chup', 428: 'chdown', 33: 'chup', 34: 'chdown',
    // Desktop preview: R/G/Y/B for the colour keys, P for play/pause.
    82: 'red', 71: 'green', 89: 'yellow', 66: 'blue', 80: 'playpause'
  };
  for (var n = 0; n <= 9; n++) { KEYS[48 + n] = String(n); KEYS[96 + n] = String(n); }

  var handlers = [];
  var held = {};

  function emit(action, phase, e) {
    for (var i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i](action, phase, e) === true) return;   // a handler returning true swallows it
    }
  }

  document.addEventListener('keydown', function (e) {
    var action = KEYS[e.keyCode];
    if (!action) return;
    e.preventDefault();
    var phase = held[action] ? 'repeat' : 'down';
    held[action] = true;
    emit(action, phase, e);
  });

  document.addEventListener('keyup', function (e) {
    var action = KEYS[e.keyCode];
    if (!action) return;
    e.preventDefault();
    held[action] = false;
    emit(action, 'up', e);
  });

  // ---- gamepads (standard mapping) -----------------------------------------------------------

  var PAD = { 0: 'ok', 1: 'back', 2: 'ok', 3: 'info', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  var REPEAT_DELAY = 320, REPEAT_RATE = 90;
  var padState = {};   // "pad:button" -> {down, since, last}

  function pollPads(now) {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var p = 0; p < pads.length; p++) {
      var pad = pads[p];
      if (!pad) continue;
      var pressed = {};
      for (var b in PAD) {
        var btn = pad.buttons[b];
        if (btn && (btn.pressed || btn.value > 0.5)) pressed[PAD[b]] = true;
      }
      // Left stick as a d-pad.
      if (pad.axes && pad.axes.length >= 2) {
        if (pad.axes[0] < -0.6) pressed.left = true;
        if (pad.axes[0] > 0.6) pressed.right = true;
        if (pad.axes[1] < -0.6) pressed.up = true;
        if (pad.axes[1] > 0.6) pressed.down = true;
      }
      ['ok', 'back', 'info', 'select', 'start', 'up', 'down', 'left', 'right'].forEach(function (a) {
        var key = p + ':' + a, s = padState[key];
        var detail = { gamepad: p };
        if (pressed[a]) {
          if (!s || !s.down) {
            padState[key] = { down: true, since: now, last: now };
            emit(a, 'down', detail);
          } else if (isDirection(a) && now - s.since > REPEAT_DELAY && now - s.last > REPEAT_RATE) {
            s.last = now;
            emit(a, 'repeat', detail);
          }
        } else if (s && s.down) {
          s.down = false;
          emit(a, 'up', detail);
        }
      });
    }
    requestAnimationFrame(pollPads);
  }
  requestAnimationFrame(pollPads);

  // ---- Samsung remote keys that must be registered -------------------------------------------

  function registerTvKeys(names) {
    try {
      if (root.tizen && tizen.tvinputdevice) {
        names.forEach(function (k) {
          try { tizen.tvinputdevice.registerKey(k); } catch (e) { /* key not on this remote */ }
        });
      }
    } catch (e) { /* not on a TV */ }
  }
  registerTvKeys(['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'MediaPlayPause', 'MediaPlay',
    'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'Info', 'ChannelUp', 'ChannelDown',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

  function isDirection(a) { return a === 'left' || a === 'right' || a === 'up' || a === 'down'; }

  root.Input = {
    on: function (fn) { handlers.push(fn); return function () { handlers.splice(handlers.indexOf(fn), 1); }; },
    isDirection: isDirection
  };
})(this);
