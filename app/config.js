// Cấu hình mặc định. Phần lớn tùy chọn chỉnh được ngay trên TV (nút Cài đặt, hoặc phím xanh dương).
// Tên nhà, vị trí, ảnh gia đình của riêng bạn: đặt trong local/config.local.js (không lên Git, xem README).
// Sửa xong chạy tools/tvdev.py deploy.
window.CONFIG = {
  familyName: 'Nhà Mình ❤ Gia Đình',   // ❤ hiện thành trái tim vẽ bằng SVG; giao diện tiếng Anh hiện tên mặc định này là "Our Home ❤ Family"

  // Thời tiết và chất lượng không khí (Open-Meteo, không cần API key). Đổi được trong Cài đặt → Thời tiết.
  location: { name: 'Hà Nội (Hoàn Kiếm)', latitude: 21.03, longitude: 105.85, timezone: 'Asia/Bangkok' },
  locations: [
    { name: 'Hà Nội (Hoàn Kiếm)', latitude: 21.03, longitude: 105.85, timezone: 'Asia/Bangkok' },
    { name: 'TP. Hồ Chí Minh', latitude: 10.78, longitude: 106.70, timezone: 'Asia/Bangkok' },
    { name: 'Đà Nẵng', latitude: 16.05, longitude: 108.21, timezone: 'Asia/Bangkok' }
  ],

  // Dock (hàng trên cùng): mỗi mục khớp app đầu tiên có tên (không dấu) chứa chuỗi `match`, hoặc đúng `id`.
  // `title` đổi tên hiển thị, `skipIf` bỏ qua mục khi có app khác. App chưa cài thì bỏ qua.
  // YouTube gốc (có YouTube Premium thì không quảng cáo); TizenBrew (TizenTube) nằm cuối danh sách.
  dock: [
    { match: ['vtvgo'], id: 'OxWOiJOOyr.vtv' },      // VTVgo Truyền hình số Quốc gia (bản mới); đứng đầu nên không
    { match: ['youtube'], id: '9Ur5IzDKqV.TizenYouTube' },   // có hàng video che Hôm nay và thời tiết lúc mở TV
    { match: ['netflix'] },
    { match: ['vieon'] }
  ],

  // Không bao giờ hiện thành ô (khớp đầu tên, không dấu). Ẩn/hiện từng app cũng làm được trong Cài đặt → Ứng dụng.
  hidden: ['e-manual', 'puppy rescue', 'jumpoon', 'tarmac race', 'pink panther'],
  hiddenIds: ['3202106023989'],   // VTVGo 2021, bản cũ trùng với VTVgo mới

  // Ảnh gia đình: xen vào màn hình chờ và hình nền "Ảnh đẹp + ảnh gia đình". Đây là ảnh mẫu; ảnh của bạn thêm bằng
  // tools/photos.py (ghi vào local/, không lên Git).
  familyPhotos: ['img/sample/1.jpg', 'img/sample/2.jpg', 'img/sample/3.jpg'],

  // Tên riêng cho cổng vào trong bảng Nguồn, ví dụ { 'HDMI 1': 'Đầu thu', 'HDMI 2': 'PS5' }.
  inputNames: {},

  // Hàng YouTube xổ ra trên dock: video mới của các kênh dưới đây (RSS công khai, không cần key).
  // Thêm kênh: mở kênh trên youtube.com → Giới thiệu → Chia sẻ kênh → Sao chép mã kênh (UC…).
  youtubeChannels: [
    { name: 'VTV24', id: 'UCabsTV34JwALXKGMqHpvUiA' },
    { name: 'VTV Giải Trí', id: 'UCuJ5k3GndbHnXLYyiIR6Z8Q' },
    { name: 'VTV Thể Thao', id: 'UCrI4iNMPZ2vT_G-TqRO6yrw' },
    { name: 'Báo Thanh Niên', id: 'UCIW9cGgoRuGJnky3K3tbzNg' },
    { name: 'Sơn Tùng M-TP', id: 'UCW9X2KZEYfnNwoL8-EEdV4Q' },
    { name: 'Đen Vâu', id: 'UCWu91J5KWEj1bQhCBuGeJxw' },
    { name: 'POPS Kids', id: 'UC5ezaYrzZpyItPSRG27MLpg' },
    { name: 'Khoa Pug', id: 'UCAGikSCgqbeIXCvoXixWovQ' },
    { name: 'Khoai Lang Thang', id: 'UCeKzImp-LS8SKmK_d0GN7jg' }
  ],

  // Repo GitHub để báo khi có bản mới (Cài đặt → Thông tin). Bản fork thì đổi thành repo của bạn.
  repo: 'meocong/prj-tv-samsung',

  // Sinh nhật người nhà: { name: 'Bà', day: 10, month: 11, lunar: false } — lunar: true nếu tính theo âm lịch.
  birthdays: [],

  defaults: {
    language: 'auto',          // 'auto' (theo ngôn ngữ menu của TV) | 'vi' | 'en'
    screensaverAfter: 3,       // phút không bấm gì thì bật màn hình chờ; 0 = tắt
    photoSource: 'bing',       // 'bing' | 'mix' (Bing + Wikimedia)
    photoInterval: 30,         // giây giữa hai ảnh
    nightDim: true,            // màn hình chờ tối hơn từ 23:00 đến 6:00
    columns: 4,                // số ô mỗi hàng: 4 | 5 | 6
    showToday: true,           // khối "Hôm nay": ngày này năm xưa, câu nói hay, tin mới
    showMarkets: true,         // giá vàng (PNJ) và tỷ giá USD (Vietcombank) trong khối "Hôm nay"
    showWords: true,           // Học tiếng Anh: ô riêng, một từ mỗi ngày trong "Hôm nay" và trên màn hình chờ
    wordLevel: 'basic',        // 'basic' | 'middle' | 'advanced'
    showStats: false,          // CPU và bộ nhớ trống dưới đồng hồ
    returnHome: true,          // thoát app mở từ đây (YouTube, Netflix…) thì quay về màn hình này
    closeHidden: 5,            // phút: app chạy ẩn lâu hơn thì dịch vụ nền đóng để giải phóng RAM; 0 = không
    wallpaper: 'photo',        // 'photo' (ảnh Bing) | 'black'
    wallpaperEvery: 60, wallpaperPin: '',        // phút giữa hai hình nền; 0 = mỗi ngày một ảnh
    clock24: true,
    showLunar: true,
    showWeather: true,
    location: 0,               // chỉ số trong `locations`
    hiddenApps: []             // id app ẩn trong Cài đặt → Ứng dụng
  }
};
