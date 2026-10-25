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
 * Dịch vụ cũng theo dõi trạng thái nguồn của TV: lúc TV sắp tắt, nó đưa màn hình chính lên trước, để TV chỉ ngủ
 * (Instant On) thì bật lên là thấy màn hình chính chứ không phải app đang xem dở. (Autorun Last App của Samsung chỉ
 * dành cho app được cho phép, nên sau khi tắt hẳn thì cần quy tắc SmartThings: xem docs/cai-dat-tv.md.)
 *
 * http://<IP TV>:8701/ cho biết dịch vụ chạy từ lúc nào, đang canh app nào và những việc vừa làm (để gỡ lỗi).
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

// Smart Hub "personal preview" (config.xml: use.preview = bg_service): the TV starts this service by itself every
// ~10 minutes, also when nobody opened the home screen, e.g. after the TV booted. The preview row is a bonus.
var webapis = null, previewErr = '';
if (typeof global !== 'undefined' && global.webapis) webapis = global.webapis;
['$WEBAPIS/service/webapis.js', '$WEBAPIS/webapis/webapis.js', '/usr/share/webapis/webapis/webapis.js'].forEach(function (p) {
  if (webapis) return;
  try { webapis = require(p); previewErr = 'ok: ' + p; } catch (e) { previewErr += p + ': ' + (e && e.message) + '; '; }
});
var previewAt = 0;
function setPreview() {
  if (!webapis || !webapis.preview || Date.now() - previewAt < 10 * 60000) return;
  previewAt = Date.now();
  var data = { sections: [{ title: 'Màn hình chính', tiles: [{
    title: 'Mở màn hình chính', subtitle: 'Thời tiết, lịch, YouTube, tin mới', image_ratio: '16by9',
    image_url: 'https://www.bing.com/th?id=OHR.NaejangsanNP_ROW0481262720_1920x1080.jpg',
    action_data: JSON.stringify({ open: 'home' }), is_playable: false }] }] };
  try {
    webapis.preview.setPreviewData(JSON.stringify(data), function () { note('đã cập nhật ô xem trước'); },
      function (e) { note('ô xem trước lỗi: ' + (e && e.message)); });
  } catch (e) { note('ô xem trước lỗi: ' + e.message); }
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

var POWER_MS = 1500, powerAt = 0, power = 'on';

function powerState(cb) {
  var done = false;
  function finish(v) { if (!done) { done = true; cb(v); } }
  try {
    var req = http.get({ host: '127.0.0.1', port: 8001, path: '/api/v2/', timeout: 1500 }, function (res) {
      var body = '';
      res.on('data', function (d) { body += d; });
      res.on('end', function () {
        try { finish((JSON.parse(body).device || {}).PowerState || null); } catch (e) { finish(null); }
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
 * Right after the TV comes on: make sure the home screen ends up in front, checking a few times over ~15 seconds
 * because Smart Hub or the TV's own "last app" may come up after us.
 */
function bringHome(why) {
  [1500, 4000, 8000, 15000].forEach(function (ms) {
    setTimeout(function () {
      if (power !== 'on') return;
      status(HOME, function (me) { if (!me || !me.visible) launchHome(why); });
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

// ---- status page for debugging: http://<TV>:8701/ -------------------------------------------------

try {
  var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      since: new Date(started).toString(), power: power, watching: watched ? watched.ids : null,
      knownApps: known.length, tvUptimeS: tvUptimeS(), fs: !!fs, preview: !!(webapis && webapis.preview),
      previewErr: previewErr || undefined, closeAfterMin: closeAfter / 60000, log: log
    }, null, 1));
  });
  server.on('error', function () { /* port taken: no status page */ });
  server.listen(8701);
} catch (e) { /* no server support */ }

function tick() {
  checkPower();
  if (power === 'on') clean();
  if (!watched) return guard();
  if (Date.now() - watched.since > GIVE_UP_MS && !watched.seenRunning) { watched = null; return; }
  appState(watched.ids, function (s) {
    if (!watched || !s) return;
    if (s.visible) { watched.seenRunning = true; watched.hiddenSince = 0; return; }
    if (s.running && !watched.seenRunning) return;        // still starting
    var others = watched.others;
    if (!s.running && watched.seenRunning) {              // it ran and now it is gone: the user closed it
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

/** Reads the request; returns true when it came from the home screen (it always sends the app list). */
function readRequest() {
  var fromHome = false;
  try {
    var req = tizen.application.getCurrentApplication().getRequestedAppControl();
    var data = (req && req.appControl && req.appControl.data) || [];
    fromHome = data.some(function (d) { return d.key === 'apps'; });
    if (!fromHome) note('được gọi bởi ' + ((req && req.callerAppId) || 'hệ thống') + ' (' + ((req && req.appControl && req.appControl.operation) || '?') + ')');
    data.forEach(function (d) {
      if (d.key === 'launched' && d.value && d.value.length) {
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
  } catch (e) { note('được gọi không kèm dữ liệu'); }
  return fromHome;
}

/** Started by the TV, not by the home screen: right after a boot, put the home screen up. */
function startedByTv() {
  setPreview();
  var up = tvUptimeS();
  note('TV đã chạy ' + (up === null ? '?' : up + ' giây'));
  if (up !== null && up < 300) bringHome('TV vừa khởi động');
}

module.exports.onStart = function () {
  note('dịch vụ bắt đầu');
  if (!readRequest()) startedByTv();
  if (!timer) timer = setInterval(tick, POLL_MS);
};

module.exports.onRequest = function () {
  if (!readRequest()) startedByTv();
  if (!timer) timer = setInterval(tick, POLL_MS);
};

module.exports.onExit = function () {
  if (timer) clearInterval(timer);
  timer = null;
};
