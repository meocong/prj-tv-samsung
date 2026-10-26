// Ví dụ cấu hình riêng. Chép thư mục này thành local/ (đã có trong .gitignore) rồi sửa:
//   cp -R local.example local
// tools/tvdev.py deploy và tools/preview.py ghép local/ đè lên app/: file này thay app/config.local.js, local/img/avatar.jpg
// thay ảnh avatar góc phải, local/img/family/*.jpg là ảnh gia đình (tạo bằng tools/photos.py).
Object.assign(window.CONFIG, {
  familyName: 'Nhà An ❤ Bình & Mít',   // ❤ hiện thành trái tim
  location: { name: 'Cầu Giấy, Hà Nội', latitude: 21.03, longitude: 105.79, timezone: 'Asia/Bangkok' },
  locations: [
    { name: 'Cầu Giấy, Hà Nội', latitude: 21.03, longitude: 105.79, timezone: 'Asia/Bangkok' },
    { name: 'TP. Hồ Chí Minh', latitude: 10.78, longitude: 106.70, timezone: 'Asia/Bangkok' }
  ],
  familyPhotos: ['img/family/01.jpg', 'img/family/02.jpg'],
  birthdays: [{ name: 'Bà', day: 10, month: 11, lunar: true }]
});
