/*
 * Ngày này năm xưa: sự kiện, sinh và mất vào ngày này, khắp thế giới.
 *
 * Nguồn chính là trang "22 tháng 10" của Wikipedia tiếng Việt (mục Sự kiện, Sinh, Mất); Wikipedia tiếng Việt
 * không có API "on this day" nên đọc wikitext và gỡ đánh dấu wiki. Khi trang có ít mục, thêm sự kiện chọn lọc
 * của Wikipedia tiếng Anh (feed onthisday/selected) và dịch sang tiếng Việt (translate.googleapis.com, không
 * chính thức: lỗi thì giữ nguyên tiếng Anh). Mỗi ngày tải về được lưu mãi trên TV (IndexedDB, tối đa 366 trang
 * ngày ≈ 1,5 MB): mỗi ngày chỉ tải một lần trong đời, sau đó mở là hiện ngay, không cần mạng.
 * Giao diện tiếng Anh: trang "October 22" của Wikipedia tiếng Anh, cùng cách đọc, lưu riêng (history.en.<ngày>).
 *
 *   History.load(date, function (items) { ... })   // items: [{year, text, kind: 'event'|'birth'|'death'}]
 */
(function (root) {
  'use strict';

  var OLD = 'nhaminh.history2.';   // the localStorage copies of earlier versions, moved over once
  var MIN_ITEMS = 10;
  // What happened on 22/10 does not change: fetched once, kept for good. A day keeps this many of each kind,
  // spread over the centuries (the English pages list hundreds of births).
  var KEEP = { event: 25, birth: 10, death: 5 };
  var EN = root.I18n && I18n.en;
  var KEY = EN ? 'history.en.' : 'history.';
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December'];

  /** At most KEEP[kind] items of each kind, evenly spread over the years, newest first. */
  function trim(items) {
    var out = [];
    Object.keys(KEEP).forEach(function (kind) {
      var list = items.filter(function (i) { return i.kind === kind; }).sort(function (a, b) { return b.year - a.year; });
      var n = Math.min(list.length, KEEP[kind]);
      for (var k = 0; k < n; k++) out.push(list[Math.floor(k * list.length / n)]);
    });
    return out.sort(function (a, b) { return b.year - a.year; });
  }

  function save(day, items) { Platform.kv.set(KEY + day, { at: Date.now(), items: trim(items) }); }

  /** Earlier versions kept a few days in localStorage: move them into the store and free the space. */
  var moved = false;
  function moveOld() {
    if (moved) return;
    moved = true;
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k.indexOf(OLD) !== 0) continue;
        var v = JSON.parse(localStorage.getItem(k));
        if (v && v.items && v.items.length) Platform.kv.set('history.' + k.slice(OLD.length), v);
        localStorage.removeItem(k);
      }
    } catch (e) { /* no storage */ }
  }

  /** Wiki markup → plain text: [[a|b]] → b, [[a]] → a, no refs, templates, bold or italics. */
  function clean(s) {
    return s
      .replace(/<ref[^>]*\/>/g, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/\[https?:[^\s\]]+\s([^\]]+)\]/g, '$1')
      .replace(/'{2,}/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // A family screen: leave out massacres, bombings, crashes and the like.
  var GRIM = /\b(kill|dead|death|bomb|attack|massacre|crash|shoot|shot\b|murder|terror|genocide|execut|explo|hostage|assassin|lockdown)|giết|thảm sát|khủng bố|đánh bom|tử vong|thiệt mạng|xả súng|tai nạn|nổ súng|hành quyết|ám sát|con tin/i;

  function short(t) { return t.length > 160 ? t.slice(0, 157).replace(/\s+\S*$/, '') + '…' : t; }

  function section(text, name) {
    var re = new RegExp('==\\s*' + name + '\\s*==([\\s\\S]*?)(\\n==[^=]|$)');
    var m = re.exec(text);
    return m ? m[1] : '';
  }

  /** A day page's wikitext → items; lang 'en' reads the English page's Events / Births / Deaths. */
  function parse(text, lang) {
    var out = [];
    var names = lang === 'en' ? [['Events', 'event'], ['Births', 'birth'], ['Deaths', 'death']] :
      [['Sự kiện', 'event'], ['Sinh', 'birth'], ['Mất', 'death']];
    names.forEach(function (s) {
      section(text, s[0]).split('\n').forEach(function (line) {
        var m = /^\*+\s*\[\[(\d{1,4})\]\]\s*(?:[–—-]|&ndash;|&mdash;)\s*(.+)$/.exec(line.trim());
        if (!m) return;
        var t = clean(m[2]);
        if (t.length >= 12 && !GRIM.test(t)) out.push({ year: Number(m[1]), text: short(t), kind: s[1] });
      });
    });
    return out;
  }

  /** Translate many short texts in one call; cb(translations) with the originals on failure. */
  function translate(texts, cb) {
    if (!texts.length) return cb([]);
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' +
      encodeURIComponent(texts.join('\n'));
    Platform.getJSON(url, function (err, data) {
      if (err || !data || !data[0]) return cb(texts);
      var joined = data[0].map(function (seg) { return seg[0] || ''; }).join('');
      var lines = joined.split('\n');
      cb(lines.length === texts.length ? lines.map(function (l) { return l.trim(); }) : texts);
    }, 15000);
  }

  function fromEnglish(date, cb) {
    var mm = ('0' + (date.getMonth() + 1)).slice(-2), dd = ('0' + date.getDate()).slice(-2);
    Platform.getJSON('https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/' + mm + '/' + dd, function (err, data) {
      var ev = (!err && data && data.selected) || [];
      ev = ev.filter(function (e) { return !GRIM.test(e.text); }).slice(0, 12);
      translate(ev.map(function (e) { return e.text; }), function (vi) {
        cb(ev.map(function (e, i) { return { year: e.year, text: short(vi[i] || e.text), kind: 'event' }; })
          .filter(function (e) { return !GRIM.test(e.text); }));
      });
    }, 15000);
  }

  /** cb(items) from the store when the day is there, else fetched (and stored for good). */
  function load(date, cb) {
    var day = (date.getMonth() + 1) + '-' + date.getDate();
    var old = (function () { try { return JSON.parse(localStorage.getItem(OLD + day)); } catch (e) { return null; } })();
    moveOld();
    if (!EN && old && old.items && old.items.length) return cb(old.items);   // just moved: same answer, no wait
    Platform.kv.get(KEY + day, function (cached) {
      if (cached && cached.items && cached.items.length) return cb(cached.items);
      fetchDay(date, function (items) {
        if (items.length) save(day, items);
        cb(items);
      });
    });
  }

  function fetchDay(date, cb) {
    var page = EN ? MONTHS_EN[date.getMonth()] + '_' + date.getDate() : date.getDate() + '_tháng_' + (date.getMonth() + 1);
    var url = 'https://' + (EN ? 'en' : 'vi') + '.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=' +
      encodeURIComponent(page);
    Platform.getJSON(url, function (err, data) {
      var items = !err && data && data.parse ? parse(data.parse.wikitext || '', EN ? 'en' : 'vi') : [];
      function done(all) { cb(trim(all)); }
      if (EN) return done(items);
      if (items.filter(function (i) { return i.kind === 'event'; }).length >= MIN_ITEMS) return done(items);
      fromEnglish(date, function (en) {
        // Skip English events whose year the Vietnamese page already covers.
        var years = {};
        items.forEach(function (i) { if (i.kind === 'event') years[i.year] = true; });
        done(items.concat(en.filter(function (e) { return !years[e.year]; })));
      });
    }, 15000);
  }

  /** Fetch a day ahead of time (calendar cursor, tomorrow), quietly. */
  function prefetch(date) { load(date, function () {}); }

  root.History = { load: load, prefetch: prefetch, parse: parse, clean: clean, translate: translate, GRIM: GRIM };
})(this);
