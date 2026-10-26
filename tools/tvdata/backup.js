// Chạy trong app trên TV (qua tools/inspect.js): gom dữ liệu đã lưu của màn hình chính thành một JSON.
// localStorage (nhaminh.*: cài đặt, cấu hình đặt bằng điện thoại…), IndexedDB nhaminh-kv (ngày này năm xưa, các từ đã
// học) và nhaminh-photos (ảnh gửi từ điện thoại). Kho ảnh nền nhaminh-img không cần: nó tự tải lại.
(async function () {
  function readStore(name, store) {
    return new Promise(function (resolve) {
      var q = indexedDB.open(name);
      q.onerror = function () { resolve([]); };
      q.onsuccess = function () {
        var db = q.result, out = [];
        if (!db.objectStoreNames.contains(store)) return resolve(out);
        var c = db.transaction(store).objectStore(store).openCursor();
        c.onsuccess = function () {
          var cur = c.result;
          if (!cur) return resolve(out);
          out.push([cur.key, cur.value]);
          cur.continue();
        };
        c.onerror = function () { resolve(out); };
      };
    });
  }
  function dataUrl(blob) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.readAsDataURL(blob);
    });
  }
  var ls = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.indexOf('nhaminh.') === 0) ls[k] = localStorage.getItem(k);
  }
  var photos = await readStore('nhaminh-photos', 'photos');
  for (var j = 0; j < photos.length; j++) photos[j][1] = await dataUrl(photos[j][1]);
  return { app: 'NhaMinh', v: 1, at: new Date().toISOString(), version: Platform.version(), localStorage: ls,
    kv: await readStore('nhaminh-kv', 'kv'), photos: photos };
})()
