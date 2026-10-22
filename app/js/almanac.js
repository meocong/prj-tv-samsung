/*
 * Lịch vạn niên — các mục "xem ngày" theo sách Việt (Ngọc Hạp Thông Thư), tính từ can chi và ngày âm:
 * Trực, Nhị thập bát tú, ngũ hành nạp âm, quan hệ can–chi của ngày, tuổi xung, hướng xuất hành
 * (Hỷ thần, Tài thần, Hạc thần), giờ xuất hành Lý Thuần Phong, Bành Tổ bách kỵ, ngày Tam nương /
 * Nguyệt kỵ / Dương công kỵ, việc nên làm và nên tránh.
 *
 * Kiểm tra với lichvannien.net cho 22/10/2026, 05/11/2026 và 06/02/2027 (tests/almanac.test.js).
 * Không đưa vào những mục mà các trang lịch tính khác nhau (danh sách tuổi xung theo can, Khổng Minh).
 *
 *   Almanac.day(d, m, y) -> {...}
 */
(function (root, factory) {
  var lunar = typeof module === 'object' && module.exports ? require('./lunar.js') : root.Lunar;
  var mod = factory(lunar);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.Almanac = mod;
})(this, function (Lunar) {
  'use strict';

  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var TERMS = ['Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng', 'Hạ chí', 'Tiểu thử',
    'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ', 'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết',
    'Đại tuyết', 'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'];

  // 12 Trực: [tên, tốt?, lời bàn]
  var TRUC = [
    ['Kiến', true, 'Tốt cho xuất hành, cưới hỏi, trồng cây, nhậm chức. Tránh động thổ, đào giếng, lợp nhà.'],
    ['Trừ', false, 'Tốt cho cúng tế, chữa bệnh, dọn dẹp, trừ bỏ cái cũ. Tránh cưới hỏi, đi xa, khai trương.'],
    ['Mãn', true, 'Nên cầu tài, cầu phúc, tế tự, mở cửa hàng. Tránh kiện tụng, nhậm chức.'],
    ['Bình', true, 'Tốt cho việc nhỏ, sửa nhà, làm đường, đào mương. Tránh việc lớn, kiện tụng.'],
    ['Định', true, 'Tốt cho động thổ, cưới hỏi, mua bán, nhập học, làm chuồng trại. Tránh kiện tụng, đi xa.'],
    ['Chấp', false, 'Tốt cho xây dựng, trồng trọt, tuyển người. Tránh xuất hành, dọn nhà, mở kho.'],
    ['Phá', false, 'Chỉ nên phá dỡ nhà cũ, chữa bệnh. Tránh cưới hỏi, khai trương, ký kết, việc lớn.'],
    ['Nguy', false, 'Xấu mọi việc. Nên nghỉ ngơi, cúng tế. Tránh đi thuyền, leo cao, việc mạo hiểm.'],
    ['Thành', true, 'Tốt cho khai trương, cưới hỏi, về nhà mới, khởi công, nhập học. Tránh kiện tụng.'],
    ['Thu', false, 'Thu hoạch tốt, mua hàng, nhập kho. Kỵ khởi công, xuất hành, an táng.'],
    ['Khai', true, 'Tốt cho khai trương, động thổ, cưới hỏi, nhập học, làm nhà. Tránh an táng.'],
    ['Bế', false, 'Tốt cho đắp đê, lấp hố, xây tường, chữa mắt. Tránh khai trương, đi xa, nhậm chức.']
  ];

  // Nhị thập bát tú: [tên, hành, con vật, tốt?]
  var TU = [
    ['Giác', 'Mộc', 'Giao long', true], ['Cang', 'Kim', 'Rồng', false], ['Đê', 'Thổ', 'Lạc đà', false],
    ['Phòng', 'Nhật', 'Thỏ', true], ['Tâm', 'Nguyệt', 'Cáo', false], ['Vĩ', 'Hỏa', 'Hổ', true],
    ['Cơ', 'Thủy', 'Báo', true], ['Đẩu', 'Mộc', 'Cua', true], ['Ngưu', 'Kim', 'Trâu', false],
    ['Nữ', 'Thổ', 'Dơi', false], ['Hư', 'Nhật', 'Chuột', false], ['Nguy', 'Nguyệt', 'Én', false],
    ['Thất', 'Hỏa', 'Lợn', true], ['Bích', 'Thủy', 'Rái cá', true], ['Khuê', 'Mộc', 'Sói', false],
    ['Lâu', 'Kim', 'Chó', true], ['Vị', 'Thổ', 'Trĩ', true], ['Mão', 'Nhật', 'Gà', false],
    ['Tất', 'Nguyệt', 'Quạ', true], ['Chủy', 'Hỏa', 'Khỉ', false], ['Sâm', 'Thủy', 'Vượn', true],
    ['Tỉnh', 'Mộc', 'Dê trừu', true], ['Quỷ', 'Kim', 'Dê', false], ['Liễu', 'Thổ', 'Hoẵng', false],
    ['Tinh', 'Nhật', 'Ngựa', false], ['Trương', 'Nguyệt', 'Hươu', true], ['Dực', 'Hỏa', 'Rắn', false],
    ['Chẩn', 'Thủy', 'Giun', true]
  ];
  var TU_ANCHOR = Lunar.jdFromDate(22, 10, 2026), TU_ANCHOR_INDEX = 7;   // 22/10/2026 là sao Đẩu

  var NAP_AM = ['Hải Trung Kim', 'Lư Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa',
    'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ',
    'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc',
    'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Thoa Xuyến Kim',
    'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];

  var CAN_HANH = ['Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ', 'Kim', 'Kim', 'Thủy', 'Thủy'];
  var CHI_HANH = ['Thủy', 'Thổ', 'Mộc', 'Mộc', 'Thổ', 'Hỏa', 'Hỏa', 'Thổ', 'Kim', 'Kim', 'Thổ', 'Thủy'];
  var SINH = { 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim', 'Kim': 'Thủy', 'Thủy': 'Mộc' };
  var KHAC = { 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim', 'Kim': 'Mộc' };

  var HY_THAN = ['Đông Bắc', 'Tây Bắc', 'Tây Nam', 'Nam', 'Đông Nam', 'Đông Bắc', 'Tây Bắc', 'Tây Nam', 'Nam', 'Đông Nam'];
  var TAI_THAN = ['Đông Nam', 'Đông Nam', 'Đông', 'Đông', 'Bắc', 'Nam', 'Tây Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  // Hạc thần theo vòng 60 ngày, bắt đầu từ Kỷ Dậu: [độ dài, hướng]; 16 ngày cuối "lên trời" (không có hướng).
  var HAC_THAN = [[6, 'Đông Bắc'], [5, 'Đông'], [6, 'Đông Nam'], [5, 'Nam'], [6, 'Tây Nam'], [5, 'Tây'], [6, 'Tây Bắc'],
    [5, 'Bắc'], [16, '']];

  var LY_THUAN_PHONG = [['Đại An', true], ['Tốc Hỷ', true], ['Lưu Niên', false], ['Xích Khẩu', false],
    ['Tiểu Cát', true], ['Tuyệt Lộ', false]];
  var HOUR_RANGES = ['23–1', '1–3', '3–5', '5–7', '7–9', '9–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];

  var BANH_TO_CAN = [
    'Giáp bất khai thương: không mở kho, tiền của hao mất', 'Ất bất tài thực: không trồng cây, cây chẳng lên',
    'Bính bất tu táo: không sửa bếp, dễ gặp hỏa hoạn', 'Đinh bất thế đầu: không cắt tóc, dễ sinh mụn nhọt',
    'Mậu bất thụ điền: không nhận ruộng đất, chủ không lành', 'Kỷ bất phá khoán: không phá giao kèo, hai bên đều thiệt',
    'Canh bất kinh lạc: không quay tơ dệt vải, khung cửi hỏng', 'Tân bất hợp tương: không trộn tương, chủ nhà không được nếm',
    'Nhâm bất ương thủy: không tháo nước, khó giữ đê điều', 'Quý bất từ tụng: không kiện tụng, lý mình yếu'];
  var BANH_TO_CHI = [
    'Tý bất vấn bốc: không gieo quẻ, tự rước họa', 'Sửu bất quán đái: không nhậm chức, khó về quê',
    'Dần bất tế tự: không cúng tế, quỷ thần chẳng hưởng', 'Mão bất xuyên tỉnh: không đào giếng, nước không trong',
    'Thìn bất khốc khấp: không khóc lóc, chủ có tang', 'Tỵ bất viễn hành: không đi xa, tiền của mất',
    'Ngọ bất thiêm cái: không lợp nhà, chủ phải dọn đi', 'Mùi bất phục dược: không uống thuốc, độc vào người',
    'Thân bất an sàng: không kê giường, ma quỷ vào phòng', 'Dậu bất hội khách: không tiếp khách, khách gặp hại',
    'Tuất bất ngật khuyển: không ăn thịt chó, đêm ngủ chẳng yên', 'Hợi bất giá thú: không cưới gả, bất lợi'];

  var TAM_NUONG = [3, 7, 13, 18, 22, 27], NGUYET_KY = [5, 14, 23];
  // Dương công kỵ nhật: [tháng âm, ngày âm]
  var DUONG_CONG = [[1, 13], [2, 11], [3, 9], [4, 7], [5, 5], [6, 3], [7, 8], [7, 29], [8, 27], [9, 25], [10, 23], [11, 21],
    [12, 19]];

  function mod(a, n) { return ((a % n) + n) % n; }

  /** 0 = Giáp Tý … 59 = Quý Hợi. */
  function sexagenary(jd) { return mod(jd + 49, 60); }

  /** Earthly branch of the solar-term month: Dần from Lập xuân, Mão from Kinh trập, … */
  function termMonthChi(jd) {
    var term = TERMS.indexOf(Lunar.solarTerm(jd));
    return mod(2 + Math.floor(mod(term - 21, 24) / 2), 12);
  }

  /** How the day's stem and branch relate in the five elements, and what that says about the day. */
  function canChiRelation(c, z) {
    var a = CAN_HANH[c], b = CHI_HANH[z];
    if (a === b) return { text: 'Can Chi đồng hành (' + a + ')', name: 'chuyên nhật', good: true };
    if (SINH[a] === b) return { text: 'Can sinh Chi (' + a + ', ' + b + ')', name: 'bảo nhật', good: true };
    if (SINH[b] === a) return { text: 'Chi sinh Can (' + b + ', ' + a + ')', name: 'nghĩa nhật', good: true };
    if (KHAC[a] === b) return { text: 'Can khắc Chi (' + a + ', ' + b + ')', name: 'chế nhật', good: true };
    return { text: 'Chi khắc Can (' + b + ', ' + a + ')', name: 'phạt nhật', good: false };
  }

  function hacThan(n) {
    var i = mod(n - 45, 60);   // 45 = Kỷ Dậu
    for (var k = 0; k < HAC_THAN.length; k++) {
      if (i < HAC_THAN[k][0]) return HAC_THAN[k][1];
      i -= HAC_THAN[k][0];
    }
    return '';
  }

  /** The six two-hour pairs (Tý & Ngọ share one) of Lý Thuần Phong for a lunar day. */
  function lyThuanPhong(l) {
    var out = [];
    for (var h = 0; h < 6; h++) {
      var s = LY_THUAN_PHONG[mod(l.month + l.day + h - 2, 6)];
      out.push({ hours: HOUR_RANGES[h] + ', ' + HOUR_RANGES[h + 6], name: s[0], good: s[1] });
    }
    return out;
  }

  function day(d, m, y) {
    var jd = Lunar.jdFromDate(d, m, y);
    var l = Lunar.fromSolar(d, m, y);
    var n = sexagenary(jd), c = n % 10, z = n % 12;
    var mz = termMonthChi(jd);
    var truc = TRUC[mod(z - mz, 12)];
    var tu = TU[mod(TU_ANCHOR_INDEX + jd - TU_ANCHOR, 28)];
    var warnings = [];
    if (TAM_NUONG.indexOf(l.day) !== -1) warnings.push('Ngày Tam nương: kỵ khai trương, xuất hành, cưới hỏi, sửa hay cất nhà');
    if (NGUYET_KY.indexOf(l.day) !== -1) warnings.push('Ngày Nguyệt kỵ: "mùng năm, mười bốn, hăm ba — đi chơi cũng lỗ nữa là đi buôn"');
    DUONG_CONG.forEach(function (x) {
      if (x[0] === l.month && x[1] === l.day) warnings.push('Ngày Dương công kỵ: trăm việc nên tránh');
    });
    return {
      jd: jd,
      truc: { name: truc[0], good: truc[1], advice: truc[2] },
      tu: { name: tu[0], element: tu[1], animal: tu[2], good: tu[3] },
      napAm: NAP_AM[Math.floor(n / 2)],
      relation: canChiRelation(c, z),
      xung: { day: CHI[(z + 6) % 12], month: CHI[(mz + 6) % 12] },
      huong: { hyThan: HY_THAN[c], taiThan: TAI_THAN[c], hacThan: hacThan(n) },
      lyThuanPhong: lyThuanPhong(l),
      banhTo: [BANH_TO_CAN[c], BANH_TO_CHI[z]],
      warnings: warnings,
      monthChi: CHI[mz]
    };
  }

  return { day: day, sexagenary: sexagenary, termMonthChi: termMonthChi };
});
