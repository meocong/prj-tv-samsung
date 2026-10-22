/*
 * Ngày này năm xưa: sự kiện, sinh và mất vào ngày này, khắp thế giới.
 *
 * Nguồn chính là trang "22 tháng 10" của Wikipedia tiếng Việt (mục Sự kiện, Sinh, Mất); Wikipedia tiếng Việt
 * không có API "on this day" nên đọc wikitext và gỡ đánh dấu wiki. Khi trang có ít mục, thêm sự kiện chọn lọc
 * của Wikipedia tiếng Anh (feed onthisday/selected) và dịch sang tiếng Việt (translate.googleapis.com, không
 * chính thức: lỗi thì giữ nguyên tiếng Anh). Cache theo ngày trong localStorage.
 *
 *   History.load(date, function (items) { ... })   // items: [{year, text, kind: 'event'|'birth'|'death'}]
 */
(function (root) {
  'use strict';

  var CACHE = 'history2.';
  var MIN_ITEMS = 10;

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

  function parse(text) {
    var out = [];
    [['Sự kiện', 'event'], ['Sinh', 'birth'], ['Mất', 'death']].forEach(function (s) {
      section(text, s[0]).split('\n').forEach(function (line) {
        var m = /^\*+\s*\[\[(\d{1,4})\]\]\s*[–—-]\s*(.+)$/.exec(line.trim());
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

  function load(date, cb) {
    var key = CACHE + (date.getMonth() + 1) + '-' + date.getDate();
    var cached = Platform.store.get(key, null);
    if (cached && cached.items && cached.items.length && Date.now() - cached.at < 7 * 86400000) return cb(cached.items);
    var page = date.getDate() + '_tháng_' + (date.getMonth() + 1);
    var url = 'https://vi.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=' +
      encodeURIComponent(page);
    Platform.getJSON(url, function (err, data) {
      var items = !err && data && data.parse ? parse(data.parse.wikitext || '') : [];
      function done(all) {
        all.sort(function (a, b) { return b.year - a.year; });
        if (all.length) Platform.store.set(key, { at: Date.now(), items: all });
        cb(all.length ? all : (cached ? cached.items : []));
      }
      if (items.filter(function (i) { return i.kind === 'event'; }).length >= MIN_ITEMS) return done(items);
      fromEnglish(date, function (en) {
        // Skip English events whose year the Vietnamese page already covers.
        var years = {};
        items.forEach(function (i) { if (i.kind === 'event') years[i.year] = true; });
        done(items.concat(en.filter(function (e) { return !years[e.year]; })));
      });
    }, 15000);
  }

  root.History = { load: load, parse: parse, clean: clean, GRIM: GRIM };
})(this);
