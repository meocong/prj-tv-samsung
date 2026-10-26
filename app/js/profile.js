/*
 * Cấu hình riêng của từng nhà, đặt bằng điện thoại hoặc máy tính (trang http://<IP TV>:8701/ do dịch vụ nền phục vụ).
 *
 * Dữ liệu đi đường này: trang trên điện thoại → dịch vụ nền (giữ trong bộ nhớ, /api/inbox) → app này hỏi lấy và lưu:
 * tên nhà, thành phố, sinh nhật vào localStorage (nhaminh.profile); ảnh gia đình và avatar vào IndexedDB
 * (nhaminh-photos). Lúc mở app, cấu hình ghép đè lên CONFIG (sau config.local.js); ảnh có địa chỉ dạng "idb:<id>".
 *
 *   Profile.photoUrl(url, cb)   "idb:<id>" → cb(blob URL | null); địa chỉ khác trả nguyên
 *   Profile.sync(cb)            lấy dữ liệu mới từ dịch vụ nền; cb(list những gì đã nhận) khi có
 *   Profile.publish()           gửi trang cài đặt, mã PIN và trạng thái hiện tại cho dịch vụ nền
 *   Profile.pin()               mã PIN 6 số (cố định cho TV này)
 *   Profile.applyAvatar(el)     đặt ảnh avatar riêng (nếu có) làm nền cho phần tử
 */
(function (root) {
  'use strict';

  var C = root.CONFIG, KEY = 'profile', SERVICE = 'http://127.0.0.1:8701';
  var store = root.Platform && Platform.store;
  var p = (store && store.get(KEY, null)) || {};
  p.photos = p.photos || [];

  // ---- apply to CONFIG, before the home screen reads it -------------------------------------------

  if (p.familyName) C.familyName = p.familyName;
  if (p.location && p.location.latitude) {
    C.location = p.location;
    C.locations = [p.location].concat((C.locations || []).filter(function (l) { return l.name !== p.location.name; }));
  }
  if (p.birthdays) C.birthdays = p.birthdays;
  if (p.photos.length) C.familyPhotos = p.photos.map(function (id) { return 'idb:' + id; });

  // ---- photos in IndexedDB ---------------------------------------------------------------------

  var db = null, dbFailed = false, dbWaiting = [], urls = {};

  function open(cb) {
    if (db || dbFailed) return cb(db);
    dbWaiting.push(cb);
    if (dbWaiting.length > 1) return;
    function flush(d) { var w = dbWaiting; dbWaiting = []; w.forEach(function (f) { f(d); }); }
    try {
      var req = root.indexedDB.open('nhaminh-photos', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('photos'); };
      req.onsuccess = function () { db = req.result; flush(db); };
      req.onerror = req.onblocked = function () { dbFailed = true; flush(null); };
    } catch (e) { dbFailed = true; flush(null); }
  }

  function putPhoto(id, blob, cb) {
    open(function (d) {
      if (!d) return cb(false);
      try {
        var tx = d.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(blob, id);
        tx.oncomplete = function () { cb(true); };
        tx.onerror = function () { cb(false); };
      } catch (e) { cb(false); }
    });
  }

  function deletePhoto(id) {
    open(function (d) {
      if (!d) return;
      try { d.transaction('photos', 'readwrite').objectStore('photos').delete(id); } catch (e) { /* gone already */ }
    });
    if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
  }

  /** Blob URLs are made once per photo and kept: a family has a handful of photos. */
  function photoUrl(url, cb) {
    var m = /^idb:(.+)$/.exec(url || '');
    if (!m) return cb(url);
    var id = m[1];
    if (urls[id]) return cb(urls[id]);
    open(function (d) {
      if (!d) return cb(null);
      try {
        var r = d.transaction('photos').objectStore('photos').get(id);
        r.onsuccess = function () { cb(r.result ? (urls[id] = URL.createObjectURL(r.result)) : null); };
        r.onerror = function () { cb(null); };
      } catch (e) { cb(null); }
    });
  }

  function applyAvatar(el) {
    if (!el || !p.avatar) return;
    photoUrl('idb:' + p.avatar, function (u) { if (u) el.style.backgroundImage = 'url(' + u + ')'; });
  }

  // ---- talking to the background service --------------------------------------------------------

  function request(method, path, body, cb) {
    if (!root.Platform || !Platform.isTV) return cb && cb(null);   // the preview has no service
    var xhr = new XMLHttpRequest();
    xhr.open(method, SERVICE + path);
    xhr.timeout = 8000;
    if (body !== undefined) xhr.setRequestHeader('Content-Type', typeof body === 'string' ? 'text/plain' : 'application/json');
    xhr.onload = function () { cb && cb(xhr.status === 200 ? xhr.responseText : null); };
    xhr.onerror = xhr.ontimeout = function () { cb && cb(null); };
    xhr.send(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body));
  }

  function pin() {
    var v = store.get('setupPin', null);
    if (!v) { v = String(100000 + Math.floor(Math.random() * 900000)); store.set('setupPin', v); }
    return v;
  }

  function state() {
    return { familyName: C.familyName, location: C.location, birthdays: C.birthdays || [], photos: p.photos.length,
      avatar: !!p.avatar, version: root.Platform ? Platform.version() : '' };
  }

  /** The setup page (a file of this app), the PIN and what is set now, for the service to serve. */
  function publish() {
    if (!root.Platform || !Platform.isTV) return;
    request('POST', '/api/local/state', { pin: pin(), state: state() });
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'service/setup.html');
    xhr.onload = function () { if (xhr.responseText) request('POST', '/api/local/page', xhr.responseText); };
    xhr.send();
  }

  function dataUrlToBlob(url) {
    var m = /^data:([^;,]+);base64,(.*)$/.exec(url || '');
    if (!m) return null;
    var bin = atob(m[2]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] });
  }

  function save() { p.updated = Date.now(); store.set(KEY, p); }

  /** Takes what the phone sent; cb(["tên nhà", "2 ảnh", …]) when something arrived. */
  function sync(cb) {
    request('GET', '/api/local/inbox', undefined, function (text) {
      var items = [];
      try { items = (JSON.parse(text || '{}').items) || []; } catch (e) { /* nothing */ }
      if (!items.length) return;
      var got = [], i = 0;
      (function next() {
        if (i >= items.length) {
          save();
          publish();
          return cb && cb(got);
        }
        var it = items[i++];
        if (it.type === 'profile') {
          var d = it.data || {};
          if (typeof d.familyName === 'string' && d.familyName.trim()) { p.familyName = d.familyName.trim().slice(0, 60); got.push('tên nhà'); }
          if (d.location && d.location.latitude) {
            p.location = { name: String(d.location.name).slice(0, 60), latitude: +d.location.latitude,
              longitude: +d.location.longitude, timezone: d.location.timezone || 'auto' };
            var s = store.get('settings', {}) || {};
            s.location = 0;   // the new city is first in the list now
            store.set('settings', s);
            got.push('thành phố');
          }
          if (Array.isArray(d.birthdays)) { p.birthdays = d.birthdays.slice(0, 30); got.push('sinh nhật'); }
          return next();
        }
        if (it.type === 'photo') {
          var blob = dataUrlToBlob(it.data);
          if (!blob) return next();
          var id = (it.kind === 'avatar' ? 'avatar-' : 'p-') + Date.now() + '-' + i;
          return putPhoto(id, blob, function (ok) {
            if (ok && it.kind === 'avatar') {
              if (p.avatar) deletePhoto(p.avatar);
              p.avatar = id;
              got.push('ảnh avatar');
            } else if (ok) {
              p.photos.push(id);
              got.push('ảnh gia đình');
            }
            next();
          });
        }
        if (it.type === 'clearPhotos') {
          p.photos.forEach(deletePhoto);
          p.photos = [];
          got.push('xóa ảnh gia đình');
        }
        next();
      })();
    });
  }

  root.Profile = { photoUrl: photoUrl, sync: sync, publish: publish, pin: pin, applyAvatar: applyAvatar,
    hasCustom: function () { return !!(p.familyName || p.location || p.photos.length || p.avatar); } };
})(this);
