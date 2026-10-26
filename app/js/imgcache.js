/*
 * Ảnh hình nền lưu ngay trên TV (IndexedDB), để mở app là có ảnh và đổi ảnh không phải chờ mạng.
 *
 *   ImageCache.load(url, cb)   cb(src, fromCache): src là blob: URL khi đã lưu (gọi ImageCache.done(src) sau khi
 *                              vẽ xong), hoặc chính url khi không lưu được (mất mạng, preview không có IndexedDB)
 *   ImageCache.warm(url)       tải sẵn vào bộ nhớ, không làm gì nếu đã có
 *
 * Giữ tối đa MAX ảnh (~400 KB mỗi ảnh, tổng ~12 MB): đầy thì xóa ảnh lâu không dùng nhất, nên ảnh đang giữ cố
 * định không bao giờ bị xóa. Ảnh trong app (ảnh gia đình) không cần lưu.
 */
(function (root) {
  'use strict';

  var DB = 'nhaminh-img', STORE = 'img', MAX = 30;
  var db = null, failed = false, waiting = [];

  function isRemote(url) { return /^https?:/.test(url); }

  function open(cb) {
    if (db || failed) return cb(db);
    waiting.push(cb);
    if (waiting.length > 1) return;
    function flush(d) { var w = waiting; waiting = []; w.forEach(function (f) { f(d); }); }
    try {
      var req = root.indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { db = req.result; flush(db); };
      req.onerror = req.onblocked = function () { failed = true; flush(null); };
    } catch (e) { failed = true; flush(null); }
  }

  function get(url, cb) {
    open(function (d) {
      if (!d) return cb(null);
      try {
        var r = d.transaction(STORE).objectStore(STORE).get(url);
        r.onsuccess = function () { cb(r.result && r.result.blob ? r.result : null); };
        r.onerror = function () { cb(null); };
      } catch (e) { cb(null); }
    });
  }

  function put(url, blob) {
    open(function (d) {
      if (!d) return;
      try {
        var tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ blob: blob, at: Date.now() }, url);
        tx.oncomplete = prune;
      } catch (e) { /* storage full: the photo is simply loaded from the network next time */ }
    });
  }

  /** A photo just used moves to the front of the queue. */
  function touch(url, entry) {
    open(function (d) {
      if (!d) return;
      try { d.transaction(STORE, 'readwrite').objectStore(STORE).put({ blob: entry.blob, at: Date.now() }, url); } catch (e) { /* fine */ }
    });
  }

  /** Keep the MAX most recently used photos. */
  function prune() {
    try {
      var all = [], store = db.transaction(STORE, 'readwrite').objectStore(STORE);
      store.openCursor().onsuccess = function (ev) {
        var c = ev.target.result;
        if (c) { all.push({ key: c.key, at: c.value.at || 0 }); return c.continue(); }
        all.sort(function (a, b) { return b.at - a.at; });
        all.slice(MAX).forEach(function (x) { store.delete(x.key); });
      };
    } catch (e) { /* nothing to prune */ }
  }

  function download(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', Platform.isTV ? url : '/proxy?u=' + encodeURIComponent(url));
    xhr.responseType = 'blob';
    xhr.timeout = 30000;
    xhr.onload = function () {
      var b = xhr.response;
      cb(xhr.status === 200 && b && b.size > 10000 && /^image\//.test(b.type || 'image/') ? b : null);
    };
    xhr.onerror = xhr.ontimeout = function () { cb(null); };
    xhr.send();
  }

  // The photo that was up last time: its read from IndexedDB starts now, while the rest of the page loads.
  var early = null;
  try {
    var last = JSON.parse(root.localStorage.getItem('nhaminh.wall') || 'null');
    if (last && isRemote(last.url)) {
      var e = early = { url: last.url, hit: undefined, waiting: [] };
      get(last.url, function (hit) {
        e.hit = hit;
        e.waiting.forEach(function (f) { f(hit); });
        e.waiting = [];
      });
    }
  } catch (e) { /* no storage */ }

  function cached(url, cb) {
    if (early && early.url === url) {
      var e = early;
      early = null;   // once: later reads go to the database
      if (e.hit !== undefined) return cb(e.hit);
      return e.waiting.push(cb);
    }
    get(url, cb);
  }

  var mine = {};   // blob URLs made here (the family photos' URLs belong to Profile and are kept)

  function load(url, cb) {
    if (/^idb:/.test(url) && root.Profile) return Profile.photoUrl(url, function (u) { cb(u || url, false); });
    if (!isRemote(url)) return cb(url, false);
    cached(url, function (hit) {
      if (hit) { touch(url, hit); return cb(own(URL.createObjectURL(hit.blob)), true); }
      download(url, function (blob) {
        if (!blob) return cb(url, false);
        put(url, blob);
        cb(own(URL.createObjectURL(blob)), true);
      });
    });
  }

  function warm(url) {
    if (!isRemote(url)) return;
    get(url, function (hit) {
      if (!hit) download(url, function (blob) { if (blob) put(url, blob); });
    });
  }

  function own(u) { mine[u] = true; return u; }

  function done(src) { if (mine[src]) { delete mine[src]; URL.revokeObjectURL(src); } }

  root.ImageCache = { load: load, warm: warm, done: done };
})(this);
