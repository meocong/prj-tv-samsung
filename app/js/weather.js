/*
 * Thời tiết và chất lượng không khí từ Open-Meteo (miễn phí, không cần key). Cache để mất mạng vẫn
 * hiện số liệu gần nhất cùng giờ cập nhật.
 */
(function (root) {
  'use strict';

  var CACHE_KEY = 'weather.last';
  var BY_PLACE = 'weather.places';   // {"lat,lon": data} for every place picked in Cài đặt
  var REFRESH_MS = 20 * 60 * 1000;

  // WMO weather codes → [mô tả, biểu tượng]
  var CODES = {
    0: ['Trời quang', 'clear'], 1: ['Ít mây', 'partly'], 2: ['Có mây', 'partly'], 3: ['Nhiều mây', 'cloud'],
    45: ['Sương mù', 'fog'], 48: ['Sương mù', 'fog'],
    51: ['Mưa phùn nhẹ', 'drizzle'], 53: ['Mưa phùn', 'drizzle'], 55: ['Mưa phùn dày', 'drizzle'],
    56: ['Mưa phùn lạnh', 'drizzle'], 57: ['Mưa phùn lạnh', 'drizzle'],
    61: ['Mưa nhỏ', 'rain'], 63: ['Mưa vừa', 'rain'], 65: ['Mưa to', 'rain'],
    66: ['Mưa lạnh', 'rain'], 67: ['Mưa lạnh', 'rain'],
    71: ['Tuyết rơi nhẹ', 'snow'], 73: ['Tuyết rơi', 'snow'], 75: ['Tuyết dày', 'snow'], 77: ['Tuyết hạt', 'snow'],
    80: ['Mưa rào nhẹ', 'shower'], 81: ['Mưa rào', 'shower'], 82: ['Mưa rào rất to', 'shower'],
    85: ['Mưa tuyết', 'snow'], 86: ['Mưa tuyết', 'snow'],
    95: ['Dông', 'storm'], 96: ['Dông, mưa đá', 'storm'], 99: ['Dông, mưa đá', 'storm']
  };

  // US AQI bands with the names Vietnam's own AQI scale uses.
  var AQI = [
    [50, 'Tốt', '#3ddc84', 'Không khí trong lành'],
    [100, 'Trung bình', '#f5d63d', 'Người nhạy cảm nên hạn chế ra ngoài lâu'],
    [150, 'Kém', '#ff9a3c', 'Trẻ nhỏ, người già nên hạn chế ra ngoài'],
    [200, 'Xấu', '#ff5a5a', 'Đóng cửa sổ, bật máy lọc không khí'],
    [300, 'Rất xấu', '#b36bff', 'Ở trong nhà, đeo khẩu trang khi ra ngoài'],
    [100000, 'Nguy hại', '#c2185b', 'Tránh ra ngoài']
  ];

  // Line icons on a 64×64 grid, stroked with currentColor.
  var SUN = '<circle cx="32" cy="32" r="11"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4.2 4.2M44.8 44.8L49 49M15 49l4.2-4.2M44.8 19.2L49 15"/>';
  var MOON = '<path d="M41 12a20 20 0 1 0 11 30A16 16 0 0 1 41 12z"/>';
  var CLOUD = '<path d="M20 46h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/>';
  var ICONS = {
    clear: { day: SUN, night: MOON },
    partly: {
      day: '<circle cx="24" cy="24" r="8"/><path d="M24 8v4M10 24h4M13.4 13.4l2.8 2.8M34.6 13.4l-2.8 2.8"/><path d="M24 50h22a9 9 0 0 0 1-18 12 12 0 0 0-23 4 7 7 0 0 0 0 14z"/>',
      night: '<path d="M30 10a13 13 0 1 0 8 22 11 11 0 0 1-8-22z"/><path d="M24 52h22a9 9 0 0 0 1-18 12 12 0 0 0-23 4 7 7 0 0 0 0 14z"/>'
    },
    cloud: CLOUD,
    fog: '<path d="M12 26h40M8 34h48M14 42h36M20 50h24"/>',
    drizzle: '<path d="M20 40h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/><path d="M24 47v3M32 50v3M40 47v3"/>',
    rain: '<path d="M20 40h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/><path d="M24 46l-3 8M33 46l-3 8M42 46l-3 8"/>',
    shower: '<path d="M20 40h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/><path d="M22 46l-4 10M31 46l-4 10M40 46l-4 10M48 44l-2 5"/>',
    storm: '<path d="M20 38h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/><path d="M33 40l-6 10h8l-5 10"/>',
    snow: '<path d="M20 40h25a10 10 0 0 0 1-20 14 14 0 0 0-27 4 8 8 0 0 0 1 16z"/><path d="M24 48v6M21 51h6M38 48v6M35 51h6"/>'
  };

  function icon(kind, isDay) {
    var i = ICONS[kind] || ICONS.cloud;
    var body = typeof i === 'string' ? i : (isDay ? i.day : i.night);
    return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + body + '</svg>';
  }

  function describe(code) { return CODES[code] || ['—', 'cloud']; }

  function aqiBand(aqi) {
    for (var i = 0; i < AQI.length; i++) {
      if (aqi <= AQI[i][0]) return { label: AQI[i][1], color: AQI[i][2], advice: AQI[i][3], level: i };
    }
    return null;
  }

  function fetchAll(loc, cb, locKey) {
    var base = '?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&timezone=' + encodeURIComponent(loc.timezone);
    var forecastUrl = 'https://api.open-meteo.com/v1/forecast' + base +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
      '&minutely_15=precipitation&forecast_minutely_15=8&forecast_days=5';
    var airUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality' + base + '&current=us_aqi,pm2_5';
    var result = {}, pending = 2;
    function done() {
      if (--pending) return;
      if (!result.forecast) {
        var last = Platform.store.get(CACHE_KEY, null);
        return cb(last && last.loc === locKey ? last : null);
      }
      var data = shape(result.forecast, result.air);
      data.loc = locKey;
      data.at = Date.now();
      Platform.store.set(CACHE_KEY, data);
      var places = Platform.store.get(BY_PLACE, {}) || {};
      places[locKey] = data;
      Platform.store.set(BY_PLACE, places);
      cb(data);
    }
    Platform.getJSON(forecastUrl, function (err, d) { if (!err) result.forecast = d; done(); });
    Platform.getJSON(airUrl, function (err, d) { if (!err) result.air = d; done(); });
  }

  function shape(f, air) {
    var c = f.current || {}, d = f.daily || {};
    var days = (d.time || []).map(function (t, i) {
      return {
        date: t, code: d.weather_code[i], max: Math.round(d.temperature_2m_max[i]),
        min: Math.round(d.temperature_2m_min[i]),
        rain: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null
      };
    });
    // Minutes until the first quarter hour with real rain in the next two hours (null: dry).
    var rainIn = null, m = f.minutely_15;
    if (m && m.time && m.precipitation) {
      var now = Date.now();
      for (var i = 0; i < m.time.length; i++) {
        var at = new Date(m.time[i] + ':00+07:00').getTime();
        if (m.precipitation[i] >= 0.2 && at + 15 * 60000 > now) { rainIn = Math.max(0, Math.round((at - now) / 60000)); break; }
      }
    }
    var a = air && air.current;
    return {
      rainIn: rainIn,
      at: Date.now(),
      temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m || 0),
      code: c.weather_code, isDay: c.is_day === 1,
      days: days,
      sunrise: d.sunrise ? d.sunrise[0] : null, sunset: d.sunset ? d.sunset[0] : null,
      aqi: a && a.us_aqi != null ? Math.round(a.us_aqi) : null,
      pm25: a && a.pm2_5 != null ? Math.round(a.pm2_5) : null
    };
  }

  /** getLoc() returns the current location; refresh() re-reads it (after a change in Cài đặt). */
  function start(getLoc, cb) {
    function key(loc) { return loc.latitude + ',' + loc.longitude; }
    var cached = Platform.store.get(CACHE_KEY, null);
    if (cached && cached.loc === key(getLoc())) cb(cached);
    function tick() {
      var loc = getLoc();
      var stored = (Platform.store.get(BY_PLACE, {}) || {})[key(loc)];
      if (stored) cb(stored);   // the forecast we had for this place, until the new one arrives
      if (stored && Date.now() - (stored.at || 0) < REFRESH_MS) return;   // still fresh: no request
      fetchAll(loc, function (data) {
        if (data && (data.loc === key(loc) || !data.loc)) cb(data);
      }, key(loc));
    }
    tick();
    setInterval(tick, 5 * 60000);   // checks often, fetches only once the forecast is REFRESH_MS old
    return { refresh: tick };
  }

  root.Weather = { start: start, icon: icon, describe: describe, aqiBand: aqiBand };
})(this);
