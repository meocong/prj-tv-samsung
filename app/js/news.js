/*
 * Tin mới: tiêu đề, ảnh và tóm tắt từ RSS của VnExpress, Thanh Niên, Dân Trí (không cần key; trên TV
 * <access origin="*"> cho phép đọc RSS dù các báo không bật CORS). Cache 20 phút.
 *
 *   News.load(function (items) { ... })   // items: [{title, summary, image, source, time (ms), link}]
 */
(function (root) {
  'use strict';

  var FEEDS = [
    ['VnExpress', 'https://vnexpress.net/rss/tin-moi-nhat.rss'],
    ['Thanh Niên', 'https://thanhnien.vn/rss/home.rss'],
    ['Dân Trí', 'https://dantri.com.vn/rss/home.rss']
  ];
  var CACHE = 'news.last', TTL = 20 * 60000;

  function getText(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', Platform.isTV ? url : '/proxy?u=' + encodeURIComponent(url));
    xhr.timeout = 15000;
    xhr.onload = function () { cb(xhr.status >= 200 && xhr.status < 300 ? xhr.responseText : null); };
    xhr.onerror = xhr.ontimeout = function () { cb(null); };
    xhr.send();
  }

  function textOf(node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el ? (el.textContent || '').trim() : '';
  }

  /** RSS item description is HTML: the first <img> is the picture, the rest is the summary. */
  function parse(xml, source) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    var out = [];
    Array.prototype.forEach.call(doc.getElementsByTagName('item'), function (it) {
      var desc = textOf(it, 'description');
      var img = /<img[^>]+src=["']([^"']+)["']/i.exec(desc);   // Dân Trí quotes with '
      var enclosure = it.getElementsByTagName('enclosure')[0];
      var summary = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      var title = textOf(it, 'title');
      if (!title) return;
      out.push({
        title: title,
        summary: summary,
        image: img ? img[1] : (enclosure ? enclosure.getAttribute('url') : ''),
        source: source,
        time: Date.parse(textOf(it, 'pubDate')) || 0,
        link: textOf(it, 'link')
      });
    });
    return out;
  }

  /**
   * cb(items) with the stored stories at once; when they are older than TTL, cb runs a second time with the new
   * ones. Callers simply render twice.
   */
  function load(cb) {
    var cached = Platform.store.get(CACHE, null);
    var have = cached && cached.items && cached.items.length;
    if (have) cb(cached.items);
    if (have && Date.now() - cached.at < TTL) return;
    var all = [], pending = FEEDS.length;   // 13 stories each, so every paper makes the 40
    FEEDS.forEach(function (f) {
      getText(f[1], function (xml) {
        if (xml) { try { all = all.concat(parse(xml, f[0]).slice(0, 13)); } catch (e) { /* malformed feed */ } }
        if (--pending) return;
        all.sort(function (a, b) { return b.time - a.time; });
        if (all.length) Platform.store.set(CACHE, { at: Date.now(), items: all.slice(0, 40) });
        if (all.length) cb(all.slice(0, 40));
        else if (!have) cb([]);   // offline and nothing stored
      });
    });
  }

  /** "5 phút trước", "2 giờ trước", "hôm qua". */
  function ago(ms) {
    var m = Math.max(1, Math.round((Date.now() - ms) / 60000));
    if (m < 60) return m + ' phút trước';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' giờ trước';
    return Math.round(h / 24) === 1 ? 'hôm qua' : Math.round(h / 24) + ' ngày trước';
  }

  root.News = { load: load, parse: parse, ago: ago };
})(this);
