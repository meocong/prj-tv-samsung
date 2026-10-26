# Cài đặt TV cho màn hình chính chạy tốt

Các mục cài đặt trên TV Samsung để: bật TV là vào màn hình chính, bớt quảng cáo và theo dõi, TV nhẹ hơn, hình đẹp hơn.
Tên menu ghi theo tiếng Việt trên TV, tiếng Anh trong ngoặc. Đường dẫn menu theo TV đời 2020 (Tizen 5.5); đời khác có
thể khác chút ít.

Mở Cài đặt của TV: nút **Home** → **Cài đặt** (bánh răng), hoặc từ màn hình chính: **Cài đặt → Cài đặt TV**.

## Danh sách nên làm

| Việc | Mục |
|---|---|
| Tắt theo dõi, quảng cáo theo sở thích, nhận dạng giọng nói | 1 |
| Tự động chạy Smart Hub: **Tắt**; Tự động chạy ứng dụng cuối cùng: **Bật** | 2 |
| Đưa ô màn hình chính lên đầu thanh Home | 2 |
| DNS chặn quảng cáo `94.140.14.14` | 3 |
| Thông báo truy cập: **Chỉ lần đầu** | 4 |
| Tự động tắt nguồn: **4 giờ** | 6 |
| Giữ cố định IP của TV trên router (DHCP reservation) | 7 |

## 1. Tắt theo dõi và quảng cáo

**Hỗ trợ → Điều khoản & Chính sách** (Support → Terms & Policy):
- **Dịch vụ thông tin xem** (Viewing Information Services): **Tắt**. Đây là ACR: TV liên tục nhận dạng nội dung đang
  chiếu để gửi về Samsung, tốn CPU nhất.
- **Quảng cáo dựa trên sở thích** (Interest-Based Advertisement): **Tắt**.
- **Dịch vụ nhận dạng giọng nói** (Voice Recognition Services): **Tắt** nếu không dùng giọng nói.

**Tổng quát → Trình quản lý hệ thống → Chế độ sử dụng** (Usage Mode): **Chế độ nhà** (Home Mode). Nếu hỏi PIN thì nhập
0000.

## 2. Bật TV là vào màn hình chính

**Tổng quát → Tính năng thông minh** (General → Smart Features):
- **Tự động chạy Smart Hub** (Autorun Smart Hub): **Tắt**.
- **Tự động chạy ứng dụng cuối cùng** (Autorun Last App): **Bật**.
- **Tự động chạy Samsung TV Plus** (Autorun Samsung TV Plus): **Tắt**.

Trên thanh Home của Samsung: chọn ô của app (mặc định **Nhà Mình**) → bấm xuống → **Di chuyển**, đưa về đầu tiên.

Màn hình chính tự lên như sau:

- **Bấm nút nguồn tắt rồi bật lại** (TV chỉ ngủ): dịch vụ nền của app vẫn chạy. Lúc TV sắp tắt, nó đặt màn hình chính ở
  trước; lúc TV bật, nó giữ màn hình chính ở trước trong 20 giây đầu (Smart Hub hay app cuối cùng có thể lên muộn). Bạn
  mở app nào từ màn hình chính thì dịch vụ để yên ngay.
- **TV khởi động lại hẳn** (rút điện, mất điện, TV tự tắt hẳn sau nhiều giờ): TV tự chạy dịch vụ nền lúc khởi động, và
  dịch vụ đưa màn hình chính lên (canh gần 1 phút). Việc này cần app được ký cấp **Partner**: cài bằng Apps2Samsung thì
  có sẵn (nó tự ký cấp này), cài bằng `tvdev.py` thì chạy `tvdev.py partner` một lần (xem
  [hướng dẫn cài đặt](huong-dan-cai-dat.md#cho-người-muốn-sửa-code)). Đã thử trên TV đời 2020.
- **Bản tự ký bằng chứng chỉ thường** (không Partner): TV không chạy dịch vụ lúc khởi động hẳn, nên TV mở Smart Hub hay
  app cuối cùng; mở ô màn hình chính một lần là dịch vụ chạy lại. Nếu nhà có một thiết bị luôn bật cùng mạng (điện thoại
  Android cũ, Raspberry Pi, NAS, máy tính bàn), chạy [`tools/autostart.py`](../tools/autostart.py) trên đó: nó hỏi TV vài
  giây một lần và mở màn hình chính ngay khi TV bật. Chỉ cần Python 3:

  ```bash
  python3 autostart.py --tv <IP TV>            # chạy mãi
  python3 autostart.py --tv <IP TV> --once     # thử: mở màn hình chính ngay
  ```

  - *Android (Termux)*: cài Termux và Termux:Boot từ F-Droid, `pkg install python`, chép `autostart.py` vào máy, tạo
    file `~/.termux/boot/nha-minh` gồm hai dòng `termux-wake-lock` và `python ~/autostart.py --tv <IP TV> &`, rồi tắt
    tối ưu pin cho Termux.
  - *Raspberry Pi / Linux*: một dịch vụ systemd chạy `python3 /home/pi/autostart.py --tv <IP TV>` với `Restart=always`.
  - *Máy tính*: chạy khi đăng nhập (Task Scheduler trên Windows, launchd trên macOS); chỉ có tác dụng lúc máy không ngủ.

Xem dịch vụ nền đã làm gì (lần TV bật gần nhất, từng lần kiểm tra): `http://<IP TV>:8701/status` trên máy cùng mạng.

## 3. Chặn quảng cáo, theo dõi bằng DNS

**Tổng quát → Mạng → Trạng thái mạng → Cài đặt IP** (Network → Network Status → IP Settings):
- **Cài đặt DNS**: **Nhập thủ công**, **Máy chủ DNS** = `94.140.14.14` (AdGuard DNS) → **OK**.

Sau khi đặt, mở thử các app hay dùng. Nếu có app không chạy, đổi Cài đặt DNS về **Nhận tự động**.

## 4. Kết nối, tay cầm, AirPlay

**Tổng quát → Trình quản lý thiết bị ngoài** (External Device Manager):
- **Trình quản lý kết nối thiết bị → Thông báo truy cập**: **Chỉ lần đầu**, để máy tính hay điện thoại đã được cho phép
  không bị hỏi lại.
- **Cài đặt Chế độ trò chơi → Chế độ trò chơi tự động**: **Bật** (chơi game bớt trễ).
- **Trình quản lý thiết bị nhập → Danh sách thiết bị Bluetooth**: ghép tay cầm chơi game.

**Tổng quát → Cài đặt Apple AirPlay**: **AirPlay: Bật**. iPhone phải ở cùng mạng với TV (nhà có router phụ thì để nó ở
chế độ AP cho cả nhà chung một mạng).

## 5. Hình ảnh (gợi ý cho dòng TU8000/TU8500, theo RTINGS)

**Hình ảnh → Chế độ hình ảnh**: **Phim** (Movie). **Cài đặt chuyên gia** (Expert Settings):
- Độ tương phản nâng cao (Contrast Enhancer): **Thấp**
- Độ rõ nét hình ảnh (Picture Clarity): **Tắt** (tránh hình bóng mờ khi chuyển động)
- Tông màu (Color Tone): **Ấm 2** · Gamma: **2.2** · Độ sắc nét: **0**
- Độ sáng: tùy phòng

**Tổng quát → Giải pháp tiết kiệm** (Eco Solution): tắt **Chế độ tiết kiệm năng lượng** để hình không bị tối.

## 6. Giữ TV nhanh, tự tắt khi quên

- Màn hình chính đóng các app chạy ẩn quá 5 phút để giải phóng RAM (Cài đặt → Màn hình chính → *Đóng app chạy ngầm*).
  Thỉnh thoảng **giữ nút nguồn khoảng 5 giây** để TV khởi động lại hẳn cũng giúp TV nhẹ hơn.
- **Hỗ trợ → Cập nhật phần mềm → Tự động cập nhật**: **Bật**.
- **Tổng quát → Giải pháp tiết kiệm → Tự động tắt nguồn** (Auto Power Off): **4 giờ**. Màn hình chờ giữ TV sáng (ảnh,
  đồng hồ), nên nếu quên tắt TV thì nó chạy cả đêm. Ban đêm màn hình chờ tự tối hơn.
- **Hẹn giờ tắt** (Sleep Timer): **Tổng quát → Trình quản lý hệ thống → Thời gian → Hẹn giờ tắt**, hoặc từ màn hình
  chính: Cài đặt → **Cài đặt TV**.

## 7. Developer Mode và địa chỉ IP

App được cài qua Developer Mode (cách bật: [hướng dẫn cài đặt](huong-dan-cai-dat.md#2-bật-developer-mode-trên-tv)).
- Để cài bản mới về sau, Developer Mode phải đang bật và **Host PC IP** đúng là IP của máy dùng để cài. Developer Mode
  có thể tự tắt sau khi TV cập nhật phần mềm; khi đó bật lại.
- **Giữ cố định IP** của TV (và của máy dùng để cài) trong trang quản trị router (DHCP reservation): trang cài đặt bằng
  điện thoại và các công cụ đều dùng IP của TV.
- Không bắt buộc: **Tổng quát → Mạng → Cài đặt chuyên gia → Bật bằng điện thoại** (Power On with Mobile) để bật TV từ
  điện thoại hay máy tính.

## Hạn chế của TV Samsung

- **Nút Home** trên remote luôn mở thanh Home của Samsung; không app nào thay được nút này. Thoát app thì dịch vụ nền đưa
  về màn hình chính, thường trong 1–2 giây; Netflix khoảng 3 giây vì Netflix chỉ ẩn chứ không tắt.
- **Không có root**: Developer Mode không có quyền root hay shell, nên không tắt được dịch vụ hệ thống của Samsung; các
  mục ở trên là những gì tắt được.
- **YouTube**: nút Back lùi trong YouTube trước rồi mới hỏi "Thoát YouTube?"; nút **Exit** về thẳng màn hình chính.
- Gợi ý, "xem tiếp" của YouTube, Netflix nằm trong từng app; Samsung không cho app khác đọc. Hàng YouTube trên dock lấy
  video mới của các kênh chọn sẵn (`youtubeChannels` trong `app/config.js`).
- Trạng thái dịch vụ nền (để gỡ lỗi): `http://<IP TV>:8701/status` trên máy cùng mạng.

## Gỡ bỏ toàn bộ

1. Thanh Home → **Ứng dụng** → ⚙ → ô màn hình chính (mặc định **Nhà Mình**) → **Xóa**.
2. **Ứng dụng** → bấm `1 2 3 4 5` → **Developer mode: Off** → khởi động lại TV.
3. DNS về **Nhận tự động**.
