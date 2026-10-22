/*
 * Hàng xổ ra (Top Shelf): khi một ô trên dock được chọn một lúc, hàng nội dung của app đó trượt lên phía trên
 * dock — giống Smart Hub / Apple TV. Samsung không cho đọc "Đang xem tiếp" của app khác, nên nội dung lấy từ
 * nguồn công khai:
 *   YouTube: video mới của các kênh trong CONFIG.youtubeChannels (RSS công khai, không cần API key).
 *            OK mở thẳng video trong app YouTube.
 *
 *   Shelf.content(item, cb)    cb(null) khi ô đó không có hàng nội dung
 *   Shelf.open(card, onError)  mở nội dung của một thẻ
 */
(function (root) {
  'use strict';

  var C = root.CONFIG;
  var TTL = 60 * 60000;
  var TITLE = 'Mới trên các kênh Việt';

  function cacheGet(key) {
    var c = Platform.store.get('shelf.' + key, null);
    return c && Date.now() - c.at < TTL ? c.cards : null;
  }

  function cacheSet(key, cards) { Platform.store.set('shelf.' + key, { at: Date.now(), cards: cards }); }

  function getText(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', Platform.isTV ? url : '/proxy?u=' + encodeURIComponent(url));
    xhr.timeout = 15000;
    xhr.onload = function () { cb(xhr.status >= 200 && xhr.status < 300 ? xhr.responseText : null); };
    xhr.onerror = xhr.ontimeout = function () { cb(null); };
    xhr.send();
  }

  // Lexend has no emoji and the TV draws them as boxes: drop pictographs from video titles.
  function tidy(title) {
    return title.replace(/[\uD800-\uDFFF]|[\u2190-\u21FF\u2300-\u27BF\u2B00-\u2BFF\uFE0F\u200D]/g, '').replace(/\s+/g, ' ').trim();
  }

  function ago(iso) {
    var ms = Date.parse(iso);
    return ms ? News.ago(ms) : '';
  }

  // ---- YouTube ---------------------------------------------------------------------------------

  /** Newest uploads of the configured channels, newest first, at most two per channel. */
  function channels(cb) {
    var list = C.youtubeChannels || [], all = [], pending = list.length;
    if (!pending) return cb([]);
    list.forEach(function (ch) {
      getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch.id, function (xml) {
        if (xml) {
          try {
            var doc = new DOMParser().parseFromString(xml, 'text/xml');
            var entries = doc.getElementsByTagName('entry');
            for (var i = 0; i < Math.min(2, entries.length); i++) {
              var e = entries[i];
              var vid = (e.getElementsByTagName('yt:videoId')[0] || e.getElementsByTagName('videoId')[0] || {}).textContent;
              var title = (e.getElementsByTagName('title')[0] || {}).textContent;
              var pub = (e.getElementsByTagName('published')[0] || {}).textContent;
              if (vid && title && !/#shorts/i.test(title)) {
                all.push({ kind: 'youtube', id: vid, title: tidy(title), by: ch.name, when: ago(pub), t: Date.parse(pub) || 0,
                  image: 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg' });
              }
            }
          } catch (err) { /* a malformed feed: skip that channel */ }
        }
        if (--pending) return;
        all.sort(function (a, b) { return b.t - a.t; });
        cb(all.slice(0, 12));
      });
    });
  }

  function youtube(cb) {
    var cached = cacheGet('yt2.channels');
    if (cached) return cb({ title: TITLE, cards: cached });
    channels(function (cards) {
      if (cards.length) cacheSet('yt2.channels', cards);
      cb(cards.length ? { title: TITLE, cards: cards } : null);
    });
  }

  // ---- API -------------------------------------------------------------------------------------

  function isYouTube(item) {
    return item.kind === 'app' && /youtube/i.test(item.app.title) && !/kids/i.test(item.app.title);
  }

  function content(item, cb) {
    if (isYouTube(item)) return youtube(cb);
    cb(null);
  }

  /** Open a card: a YouTube video plays straight away in the YouTube app (or the app opens, if it refuses). */
  function open(card, app, onError, watchIds) {
    if (card.kind === 'youtube') {
      Platform.launchWithPayload(app.id, '#watch?v=' + card.id + '&launch=launcher', onError, watchIds);
    }
  }

  root.Shelf = { content: content, open: open, isYouTube: isYouTube };
})(this);
