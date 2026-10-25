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
   * The apps in the TV's Apps panel: [{id, title, icon, uses}]. getAppsInfo also lists ~100 hidden system
   * and companion components (recommendation tiles, previews…), so the list comes from tools/sync_apps.py
   * (window.TV_APPS, read from the Smart Hub). On the TV it is checked against what is still installed;
   * run tools/sync_apps.py again after installing or removing apps.
   */
  function listApps(cb) {
    var synced = (root.TV_APPS || []).map(function (a) { return Object.assign({}, a); });
    if (!isTV) return cb(synced);
    try {
      tizen.application.getAppsInfo(function (list) {
        var installed = {};
        list.forEach(function (a) { installed[a.id] = true; });
        var out = synced.filter(function (a) { return installed[a.id]; });
        cb(out.length ? out : synced);
      }, function () { cb(synced); });
    } catch (e) { cb(synced); }
  }

  function iconUrl(path) {
    if (!path) return '';
    if (/^(file|https?):/.test(path)) return path;
    return 'file://' + path.split('/').map(encodeURIComponent).join('/');
  }

  var WATCH_SERVICE = 'NhaMinh000.WatchService';

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
