/*
 * Lớp mỏng quanh API của TV (tizen.*, webapis.*). Trên Chrome máy tính (xem thử) mọi hàm vẫn chạy:
 * danh sách app là dữ liệu mẫu, và JSON không có CORS đi qua proxy của tools/preview.py.
 */
(function (root) {
  'use strict';

  var isTV = !!(root.tizen && tizen.application);

  function getJSON(url, cb, timeoutMs) {
    var xhr = new XMLHttpRequest();
    var done = false;
    function finish(err, data) { if (!done) { done = true; cb(err, data); } }
    xhr.open('GET', isTV ? url : '/proxy?u=' + encodeURIComponent(url));
    xhr.timeout = timeoutMs || 15000;
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) return finish(new Error('HTTP ' + xhr.status));
      try { finish(null, JSON.parse(xhr.responseText)); } catch (e) { finish(e); }
    };
    xhr.onerror = function () { finish(new Error('network')); };
    xhr.ontimeout = function () { finish(new Error('timeout')); };
    xhr.send();
  }

  var store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem('nhaminh.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('nhaminh.' + key, JSON.stringify(value)); } catch (e) { /* storage full */ }
    }
  };

  /**
   * Things kept for good (the calendar's "ngày này năm xưa"): IndexedDB, so they never crowd localStorage.
   * kv.get(key, cb(value|null)), kv.set(key, value). Without IndexedDB it falls back to localStorage.
   */
  var kvDb = null, kvFailed = false, kvWaiting = [];
  function kvOpen(cb) {
    if (kvDb || kvFailed) return cb(kvDb);
    kvWaiting.push(cb);
    if (kvWaiting.length > 1) return;
    function flush(d) { var w = kvWaiting; kvWaiting = []; w.forEach(function (f) { f(d); }); }
    try {
      var req = root.indexedDB.open('nhaminh-kv', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onsuccess = function () { kvDb = req.result; flush(kvDb); };
      req.onerror = req.onblocked = function () { kvFailed = true; flush(null); };
    } catch (e) { kvFailed = true; flush(null); }
  }
  var kv = {
    get: function (key, cb) {
      kvOpen(function (d) {
        if (!d) return cb(store.get('kv.' + key, null));
        try {
          var r = d.transaction('kv').objectStore('kv').get(key);
          r.onsuccess = function () { cb(r.result === undefined ? null : r.result); };
          r.onerror = function () { cb(null); };
        } catch (e) { cb(null); }
      });
    },
    set: function (key, value) {
      kvOpen(function (d) {
        if (!d) return store.set('kv.' + key, value);
        try { d.transaction('kv', 'readwrite').objectStore('kv').put(value, key); } catch (e) { /* full: fetched again next time */ }
      });
    }
  };

  function ownAppId() {
    try { return tizen.application.getCurrentApplication().appInfo.id; } catch (e) { return 'NhaMinh000.NhaMinh'; }
  }

  /**
   * The apps on this TV: [{id, storeId, title, desc, icon}].
   *
   * window.TV_APPS (app/js/apps.js, made by tools/sync_apps.py) is a catalog of well-known apps with good artwork,
   * a store id (the TV's REST API wants it for some apps) and a short description. Whatever the TV itself reports
   * as installed and visible is the truth: catalog apps come with their artwork, any other app with the TV's own
   * name and icon. So the home screen fits every TV, not only the one the catalog was made on.
   */
  function listApps(cb) {
    var catalog = (root.TV_APPS || []).map(function (a) { return Object.assign({}, a); });
    if (!isTV) return cb(catalog);
    try {
      tizen.application.getAppsInfo(function (list) {
        var apps = mergeApps(list, catalog);
        cb(apps.length ? apps : catalog);
      }, function () { cb(catalog); });
    } catch (e) { cb(catalog); }
  }

  // getAppsInfo also lists ~100 parts of the system (services, previews, companion pieces): only apps a person
  // opens from the Apps panel pass. Store apps have a 10-character package id ("9Ur5IzDKqV.TizenYouTube").
  var STORE_ID = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_.-]+$/;
  var NOT_AN_APP = /service|widget|preview|daemon|agent|helper|plugin|wgt-installer|devicecare|\.bg$|_bg$/i;

  /** Pure (tests/apps.test.js): the TV's list → the apps to show, in catalog order, then by name. */
  function mergeApps(list, catalog) {
    var byId = {}, out = [], seen = {};
    catalog.forEach(function (a) { byId[a.id] = a; });
    (list || []).forEach(function (info) {
      var id = info && info.id;
      if (!id || seen[id] || id.indexOf(OWN_PACKAGE) === 0) return;
      var known = byId[id];
      if (!known && (info.show === false || !STORE_ID.test(id) || NOT_AN_APP.test(id))) return;
      seen[id] = true;
      out.push(known ? known : { id: id, storeId: '', title: info.name || id, desc: '', icon: iconUrl(info.iconPath), rank: 9999 });
    });
    var order = {};
    catalog.forEach(function (a, i) { order[a.id] = i; });
    out.sort(function (a, b) {
      var oa = order[a.id] === undefined ? 1e6 : order[a.id], ob = order[b.id] === undefined ? 1e6 : order[b.id];
      return oa - ob || String(a.title).localeCompare(String(b.title));
    });
    return out;
  }

  function iconUrl(path) {
    if (!path) return '';
    if (/^(file|https?):/.test(path)) return path;
    return 'file://' + path.split('/').map(encodeURIComponent).join('/');
  }

  var WATCH_SERVICE = 'NhaMinh000.WatchService', OWN_PACKAGE = 'NhaMinh000.';

  /**
   * Start the background service, optionally telling it which app is about to open ([storeId, tizenId]).
   * done() runs once the service has the message (or failed to get it) — never more than 800 ms later.
   */
  var serviceOptions = { closeAfter: 5 };   // minutes an app may sit hidden before the service closes it; 0 = never

  /** Settings the service should know about; sent with every message (and right away). */
  function setServiceOption(key, value) {
    serviceOptions[key] = value;
    if (isTV) tellService(null);
  }

  function tellService(launchedIds, done) {
    var called = false;
    function finish() { if (!called) { called = true; if (done) done(); } }
    try {
      // Every message carries the TV's apps (most used first), so the service can also watch apps opened elsewhere.
      var data = [new tizen.ApplicationControlData('apps', (root.TV_APPS || []).map(function (a) { return a.storeId || a.id; })),
        new tizen.ApplicationControlData('closeAfter', [String(serviceOptions.closeAfter)])];
      if (launchedIds) {
        data.push(new tizen.ApplicationControlData('launched', launchedIds.filter(Boolean)));
        // The other apps on the home screen: if one of them is in front, the user moved on by themselves.
        var others = (root.TV_APPS || []).map(function (a) { return a.storeId || a.id; })
          .filter(function (id) { return launchedIds.indexOf(id) === -1; });
        data.push(new tizen.ApplicationControlData('others', others));
      }
      var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/service', null, null, null, data);
      tizen.application.launchAppControl(ctl, WATCH_SERVICE, finish, finish);
    } catch (e) { finish(); }   // no service support: closing an app simply returns to Smart Hub
    setTimeout(finish, 800);
  }

  /**
   * Open an app; with watchIds, come back to the home screen when it is closed. The service is told
   * first: once the other app is in front this page is frozen and could not send anything.
   */
  function launch(id, onError, watchIds) {
    if (!isTV) { if (onError) onError(new Error('preview')); return; }
    // Launched through an app control, the other app has this page as its caller, so Tizen may hand the
    // screen straight back when it closes; plain launch() is the fallback for apps that refuse that.
    function plain() {
      try {
        tizen.application.launch(id, function () {}, function (e) { if (onError) onError(e); });
      } catch (e) { if (onError) onError(e); }
    }
    function go() {
      try {
        var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, []);
        tizen.application.launchAppControl(ctl, id, function () {}, plain, { onsuccess: function () {}, onfailure: function () {} });
      } catch (e) { plain(); }
    }
    if (watchIds) tellService(watchIds, go); else go();
  }

  function exit() {
    try { tizen.application.getCurrentApplication().exit(); } catch (e) { /* preview */ }
  }

  /**
   * Samsung's webapis.js costs ~0.4 s to load on this TV and is only needed for the TV screensaver switch and the
   * model name, so it is fetched after the home screen is up instead of from index.html.
   */
  var webapisWaiting = null;
  function withWebapis(cb) {
    if (root.webapis || !isTV) return cb(root.webapis || null);
    if (webapisWaiting) return webapisWaiting.push(cb);
    webapisWaiting = [cb];
    var el = document.createElement('script');
    el.src = '$WEBAPIS/webapis/webapis.js';
    el.onload = el.onerror = function () {
      var w = webapisWaiting;
      webapisWaiting = null;
      w.forEach(function (f) { f(root.webapis || null); });
    };
    document.body.appendChild(el);
  }

  /** Keep the TV's own screensaver away while our photo frame is showing (and allow it otherwise). */
  function setTvScreenSaver(allow) {
    withWebapis(function (w) {
      try {
        var s = w.appcommon.AppCommonScreenSaverState;
        w.appcommon.setScreenSaver(allow ? s.SCREEN_SAVER_ON : s.SCREEN_SAVER_OFF, function () {}, function () {});
      } catch (e) { /* no webapis */ }
    });
  }

  /** HDMI and other sources: [{label, connected, source}] — source is the tizen object for setInput. */
  function listInputs(cb) {
    if (!isTV) {
      return cb([
        { label: 'HDMI 1', connected: true, source: null },
        { label: 'HDMI 2', connected: false, source: null }
      ]);
    }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
        var out = [];
        (vs.connected || []).forEach(function (s) { out.push(inputOf(s, true)); });
        (vs.disconnected || []).forEach(function (s) { out.push(inputOf(s, false)); });
        out = out.filter(function (i) { return i.label.indexOf('HDMI') === 0 || i.label === 'AV'; });
        out.sort(function (a, b) { return a.label < b.label ? -1 : 1; });
        cb(out);
      }, function () { cb([]); });
    } catch (e) { cb([]); }
  }

  function inputOf(s, connected) {
    var type = String(s.type || '');
    var label = type === 'HDMI' ? 'HDMI ' + s.number : (type === 'AV' ? 'AV' : type + (s.number ? ' ' + s.number : ''));
    return { label: label, connected: connected, source: s };
  }

  /** Switch the main window to an input, then hand the screen to the TV viewer. onError only on failure. */
  function setInput(input, onError) {
    if (!isTV || !input.source) return onError(new Error('preview'));
    try {
      tizen.tvwindow.setSource(input.source, function () {
        launch('org.tizen.tv-viewer', onError);
      }, onError, 'MAIN');
    } catch (e) { onError(e); }
  }

  function watchTv(cb) { launch('org.tizen.tv-viewer', cb); }

  /** {type: 'wifi'|'ethernet'|'none', ssid, ip} */
  function network(cb) {
    if (!isTV) return cb({ type: 'wifi', ssid: 'Wi-Fi nhà', ip: '192.168.1.7' });
    try {
      tizen.systeminfo.getPropertyValue('NETWORK', function (n) {
        var type = String(n.networkType || '').toLowerCase();
        if (type === 'wifi') {
          tizen.systeminfo.getPropertyValue('WIFI_NETWORK', function (w) {
            cb({ type: 'wifi', ssid: w.ssid, ip: w.ipAddress });
          }, function () { cb({ type: 'wifi' }); });
        } else if (type === 'ethernet') {
          tizen.systeminfo.getPropertyValue('ETHERNET_NETWORK', function (eth) {
            cb({ type: 'ethernet', ip: eth.ipAddress });
          }, function () { cb({ type: 'ethernet' }); });
        } else {
          cb({ type: type === 'none' ? 'none' : type });
        }
      }, function () { cb({ type: 'unknown' }); });
    } catch (e) { cb({ type: 'unknown' }); }
  }

  /** {model, firmware, network, ip, storage} — whatever the TV is willing to tell. */
  function deviceInfo(cb) {
    withWebapis(function (w) { deviceInfoWith(w, cb); });
  }

  function deviceInfoWith(w, cb) {
    var d = {};
    try { d.model = w.productinfo.getRealModel() || w.productinfo.getModel(); } catch (e) { /* no webapis */ }
    try { d.firmware = w.productinfo.getFirmware(); } catch (e) { /* no webapis */ }
    if (!isTV) { d.model = 'UA50TU8500KXXV (xem thử)'; }
    network(function (n) {
      d.network = n.type === 'wifi' ? 'Wi-Fi · ' + (n.ssid || '') : n.type === 'ethernet' ? 'Cáp mạng' : 'Chưa có mạng';
      d.ip = n.ip || '';
      try {
        tizen.systeminfo.getPropertyValue('STORAGE', function (st) {
          var free = 0;
          (st.units || []).forEach(function (u) { if (u.type === 'INTERNAL') free += u.availableCapacity; });
          if (free) d.storage = (free / 1073741824).toFixed(1) + ' GB';
          cb(d);
        }, function () { cb(d); });
      } catch (e) { cb(d); }
    });
  }

  /** {cpu: percent, storage: 'x.x GB'} — for the optional stats line under the clock. */
  function stats(cb) {
    if (!isTV) return cb({ cpu: 7, storage: '2.4 GB' });
    var out = {}, pending = 2;
    function done() { if (--pending === 0) cb(out); }
    try {
      tizen.systeminfo.getPropertyValue('CPU', function (c) { out.cpu = Math.round(c.load * 100); done(); }, done);
    } catch (e) { done(); }
    try {
      tizen.systeminfo.getPropertyValue('STORAGE', function (st) {
        var free = 0;
        (st.units || []).forEach(function (u) { if (u.type === 'INTERNAL') free += u.availableCapacity; });
        if (free) out.storage = (free / 1073741824).toFixed(1) + ' GB';
        done();
      }, done);
    } catch (e) { done(); }
  }

  function version() {
    try { return tizen.application.getCurrentApplication().appInfo.version; } catch (e) { return 'preview'; }
  }

  /**
   * Open an app at a piece of content: the payload goes in a PAYLOAD app-control datum (what Smart Hub tiles send,
   * e.g. '#watch?v=ID' for YouTube). Apps that refuse it are simply opened. The watch service is told first.
   */
  function launchWithPayload(id, payload, onError, watchIds) {
    if (!isTV) { if (onError) onError(new Error('preview')); return; }
    function plain() { launch(id, onError); }
    function go() {
      try {
        var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null,
          [new tizen.ApplicationControlData('PAYLOAD', [payload])]);
        tizen.application.launchAppControl(ctl, id, function () {}, plain);
      } catch (e) { plain(); }
    }
    if (watchIds) tellService(watchIds, go); else go();
  }

  /** Open the TV's own Settings (sleep timer, picture, sound…): whichever app answers the settings operation. */
  function openTvSettings(onError) {
    if (!isTV) { if (onError) onError(new Error('preview')); return; }
    try {
      var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/setting', null, null, null, null);
      tizen.application.findAppControl(ctl, function (infos) {
        if (!infos || !infos.length) { if (onError) onError(new Error('no settings app')); return; }
        tizen.application.launchAppControl(ctl, infos[0].id, function () {}, onError);
      }, onError);
    } catch (e) { if (onError) onError(e); }
  }

  root.Platform = {
    openTvSettings: openTvSettings,
    setServiceOption: setServiceOption,
    launchWithPayload: launchWithPayload,
    isTV: isTV,
    getJSON: getJSON,
    store: store,
    kv: kv,
    ownAppId: ownAppId,
    listApps: listApps,
    mergeApps: mergeApps,
    launch: launch,
    startService: function () { if (isTV) tellService(null); },
    exit: exit,
    setTvScreenSaver: setTvScreenSaver,
    listInputs: listInputs,
    setInput: setInput,
    watchTv: watchTv,
    network: network,
    deviceInfo: deviceInfo,
    stats: stats,
    version: version
  };
})(this);
