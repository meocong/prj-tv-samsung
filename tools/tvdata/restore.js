// Chạy trong app trên TV (qua tools/inspect.js), với DATA là JSON do backup.js tạo: ghi lại từng mục rồi tải lại app.
(async function (d) {
  function writeStore(name, store, entries, blobs) {
    return new Promise(function (resolve) {
      var q = indexedDB.open(name, 1);
      q.onupgradeneeded = function () { if (!q.result.objectStoreNames.contains(store)) q.result.createObjectStore(store); };
      q.onerror = function () { resolve(0); };
      q.onsuccess = function () {
        var tx = q.result.transaction(store, 'readwrite'), os = tx.objectStore(store);
        entries.forEach(function (e) { os.put(e[1], e[0]); });
        tx.oncomplete = function () { resolve(entries.length); };
        tx.onerror = function () { resolve(0); };
      };
    });
  }
  Object.keys(d.localStorage || {}).forEach(function (k) { localStorage.setItem(k, d.localStorage[k]); });
  var photos = [];
  for (var i = 0; i < (d.photos || []).length; i++) {
    photos.push([d.photos[i][0], await (await fetch(d.photos[i][1])).blob()]);
  }
  var n = { localStorage: Object.keys(d.localStorage || {}).length, kv: await writeStore('nhaminh-kv', 'kv', d.kv || []),
    photos: await writeStore('nhaminh-photos', 'photos', photos) };
  setTimeout(function () { location.reload(); }, 500);
  return n;
})(DATA)
