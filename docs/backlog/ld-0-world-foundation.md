# LD-0 Nền tảng thế giới

Biến màn hình `/universe` từ “bầu trời + thanh bên” thành một thế giới nhỏ có nhiều vùng, có giờ giấc theo từng người. Các epic khác dựa trên epic này.

---

## LD-0.1 Thế giới nhiều vùng

- Ưu tiên: P0 · Kích thước: L · Release 1
- Phụ thuộc: không

**User story.** Là một người trong cặp, tôi muốn mở app và thấy một thế giới nhỏ có bầu trời, hồ, vườn, ngôi nhà và hộp thư, để cảm giác mình đang trở về một nơi chốn chứ không phải mở một bảng điều khiển.

**Tiêu chí chấp nhận**

1. Khi mở `/universe`, cảnh có hai tầng: bầu trời ở trên (giữ toàn bộ vật thể và phép chiếu hiện có) và mặt đất ở dưới gồm hồ (có vịt), một mảnh vườn, mặt tiền ngôi nhà và hộp thư.
2. Vịt vẫn ở trung tâm, ngồi trên mặt hồ.
3. Bầu trời vẫn xoay và zoom như hiện tại. Mặt đất là lớp 2D cố định, không xoay theo bầu trời.
4. Trên điện thoại (390 px) người dùng vuốt ngang để đi giữa các vùng; trên desktop toàn bộ vùng nằm trong một khung nhìn.
5. Mỗi vùng là một điểm có thể chạm. Vùng chưa có tính năng (ví dụ nhà trước Release 2) vẫn vẽ nhưng không mở gì và không hiện chữ “sắp có”.
6. Thế giới rỗng (cặp mới) vẫn đẹp: vườn có cỏ và một luống đất trống, hộp thư đóng cờ, câu “Thế giới của hai bạn bắt đầu từ đây.”
7. Có danh sách điều hướng bằng bàn phím tương đương: Bầu trời, Hồ, Vườn, Nhà, Hộp thư.
8. Reduced motion: không có chuyển động trôi; chuyển vùng là cắt cảnh.

**Ghi chú kỹ thuật.** Giữ canvas projector cho bầu trời (decision 2026-10-12, 2026-10-13). Mặt đất có thể là SVG hoặc một canvas thứ ba bên dưới vịt; giữ quy tắc “hai canvas quanh vịt” để vật thể đi trước và sau vịt. Không cần bảng mới.

**Ngoài phạm vi.** Bên trong nhà (LD-5.1), cây trong vườn (LD-3.1), thư (LD-2.x).

---

## LD-0.2 Múi giờ của từng người

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: không

**User story.** Là người đang ở Seoul trong khi người ấy ở Hà Nội, tôi muốn app biết giờ của riêng tôi, để cảnh vật, giờ giao thư và “hôm nay” khớp với nơi tôi đang sống.

**Tiêu chí chấp nhận**

1. Mỗi thành viên có múi giờ IANA riêng, lưu ở hồ sơ cá nhân.
2. Lần đầu đăng nhập sau khi tính năng ra mắt, múi giờ của trình duyệt được đề xuất sẵn; người dùng xác nhận hoặc đổi trong cài đặt.
3. Thành viên chưa đặt múi giờ thì dùng múi giờ của cặp (`couple_settings.timezone`) như hiện tại.
4. Ngày kỷ niệm, số ngày bên nhau và cột mốc vẫn tính theo múi giờ của cặp (không đổi hành vi).
5. Mỗi người chỉ sửa được múi giờ của mình; người kia đọc được để hiển thị giờ địa phương.
6. Test database: thành viên cặp khác không đọc được múi giờ.

**Ghi chú kỹ thuật.** Thêm cột vào `profiles` hoặc bảng thành viên; validate tên múi giờ bằng `pg_timezone_names` giống múi giờ của cặp. Ghi quyết định vào `docs/architecture.md`: múi giờ cặp cho ngày chung, múi giờ người cho cảnh và giờ giao thư.

**Ngoài phạm vi.** Tự động đổi múi giờ khi đi du lịch.

---

## LD-0.3 Sáng, chiều, tối theo giờ người xem

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: LD-0.2 · Câu hỏi: Q9

**User story.** Là một người trong cặp, tôi muốn bầu trời và mặt đất đổi theo buổi trong ngày của tôi, để thế giới có cảm giác sống cùng nhịp với mình.

**Tiêu chí chấp nhận**

1. Bốn khung cảnh theo giờ địa phương của người xem: sáng (05:00–10:59), chiều (11:00–16:59), hoàng hôn (17:00–18:59), đêm (19:00–04:59).
2. Mặt trăng và sao nền rõ nhất vào ban đêm; ban ngày sao nền mờ nhưng vật thể kỷ niệm vẫn chạm được.
3. Tint của mood (đã có) vẫn phủ lên trên khung cảnh theo giờ.
4. Khung cảnh đổi khi đồng hồ qua mốc mà không cần tải lại trang.
5. Có một dòng nhỏ hiển thị giờ địa phương của người kia, ví dụ “Ở chỗ Minh đang 21:10”. Người dùng tắt được dòng này.
6. Hai người mở cùng lúc có thể thấy hai khung cảnh khác nhau; đó là hành vi đúng.
7. Reduced motion: đổi khung cảnh là cắt, không chuyển màu dần.

**Ghi chú kỹ thuật.** Thuần client, đọc múi giờ từ LD-0.2. Đặt hàm chọn khung cảnh trong module dùng chung (ví dụ `src/features/duck/`) để LD-1.1 tái dùng.

**Ngoài phạm vi.** Thời tiết thật theo vị trí.

---

## LD-0.4 Gom thanh bên thành điểm vào theo vùng

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: LD-0.1

**User story.** Là một người trong cặp, tôi muốn thế giới chiếm gần hết màn hình và các chức năng nằm ở đúng nơi của chúng trong thế giới, để không phải cuộn qua một cột dài các bảng.

**Tiêu chí chấp nhận**

1. Thanh bên cố định hiện tại được thay bằng một ngăn kéo mở theo ngữ cảnh khi chạm vào một vùng.
2. Ánh xạ: Hồ → mood hôm nay, Same Moment; Vườn → danh sách kỷ niệm, tạo kỷ niệm, chòm sao; Bầu trời → chuyến đi, mặt trăng và cột mốc, cosmic event, dream, phần thưởng quest; Hộp thư → thư (LD-2) và capsule; Nhà → archive (tạm thời, cho tới LD-7.3).
3. Quest đang mở và Same Moment đang mở hiện như một dấu nhỏ trên vùng tương ứng, không phải một bảng luôn mở.
4. Mọi chức năng hiện có vẫn tới được bằng bàn phím trong tối đa hai bước từ màn hình thế giới.
5. Trên desktop ngăn kéo mở ở bên phải và không che vịt; trên điện thoại ngăn kéo trượt từ dưới lên.
6. Không mất chức năng nào: toàn bộ kịch bản của Phase 1–3 vẫn chạy.

**Ghi chú kỹ thuật.** Chủ yếu thay đổi `universe-view.tsx` và CSS. Thay đổi bố cục đang chưa commit trên nhánh `phase-4-ai-archivist` (canvas khóa theo viewport, cột phải tự cuộn) là bước trung gian; story này thay thế cột phải đó.

**Ngoài phạm vi.** Thiết kế lại từng panel bên trong.
