/*
 * Dịch vụ nền của Nhà Mình: đưa bạn về màn hình chính khi thoát app đã mở từ đó.
 *
 * Samsung không cho app tự cài làm nút Home, và khi một app thoát thì TV về Smart Hub. Màn hình chính
 * báo cho dịch vụ này app nào vừa được mở (app-control data "launched"); dịch vụ hỏi TV mỗi 0,3 giây xem
 * app đó còn chạy không, qua REST API của chính TV (http://127.0.0.1:8001/api/v2/applications/<id>).
 * Khi app đã chạy rồi tắt — tức là bạn vừa thoát nó — dịch vụ mở lại màn hình chính. App chỉ ẩn đi chứ
 * không tắt khi thoát (Netflix…) cũng tính là đã thoát nếu khuất quá 1,2 giây.
 *
 * Chỉ theo dõi app mở từ màn hình chính, nên bấm Source sang HDMI hay mở app từ Smart Hub không bị can thiệp.
 * Cùng cơ chế dịch vụ nền với TizenBrew (config.xml: <tizen:service>, feature web.service).
 */
var http = require('http');

var HOME = 'NhaMinh000.NhaMinh';
var POLL_MS = 300;     // Smart Hub flashes for at most this long after closing an app
var GIVE_UP_MS = 30 * 60 * 1000;   // stop watching an app that never appeared (launch failed)

var watched = null;   // {ids: [storeId, tizenId], since, seenRunning}
var timer = null;

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

function goHome(others) {
  status(HOME, function (me) {
    if (me && me.visible) return;
    anyVisible(others || [], function (busy) {
      if (busy) return;
      try { tizen.application.launch(HOME, function () {}, function () {}); } catch (e) { /* nothing to do */ }
    });
  });
}

function tick() {
  if (!watched) return;
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

function readRequest() {
  try {
    var req = tizen.application.getCurrentApplication().getRequestedAppControl();
    var data = (req && req.appControl && req.appControl.data) || [];
    data.forEach(function (d) {
      if (d.key === 'launched' && d.value && d.value.length) {
        watched = { ids: d.value.filter(Boolean), since: Date.now(), seenRunning: false, others: watched ? watched.others : [] };
      } else if (d.key === 'others' && watched) {
        watched.others = d.value || [];
      } else if (d.key === 'stop') {
        watched = null;
      }
    });
  } catch (e) { /* started without data */ }
}

module.exports.onStart = function () {
  readRequest();
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
