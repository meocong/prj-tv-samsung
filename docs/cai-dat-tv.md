# Tối ưu TV Samsung UA50TU8500 (Tizen 5.5)

Samsung không cho root, nên không ai gỡ được dịch vụ hệ thống như cách cleanyourtv làm trên Android TV.
Thứ làm TV chậm và nhiều quảng cáo là các dịch vụ chạy ngầm. Chúng tắt được trong Cài đặt, rồi chặn nốt
phần còn lại bằng DNS. Tên menu ghi theo tiếng Việt trên TV, kèm tên tiếng Anh trong ngoặc.

Mở Cài đặt: nút **Home** → **Cài đặt** (bánh răng), hoặc giữ nút **123** / **Menu** trên remote. Từ màn
hình chính: **Cài đặt → Cài đặt TV**.

## Danh sách chốt

| | Việc | Ở đâu |
|---|---|---|
| ✅ | Tắt theo dõi, quảng cáo, nhận dạng giọng nói | mục 1 |
| ✅ | DNS `94.140.14.14` | mục 3 |
| ☐ | Tự động chạy ứng dụng cuối cùng: Bật (chỉ có tác dụng khi TV ngủ, xem mục 2) | mục 2 |
| ☐ | Quy tắc SmartThings "TV bật → mở màn hình chính" (cách chắc chắn nhất) | mục 2 |
| ✅ | Ghim ô màn hình chính lên đầu thanh Home | mục 2 |
| ☐ | Tự động chạy Smart Hub: **Tắt** (để Smart Hub không đè lên khi bật TV) | mục 2 |
| ☐ | **Tự động tắt nguồn: 4 giờ** (màn hình chờ chạy mãi nếu quên tắt TV) | mục 6 |
| ☐ | Thông báo truy cập: **Chỉ lần đầu** (máy Mac cập nhật app không bị TV hỏi lại) | mục 4 |
| ☐ | Router: **giữ cố định IP** cho TV và máy Mac (DHCP reservation) | mục 7 |
| ☐ | Giữ **Developer Mode bật**, Host PC IP = IP máy Mac | mục 7 |
| ☐ | Không bắt buộc: Bật TV bằng điện thoại, ghép tay cầm Bluetooth, AirPlay | mục 4, 7 |

## 1. Tắt theo dõi và quảng cáo (nhẹ máy nhất)

**Hỗ trợ → Điều khoản & Chính sách** (Support → Terms & Policy):
- **Dịch vụ thông tin xem** (Viewing Information Services): **Tắt**. Đây là ACR: TV liên tục "nhìn" nội dung
  đang chiếu để gửi về Samsung, tốn CPU nhất.
- **Quảng cáo dựa trên sở thích** (Interest-Based Advertisement): **Tắt**.
- **Dịch vụ nhận dạng giọng nói** (Voice Recognition Services): **Tắt** nếu không nói chuyện với TV.

**Tổng quát → Trình quản lý hệ thống → Chế độ sử dụng** (Usage Mode): **Chế độ nhà** (Home Mode).
Nếu hỏi PIN thì nhập 0000.

## 2. Bật TV là vào thẳng màn hình chính

**Tổng quát → Tính năng thông minh** (General → Smart Features):
- **Tự động chạy Smart Hub** (Autorun Smart Hub): **Tắt**.
- **Tự động chạy ứng dụng cuối cùng** (Autorun Last App): **Bật**. Lưu ý: Samsung chỉ cho một danh sách app chọn
  sẵn (YouTube, Netflix…) tự mở lại; app tự cài như màn hình chính này **không** nằm trong danh sách. Nó chỉ giúp khi
  TV ngủ (Instant On): dịch vụ nền đưa màn hình chính lên trước lúc TV tắt, bật lên là thấy nó.
- **Tự động chạy Samsung TV Plus** (Autorun Samsung TV Plus): **Tắt**.

**Bật TV từ trạng thái tắt hẳn mà vẫn vào màn hình chính**: cần một thứ bên ngoài TV ra lệnh mở app khi TV bật. Cách
gọn nhất là **SmartThings** (chạy trên mây, không cần máy nào bật suốt): thêm TV vào app SmartThings, rồi tạo quy tắc
"khi TV bật → gửi lệnh `custom.launchapp` / `launchApp` với `NhaMinh000.NhaMinh`". Tạo bằng SmartThings CLI hoặc Rules
API với một Personal Access Token ([account.smartthings.com/tokens](https://account.smartthings.com/tokens)). Cách khác:
một máy luôn bật (Raspberry Pi, Home Assistant) thấy TV bật thì gọi `POST http://<IP TV>:8001/api/v2/applications/NhaMinh000.NhaMinh`.

Trên thanh Home của Samsung: chọn ô của app (mặc định **Nhà Mình**) → bấm xuống → **Di chuyển**, đưa về đầu tiên.

## 3. Chặn quảng cáo, theo dõi bằng DNS

**Tổng quát → Mạng → Trạng thái mạng → Cài đặt IP** (Network → Network Status → IP Settings):
- **Cài đặt DNS**: **Nhập thủ công**, **Máy chủ DNS** = `94.140.14.14` (AdGuard DNS) → **OK**.

Sau khi đặt, mở thử YouTube, Netflix, FPT Play. Nếu có app không chạy, đổi Cài đặt DNS về **Nhận tự động**.

## 4. Kết nối, tay cầm, AirPlay

**Tổng quát → Trình quản lý thiết bị ngoài** (External Device Manager):
- **Trình quản lý kết nối thiết bị → Thông báo truy cập**: **Chỉ lần đầu** (máy tính và điện thoại điều khiển
  TV không bị hỏi lại).
- **Cài đặt Chế độ trò chơi → Chế độ trò chơi tự động**: **Bật** (chơi game bớt trễ).
- **Trình quản lý thiết bị nhập → Danh sách thiết bị Bluetooth**: ghép tay cầm.

**Tổng quát → Cài đặt Apple AirPlay**: **AirPlay: Bật**. iPhone phải ở cùng mạng với TV (nhà có router phụ thì chuyển nó sang
chế độ AP để cả nhà chung một mạng).

## 5. Hình ảnh (theo RTINGS cho dòng TU8000/TU8500)

**Hình ảnh → Chế độ hình ảnh**: **Phim** (Movie). **Cài đặt chuyên gia** (Expert Settings):
- Độ tương phản nâng cao (Contrast Enhancer): **Thấp**
- Độ rõ nét hình ảnh (Picture Clarity): **Tắt** (tránh hình bóng mờ khi chuyển động)
- Tông màu (Color Tone): **Ấm 2** · Gamma: **2.2** · Độ sắc nét: **0**
- Độ sáng: tùy phòng (ban ngày 45–50)

**Tổng quát → Giải pháp tiết kiệm** (Eco Solution): tắt **Chế độ tiết kiệm năng lượng** để không bị tối hình.

## 6. Giữ TV nhanh, tự tắt khi quên

- Mỗi tuần **giữ nút nguồn khoảng 5 giây** để TV khởi động lại hẳn. Tắt bình thường chỉ là ngủ, các app như
  Netflix, YouTube vẫn nằm trong RAM. Netflix khi thoát chỉ ẩn đi chứ không tắt, nên càng nên khởi động lại.
- **Hỗ trợ → Cập nhật phần mềm → Tự động cập nhật**: giữ **Bật**.
- **Tổng quát → Giải pháp tiết kiệm → Tự động tắt nguồn** (Auto Power Off): **4 giờ**. Màn hình chờ của Nhà
  Mình giữ TV sáng (ảnh, đồng hồ), nên nếu quên tắt TV thì nó chạy cả đêm. Ban đêm màn hình chờ tự tối hơn.
- **Hẹn giờ tắt** (Sleep Timer): **Tổng quát → Trình quản lý hệ thống → Thời gian → Hẹn giờ tắt**, hoặc từ
  màn hình chính: Cài đặt → **Cài đặt TV**. App web không tự hẹn giờ tắt TV được (Samsung không mở API này).

## 7. Để máy Mac còn cập nhật được app

App được cài qua Developer Mode. Muốn sửa, thêm tính năng hay đổi ảnh gia đình về sau thì cần:
- **Developer Mode bật**, **Host PC IP** = IP máy Mac. Kiểm tra: Ứng dụng → bấm `1 2 3 4 5`.
- **IP cố định**: trên router chính, đặt DHCP reservation cho TV và máy Mac. Nếu IP TV đổi, chạy `TV_HOST=<IP mới> tools/deploy.sh` và Host PC IP trên TV.
- Không bắt buộc: **Tổng quát → Mạng → Cài đặt chuyên gia → Bật bằng điện thoại** (Power On with Mobile) để
  `tools/tv.py power` bật TV từ xa.

## Hạn chế đã biết

- **Nút Home** trên remote vẫn mở thanh Home của Samsung (không app nào thay được). Thoát app thì dịch vụ nền
  đưa về màn hình chính: VieON, VTV GO khoảng 1–2 giây, Netflix khoảng 3 giây (Netflix ẩn chứ không tắt).
  Dịch vụ canh cả app mở từ Smart Hub hay do TV tự mở lại sau khi bật (dò vài giây một lần), và lúc TV sắp tắt
  thì đưa màn hình chính lên trước để lần bật sau vào thẳng đây.
- Samsung không cho app tự cài chạy khi TV khởi động (on-boot chỉ dành cho chứng chỉ đối tác, prelaunch bị bỏ từ đời
  2019, Autorun Last App chỉ dành cho app được Samsung cho phép). Nút Home cũng không chiếm được, và chưa có cách root
  công khai cho Tizen 5.5. Vì vậy sau khi TV tắt hẳn, màn hình chính chỉ tự lên nhờ quy tắc SmartThings ở mục 2; nếu
  TV tự mở lại app khác, mở ô màn hình chính một lần là dịch vụ nền chạy lại.
- Trạng thái dịch vụ nền (để gỡ lỗi): mở `http://<IP TV>:8701/` trên máy cùng mạng.
- **YouTube:** nút Back lùi trong YouTube trước rồi hỏi "Thoát YouTube?"; nút **Exit** về thẳng màn hình chính.
- Hiếm khi TV hết RAM (nhiều app nặng còn chạy ngầm) và tự tắt màn hình chính; khi đó thoát app sẽ ra thanh
  Home của Samsung. Mở lại ô màn hình chính, hoặc khởi động lại TV (mục 6).
- Gợi ý, "xem tiếp" của YouTube/Netflix nằm trong từng app, Samsung không cho app khác đọc. Hàng YouTube trên
  dock vì vậy lấy video mới của các kênh Việt chọn sẵn (`youtubeChannels` trong `app/config.js`).

## Gỡ bỏ toàn bộ

1. Thanh Home → Ứng dụng → ⚙ → ô màn hình chính (mặc định **Nhà Mình**) → **Xóa** (làm tương tự với TizenBrew).
2. Ứng dụng → bấm `1 2 3 4 5` → **Developer mode: Off** → khởi động lại TV.
3. DNS về **Nhận tự động**.
