/*
 * Dịch vụ nền của màn hình chính: đưa bạn về màn hình chính khi thoát app đã mở từ đó.
 *
 * Samsung không cho app tự cài làm nút Home, và khi một app thoát thì TV về Smart Hub. Màn hình chính
 * báo cho dịch vụ này app nào vừa được mở (app-control data "launched"); dịch vụ hỏi TV mỗi 0,3 giây xem
 * app đó còn chạy không, qua REST API của chính TV (http://127.0.0.1:8001/api/v2/applications/<id>).
 * Khi app đã chạy rồi tắt — tức là bạn vừa thoát nó — dịch vụ mở lại màn hình chính. App chỉ ẩn đi chứ
 * không tắt khi thoát (Netflix…) cũng tính là đã thoát nếu khuất quá 1,2 giây.
 *
 * Khi không có app nào được mở từ màn hình chính, dịch vụ vẫn dò vài giây một lần xem có app nào của TV đang
 * hiện không (mở từ Smart Hub, hoặc TV tự mở lại app cuối cùng sau khi bật): thấy thì canh app đó luôn.
 * Dịch vụ cũng theo dõi trạng thái nguồn của TV: TV ngủ rồi bật lại (standby → on) thì đưa màn hình chính lên.
 * Dịch vụ có thể bị hệ thống tạm dừng một lúc; khi chạy lại, mọi bộ đếm thời gian được đặt lại để không đưa về
 * màn hình chính nhầm lúc bạn vừa mở app khác.
 *
 * http://<IP TV>:8701/ là trang cài đặt bằng điện thoại / máy tính (tên nhà, thành phố, ảnh gia đình, sinh nhật);
 * http://<IP TV>:8701/status cho biết dịch vụ chạy từ lúc nào, đang canh app nào và những việc vừa làm (để gỡ lỗi).
 * Cùng cơ chế dịch vụ nền với TizenBrew (config.xml: <tizen:service>, feature web.service).
 */
var http = require('http');

var HOME = 'NhaMinh000.NhaMinh';
var POLL_MS = 300;     // Smart Hub flashes for at most this long after closing an app
var GIVE_UP_MS = 30 * 60 * 1000;   // stop watching an app that never appeared (launch failed)

var watched = null;   // {ids: [storeId, tizenId], since, seenRunning}
var timer = null;
var known = [];       // store ids of the TV's apps, most used first (sent by the home screen when it starts)
var started = Date.now(), log = [];

function note(what) {
  log.push(new Date().toTimeString().slice(0, 8) + ' ' + what);
  if (log.length > 40) log.shift();
}

// How long the TV itself has been up (not this service): tells a fresh boot from a wake-up hours later.
var fs = null;
try { fs = require('fs'); } catch (e) { /* no fs in this runtime */ }
function tvUptimeS() {
  try { return Math.round(parseFloat(String(fs.readFileSync('/proc/uptime')).split(' ')[0])); } catch (e) { return null; }
}

function status(id, cb) {
  var done = false;
  function finish(v) { if (!done) { done = true; cb(v); } }
  try {
    var req = http.get({ host: '127.0.0.1', port: 8001, path: '/api/v2/applications/' + encodeURIComponent(id), timeout: 2500 },
      function (res) {
        var body = '';
        res.on('data', function (d) { body += d; });
        res.on('end', function () {
          try { var j = JSON.parse(body); finish(j && j.id ? j : null); } catch (e) { finish(null); }
        });
      });
    req.on('error', function () { finish(null); });
    req.on('timeout', function () { req.abort(); finish(null); });
  } catch (e) { finish(null); }
}

/** Status of the watched app ({running, visible}), or null when the TV does not know the id. */
function appState(ids, cb) {
  var i = 0;
  (function next() {
    if (i >= ids.length) return cb(null);
    status(ids[i++], function (s) { if (s) cb(s); else next(); });
  })();
}

var HIDDEN_MS = 1200;   // an app that stays out of sight this long was left (Back on Netflix only hides it)
// TizenBrew and TizenTube (packages xvvl3S1…) close themselves and start again under the TV's debugger when Developer
// Mode's Host PC IP is 127.0.0.1 (selfDebug): give them this long to come back before taking them for closed.
var RESTARTS = /^xvvl3S1/, RESTART_MS = 10000;

/** cb(true) when any of these apps is on screen: the user went on to something else themselves. */
function anyVisible(ids, cb) {
  var left = ids.length, found = false;
  if (!left) return cb(false);
  ids.forEach(function (id) {
    status(id, function (s) {
      if (s && s.visible) found = true;
      if (--left === 0) cb(found);
    });
  });
}

function launchHome(why) {
  note('về màn hình chính: ' + why);
  try { tizen.application.launch(HOME, function () {}, function () { note('không mở được màn hình chính'); }); } catch (e) { /* nothing to do */ }
}

function goHome(others) {
  status(HOME, function (me) {
    if (me && me.visible) return;
    anyVisible(others || [], function (busy) {
      if (busy) return note('có app khác đang hiện: không can thiệp');
      launchHome('đã thoát app');
    });
  });
}

// ---- guard: an app on screen that the home screen did not open --------------------------------

var GUARD_MIN = 3000, GUARD_MAX = 12000, guardEvery = GUARD_MIN, guardAt = 0, guardBusy = false;

/** Every few seconds while nothing is watched: is the home screen up? If not, which app is? */
function guard() {
  if (guardBusy || !known.length || Date.now() - guardAt < guardEvery) return;
  guardAt = Date.now();
  guardBusy = true;
  status(HOME, function (me) {
    if (me && me.visible) { guardEvery = GUARD_MIN; guardBusy = false; return; }   // one request while home is up
    var i = 0;
    (function next() {
      if (watched) { guardBusy = false; return; }
      if (i >= known.length) {   // nothing of ours in front (HDMI, Smart Hub, another app): look less often
        guardEvery = Math.min(GUARD_MAX, guardEvery * 2);
        guardBusy = false;
        return;
      }
      var id = known[i++];
      status(id, function (s) {
        if (!s || !s.visible) return next();
        watched = { ids: [id], since: Date.now(), seenRunning: true, others: known.filter(function (x) { return x !== id; }) };
        guardEvery = GUARD_MIN;
        guardBusy = false;
        note('canh ' + (s.name || id) + ' (không mở từ màn hình chính)');
      });
    })();
  });
}

// ---- power: the TV going to sleep -----------------------------------------------------------------

var POWER_MS = 1500, powerAt = 0, power = 'on', selfDebug = false;

function powerState(cb) {
  var done = false;
  function finish(v) { if (!done) { done = true; cb(v); } }
  try {
    var req = http.get({ host: '127.0.0.1', port: 8001, path: '/api/v2/', timeout: 1500 }, function (res) {
      var body = '';
      res.on('data', function (d) { body += d; });
      res.on('end', function () {
        try {
          var d = JSON.parse(body).device || {};
          // Host PC IP 127.0.0.1 (stored reversed on some TVs): TizenBrew and TizenTube restart under the debugger.
          selfDebug = d.developerMode === '1' && (d.developerIP === '127.0.0.1' || d.developerIP === '1.0.0.127');
          finish(d.PowerState || null);
        } catch (e) { finish(null); }
      });
    });
    req.on('error', function () { finish(null); });
    req.on('timeout', function () { req.abort(); finish(null); });
  } catch (e) { finish(null); }
}

/** Leaving "on": put the home screen in front now, so the TV starts with it next time. */
function checkPower() {
  if (Date.now() - powerAt < POWER_MS) return;
  powerAt = Date.now();
  powerState(function (state) {
    if (!state || state === power) return;
    note('nguồn: ' + power + ' -> ' + state);
    var leaving = power === 'on';
    power = state;
    watched = null;
    if (!leaving) return bringHome('TV vừa bật');   // back from standby: the TV shows Smart Hub or the last app
    status(HOME, function (me) { if (!me || !me.visible) launchHome('TV sắp tắt'); });
  });
}

/**
 * Right after the TV comes on: get the home screen in front, trying a few times over ~15 seconds because Smart Hub
 * or the TV's own "last app" may come up after us. It stops as soon as the home screen has been on screen once, or
 * the user opens an app from it: from then on what is on screen is the user's choice. A check that runs late (the
 * service was paused in between) is dropped too.
 */
var wakeAt = 0;
var WAKE_TRIES = [1500, 4000, 8000, 12000, 16000, 20000];
// A cold boot: the TV's own UI, Smart Hub and its "last app" keep coming up for longer than after a wake-up.
var BOOT_TRIES = [3000, 8000, 15000, 25000, 40000, 55000], BOOT_S = 180;
var WAKE_LAUNCHES = 3;   // at most this many launches per wake-up: never a fight with the TV

/**
 * Right after the TV comes on: the home screen goes in front and is kept there for a short while, because the TV may
 * still bring up Smart Hub, its last app or the TV picture a few seconds later. Each check notes what it saw (the
 * line lands in /status) and launches the home screen when it is not in front. Opening an app from the home screen
 * ends this at once (readRequest: 'launched'), and so does a pause of the service (tick: stale checks are dropped).
 */
function bringHome(why, tries) {
  var at = wakeAt = Date.now(), seen = [], launches = 0;
  tries = tries || WAKE_TRIES;
  var until = tries[tries.length - 1] + 10000;
  tries.forEach(function (ms, i) {
    setTimeout(function () {
      if (power !== 'on' || wakeAt !== at || Date.now() - at > until) return;
      status(HOME, function (me) {
        if (wakeAt !== at) return;
        var visible = !!(me && me.visible);
        seen.push(Math.round(ms / 1000) + 's ' + (visible ? 'hiện' : 'khuất'));
        if (!visible && launches < WAKE_LAUNCHES) { launches++; launchHome(why); }
        if (i === tries.length - 1) { note(why + ', kiểm tra: ' + seen.join(' · ')); wakeAt = 0; }
      });
    }, ms);
  });
}

// ---- apps left running in the background: close them after a while to free the TV's memory ---------

var CLEAN_MS = 60000, cleanAt = 0, closeAfter = 5 * 60000, hiddenSince = {};

function closeApp(id, name) {
  try {
    var req = http.request({ host: '127.0.0.1', port: 8001, path: '/api/v2/applications/' + encodeURIComponent(id),
      method: 'DELETE', timeout: 3000 }, function (res) {
      res.resume();
      note('đóng ' + (name || id) + ' chạy ngầm (giải phóng RAM): ' + res.statusCode);
    });
    req.on('error', function () {});
    req.on('timeout', function () { req.abort(); });
    req.end();
  } catch (e) { /* nothing to do */ }
}

/** Once a minute: an app that has stayed hidden for closeAfter (Netflix only hides when you leave it) gets closed. */
function clean() {
  if (!closeAfter || !known.length || Date.now() - cleanAt < CLEAN_MS) return;
  cleanAt = Date.now();
  known.forEach(function (id) {
    status(id, function (s) {
      if (!s || !s.running || s.visible) { delete hiddenSince[id]; return; }
      if (watched && watched.ids.indexOf(id) !== -1) return;   // just left: tick() decides about going home first
      if (!hiddenSince[id]) hiddenSince[id] = Date.now();
      else if (Date.now() - hiddenSince[id] >= closeAfter) { delete hiddenSince[id]; closeApp(id, s.name); }
    });
  });
}

// ---- web server on port 8701: setup from a phone or laptop, and a status page ---------------------------------
//
//   GET  /                      the setup page (sent here by the app on the TV: it is a file of the app)
//   GET  /status                what the service is doing (for debugging)
//   GET  /api/state?pin=…       what is set now                          (PIN shown on the TV)
//   POST /api/profile?pin=…     name, city, birthdays (JSON)             (PIN)
//   POST /api/photo?pin=…       {kind: 'family'|'avatar', data: 'data:image/jpeg;base64,…'}   (PIN)
//   POST /api/clear-photos?pin=…                                          (PIN)
//   /api/local/…                only from the TV itself: page, state and PIN in, the inbox out

var page = '', pin = '', tvState = null, inbox = [], INBOX_MAX = 40, BODY_MAX = 6 * 1048576;

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store' });
  res.end(body);
}

function json(res, code, obj) { send(res, code, 'application/json; charset=utf-8', JSON.stringify(obj)); }

function readBody(req, cb) {
  var chunks = [], size = 0, done = false;
  req.on('data', function (c) {
    size += c.length;
    if (size > BODY_MAX) { done = true; cb(null); try { req.destroy(); } catch (e) { /* closed */ } return; }
    chunks.push(c);
  });
  req.on('end', function () {
    if (done) return;
    cb(typeof Buffer !== 'undefined' && chunks.length && typeof chunks[0] !== 'string'
      ? Buffer.concat(chunks).toString('utf8') : chunks.join(''));
  });
  req.on('error', function () { if (!done) { done = true; cb(null); } });
}

function isLocal(req) {
  var a = (req.socket && req.socket.remoteAddress) || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function query(url, key) {
  var m = new RegExp('[?&]' + key + '=([^&]*)').exec(url);
  return m ? decodeURIComponent(m[1]) : '';
}

function queue(item) {
  inbox.push(item);
  if (inbox.length > INBOX_MAX) inbox.shift();
}

function handle(req, res) {
  var url = req.url || '/', path = url.split('?')[0], method = req.method;
  if (method === 'OPTIONS') return send(res, 204, 'text/plain', '');
  if (method === 'GET' && (path === '/' || path === '/index.html')) {
    return page ? send(res, 200, 'text/html; charset=utf-8', page)
      : send(res, 503, 'text/plain; charset=utf-8', 'Mở màn hình chính trên TV một lần rồi tải lại trang này.');
  }
  if (method === 'GET' && path === '/status') {
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      since: new Date(started).toString(), power: power, watching: watched ? watched.ids : null,
      knownApps: known.length, tvUptimeS: tvUptimeS(), closeAfterMin: closeAfter / 60000, inbox: inbox.length, log: log
    }, null, 1));
  }

  if (path.indexOf('/api/local/') === 0) {
    if (!isLocal(req)) return json(res, 403, { error: 'chỉ dành cho TV' });
    if (path === '/api/local/inbox') { var out = inbox; inbox = []; return json(res, 200, { items: out }); }
    return readBody(req, function (body) {
      if (body === null) return json(res, 413, { error: 'quá lớn' });
      if (path === '/api/local/page') { page = body; return json(res, 200, { ok: true }); }
      if (path === '/api/local/state') {
        try { var d = JSON.parse(body); pin = String(d.pin || pin); tvState = d.state || tvState; } catch (e) { return json(res, 400, {}); }
        return json(res, 200, { ok: true });
      }
      json(res, 404, {});
    });
  }

  if (path.indexOf('/api/') === 0) {
    if (!pin || query(url, 'pin') !== pin) return json(res, 401, { error: 'Sai mã PIN. Xem mã trên TV: Cài đặt → Cài đặt bằng điện thoại.' });
    if (method === 'GET' && path === '/api/state') return json(res, 200, { state: tvState, pending: inbox.length });
    return readBody(req, function (body) {
      if (body === null) return json(res, 413, { error: 'Ảnh quá lớn' });
      var d = null;
      try { d = body ? JSON.parse(body) : {}; } catch (e) { return json(res, 400, { error: 'Dữ liệu không hợp lệ' }); }
      if (path === '/api/profile') queue({ type: 'profile', data: d });
      else if (path === '/api/photo' && /^data:image\/(jpeg|png|webp);base64,/.test(d.data || '')) queue({ type: 'photo', kind: d.kind === 'avatar' ? 'avatar' : 'family', data: d.data });
      else if (path === '/api/clear-photos') queue({ type: 'clearPhotos' });
      else return json(res, 400, { error: 'Không hiểu yêu cầu' });
      note('nhận từ điện thoại: ' + path.slice(5));
      json(res, 200, { ok: true });
    });
  }
  send(res, 404, 'text/plain', 'not found');
}

try {
  var server = http.createServer(function (req, res) {
    try { handle(req, res); } catch (e) { try { json(res, 500, { error: String(e && e.message) }); } catch (x) { /* closed */ } }
  });
  server.on('error', function () { /* port taken: no setup page or status page */ });
  // NHAMINH_PORT: only for running this file under Node on a computer (tests/service.test.js).
  server.listen((typeof process !== 'undefined' && process.env && +process.env.NHAMINH_PORT) || 8701);
  module.exports._server = server;
} catch (e) { /* no server support */ }

var lastTick = Date.now();

function tick() {
  // Paused by the system for a while (screen off, low memory…): every "since when" is stale now. Start the
  // counts afresh rather than acting on them, and forget the bring-home checks scheduled before the pause.
  var now = Date.now();
  if (now - lastTick > 3000) {
    note('dịch vụ vừa bị tạm dừng ' + Math.round((now - lastTick) / 1000) + ' giây');
    if (watched) watched.hiddenSince = 0;
    hiddenSince = {};
    wakeAt = 0;
  }
  lastTick = now;
  checkPower();
  if (power === 'on') clean();
  if (!watched) return guard();
  if (Date.now() - watched.since > GIVE_UP_MS && !watched.seenRunning) { watched = null; return; }
  appState(watched.ids, function (s) {
    if (!watched || !s) return;
    if (s.visible) { watched.seenRunning = true; watched.hiddenSince = 0; watched.goneSince = 0; return; }
    if (s.running && !watched.seenRunning) return;        // still starting
    var others = watched.others;
    if (!s.running && watched.seenRunning) {              // it ran and now it is gone: the user closed it
      if (selfDebug && watched.ids.some(function (id) { return RESTARTS.test(id); })) {
        if (!watched.goneSince) { watched.goneSince = Date.now(); return; }   // …unless it is restarting itself
        if (Date.now() - watched.goneSince < RESTART_MS) return;
      }
      watched = null;
      return goHome(others);
    }
    if (s.running && watched.seenRunning) {               // running but out of sight
      if (!watched.hiddenSince) watched.hiddenSince = Date.now();
      else if (Date.now() - watched.hiddenSince >= HIDDEN_MS) {
        watched = null;
        goHome(others);
      }
    }
  });
}

/** Takes what the home screen sent with this start; returns how many items there were (0: the TV started us). */
function readRequest() {
  try {
    var req = tizen.application.getCurrentApplication().getRequestedAppControl();
    var data = (req && req.appControl && req.appControl.data) || [];
    data.forEach(function (d) {
      if (d.key === 'launched' && d.value && d.value.length) {
        wakeAt = 0;   // the user opened an app from the home screen: no more bringing the home screen up
        watched = { ids: d.value.filter(Boolean), since: Date.now(), seenRunning: false, others: watched ? watched.others : [] };
      } else if (d.key === 'others' && watched) {
        watched.others = d.value || [];
      } else if (d.key === 'apps') {
        known = (d.value || []).filter(function (id) { return id && id !== HOME; });
      } else if (d.key === 'closeAfter') {
        closeAfter = Math.max(0, parseInt(d.value && d.value[0], 10) || 0) * 60000;
      } else if (d.key === 'stop') {
        watched = null;
      }
    });
    return data.length;
  } catch (e) { return 0; }   // started without data
}

module.exports.onStart = function () {
  var up = tvUptimeS();
  note('dịch vụ bắt đầu (TV đã chạy ' + up + ' giây)');
  var sent = readRequest();
  // Started by the TV itself right after it booted (on-boot="true", honoured for Partner-signed installs): no app is
  // on screen that the user chose yet, so the home screen goes up — the cold-boot case Samsung keeps for its own apps.
  if (!sent && up !== null && up < BOOT_S) bringHome('TV vừa khởi động', BOOT_TRIES);
  if (!timer) timer = setInterval(tick, POLL_MS);
};

module.exports.onRequest = function () {
  readRequest();
  if (!timer) timer = setInterval(tick, POLL_MS);
};

module.exports.onExit = function () {
  if (timer) clearInterval(timer);
  timer = null;
};
