/*
 * Ảnh nền hằng ngày: Bing (ảnh trong ngày + 15 ngày trước) và Wikimedia (ảnh nổi bật mỗi ngày).
 * Danh sách ảnh được cache trong localStorage để màn hình chờ vẫn có ảnh khi mất mạng.
 *
 * Nguồn mới (ảnh gia đình từ USB, ảnh đóng gói sẵn) chỉ cần thêm vào SOURCES: function (cb) -> cb([photo]).
 * photo: {url, title, credit, date: 'YYYY-MM-DD', source}
 */
(function (root) {
  'use strict';

  var POOL_KEY = 'photos.pool';
  var REFRESH_MS = 6 * 3600 * 1000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

  // ---- sources -----------------------------------------------------------------------------

  function bing(cb) {
    var out = [], pending = 2;
    [0, 8].forEach(function (idx) {
      Platform.getJSON('https://www.bing.com/HPImageArchive.aspx?format=js&n=8&mkt=vi-VN&idx=' + idx, function (err, data) {
        if (!err && data && data.images) {
          data.images.forEach(function (im) {
            var m = /^(.*?)\s*\((©[^)]*)\)\s*$/.exec(im.copyright || '');
            var sd = String(im.startdate || '');
            out.push({
              url: 'https://www.bing.com' + im.urlbase + '_1920x1080.jpg',
              title: m ? m[1] : (im.title || ''),
              credit: m ? m[2] : '',
              date: sd.slice(0, 4) + '-' + sd.slice(4, 6) + '-' + sd.slice(6, 8),
              source: 'Bing'
            });
          });
        }
        if (--pending === 0) cb(out);
      });
    });
  }

  function wikimedia(cb) {
    var out = [], days = 10, pending = days, now = new Date();
    for (var i = 0; i < days; i++) {
      (function (d) {
        var path = d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
        Platform.getJSON('https://en.wikipedia.org/api/rest_v1/feed/featured/' + path, function (err, data) {
          var im = !err && data && data.image;
          var full = im && im.image, thumb = im && im.thumbnail;
          // Landscape only: portrait photos look wrong stretched across a TV.
          if (full && thumb && full.width / full.height >= 1.3) {
            var url = full.width > 1920 ? thumb.source.replace(/\/\d+px-/, '/1920px-') : full.source;
            out.push({
              url: url,
              title: stripHtml(im.description && im.description.text).slice(0, 140),
              credit: '© ' + (stripHtml(im.artist && im.artist.text) || 'Wikimedia Commons'),
              date: isoDate(d),
              source: 'Wikimedia'
            });
          }
          if (--pending === 0) cb(out);
        }, 12000);
      })(new Date(now.getTime() - i * 86400000));
    }
  }

  var SOURCES = { bing: bing, wikimedia: wikimedia };

  // ---- pool --------------------------------------------------------------------------------

  function wanted(choice) { return choice === 'mix' ? ['bing', 'wikimedia'] : [choice]; }

  /** Calls cb(pool) with today's photos first, the rest shuffled. Fetches at most every REFRESH_MS. */
  function loadPool(choice, force, cb) {
    var cached = Platform.store.get(POOL_KEY, null);
    var fresh = cached && cached.choice === choice && Date.now() - cached.at < REFRESH_MS &&
      cached.day === isoDate(new Date());
    if (fresh && !force && cached.photos.length) return cb(order(cached.photos));

    var names = wanted(choice), results = [], pending = names.length;
    names.forEach(function (name) {
      SOURCES[name](function (photos) {
        results = results.concat(photos);
        if (--pending > 0) return;
        if (results.length) {
          Platform.store.set(POOL_KEY, { choice: choice, at: Date.now(), day: isoDate(new Date()), photos: results });
          cb(order(results));
        } else {
          cb(cached && cached.photos ? order(cached.photos) : []);   // offline: last known photos
        }
      });
    });
  }

  function order(photos) {
    var seen = {}, unique = photos.filter(function (p) {
      if (seen[p.url]) return false;
      seen[p.url] = true;
      return true;
    });
    unique.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var head = unique.slice(0, 1), rest = unique.slice(1);
    for (var i = rest.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = rest[i]; rest[i] = rest[j]; rest[j] = t;
    }
    return head.concat(rest);
  }

  // ---- palette -----------------------------------------------------------------------------

  function rgbToHsv(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  }

  function hsvToRgb(hsv) {
    var h = hsv[0], s = hsv[1], v = hsv[2];
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map(function (k) { return Math.round((k + m) * 255); });
  }

  /** {accent: [r,g,b], luma: 0..1} from a loaded image. */
  function palette(img) {
    var result = { accent: [255, 214, 150], luma: 0.4 };
    try {
      var c = document.createElement('canvas');
      c.width = 32; c.height = 18;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, 32, 18);
      var px = g.getImageData(0, 0, 32, 18).data;
      var best = null, bestScore = -1, lum = 0, n = 0;
      for (var i = 0; i < px.length; i += 4) {
        var p = [px[i], px[i + 1], px[i + 2]];
        lum += (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
        n++;
        var hsv = rgbToHsv(p);
        var score = hsv[1] * Math.min(1, hsv[2] * 1.5);
        if (score > bestScore) { bestScore = score; best = hsv; }
      }
      result.luma = lum / n;
      if (best) {
        // Lift it so it glows on a dark scrim, without going neon.
        best[1] = Math.min(0.75, Math.max(0.35, best[1]));
        best[2] = Math.max(0.85, best[2]);
        result.accent = hsvToRgb(best);
      }
    } catch (e) { /* tainted canvas (no CORS): keep defaults */ }
    return result;
  }

  // ---- slideshow ---------------------------------------------------------------------------

  var KB_VARIANTS = ['kb1', 'kb2', 'kb3', 'kb4'];

  function create(opts) {
    var layers = opts.layers, front = 0;
    var pool = [], index = -1, timer = null, loading = false, currentPhoto = null, stopped = false;

    function schedule() {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(next, Math.max(10, opts.interval()) * 1000);
    }

    function show(photo, img) {
      var back = 1 - front;
      var el = layers[back];
      el.style.backgroundImage = 'url("' + photo.url.replace(/"/g, '%22') + '")';
      KB_VARIANTS.forEach(function (k) { el.classList.remove(k); });
      void el.offsetWidth;   // restart the Ken Burns animation
      if (opts.motion()) {
        el.style.animationDuration = (opts.interval() + 4) + 's';
        el.classList.add(KB_VARIANTS[Math.floor(Math.random() * KB_VARIANTS.length)]);
      }
      el.classList.add('shown');
      layers[front].classList.remove('shown');
      front = back;
      currentPhoto = photo;
      document.body.classList.remove('aurora');
      if (opts.onPhoto) opts.onPhoto(photo, palette(img));
    }

    function next() {
      stopped = false;
      if (loading) return;
      if (!pool.length) { document.body.classList.add('aurora'); schedule(); return; }
      loading = true;
      var tries = 0;
      (function attempt() {
        index = (index + 1) % pool.length;
        var photo = pool[index];
        var img = new Image();
        if (/^https?:/.test(photo.url)) img.crossOrigin = 'anonymous';
        img.onload = function () { loading = false; show(photo, img); schedule(); };
        img.onerror = function () {
          if (++tries < Math.min(pool.length, 5)) return attempt();
          loading = false;
          if (!currentPhoto) document.body.classList.add('aurora');
          schedule();
        };
        img.src = photo.url;
      })();
    }

    /** Every fourth photo is one of opts.extra (the family's own photos). */
    function withExtra(photos) {
      var extra = opts.extra || [];
      if (!extra.length) return photos;
      var out = [], e = 0;
      photos.forEach(function (p, i) {
        if (i % 3 === 1) out.push(extra[e++ % extra.length]);
        out.push(p);
      });
      return out.length ? out : extra.slice();
    }

    function reload(force) {
      loadPool(opts.source(), force, function (photos) {
        pool = withExtra(photos);
        index = -1;
        next();
      });
    }

    // Refresh the list a few times a day so a new daily photo shows up without a restart.
    setInterval(function () { loadPool(opts.source(), false, function (photos) { if (photos.length) pool = withExtra(photos); }); },
      REFRESH_MS / 2);

    return {
      start: function () { reload(false); },
      reload: function () { reload(true); },
      next: next,
      reschedule: schedule,
      stop: function () { stopped = true; clearTimeout(timer); },
      current: function () { return currentPhoto; }
    };
  }

  /** Today's photo (Bing, from the cached pool when fresh): cb(photo | null). */
  function today(cb) {
    loadPool('bing', false, function (pool) {
      var sorted = pool.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      cb(sorted[0] || null);
    });
  }

  /** The cached pool (refreshed when stale): today's photo first, then the others shuffled. */
  function pool(choice, cb) { loadPool(choice, false, cb); }

  root.Backdrop = { create: create, palette: palette, isoDate: isoDate, today: today, pool: pool };
})(this);
