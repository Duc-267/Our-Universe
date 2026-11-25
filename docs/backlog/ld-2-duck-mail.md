# LD-2 Duck Mail

Thư riêng giữa hai người, do vịt mang tới hộp thư chung. Brief yêu cầu “làm thật tốt một kiểu thư trước khi mở rộng”: Release 1 chỉ có thư chữ (gửi ngay và hẹn ngày); ảnh và voice note ở Release 2.

Duck Mail không phải chat (PRD §2): không thread, không “đang nhập…”, không bong bóng hội thoại. Muốn trả lời thì viết một lá thư mới.

Tái dùng mẫu của secret capsule: dòng thư công khai trong couple (người gửi, người nhận, thời điểm giao) tách khỏi nội dung bị RLS chặn (`capsule_contents`).

---

## LD-2.1 Viết và gửi thư chữ

- Ưu tiên: P0 · Kích thước: L · Release 1
- Phụ thuộc: LD-0.1

**User story.** Là một người trong cặp, tôi muốn viết một lá thư ngắn và để vịt mang tới hộp thư cho người ấy, để nói điều mình muốn nói theo cách chậm rãi và riêng tư hơn tin nhắn.

**Tiêu chí chấp nhận**

1. Chạm hộp thư → “Viết thư”. Thư có nội dung (1–2000 ký tự) và lời ký tùy chọn (tối đa 40 ký tự). Người nhận luôn là người còn lại trong cặp.
2. Bấm gửi (giao ngay): bên người gửi, vịt cầm phong bì bay tới hộp thư (tối đa 2 giây); bên người nhận, cờ hộp thư bật lên.
3. Người nhận đang mở app thấy cờ bật qua realtime; nếu không, thấy khi mở app lần tới.
4. Không sửa thư sau khi đã giao. Thư hẹn giờ chưa giao thì người gửi thu hồi được (LD-2.2).
5. Có danh sách “Đã gửi” và “Đã nhận”, xếp theo thời điểm giao, mới nhất lên đầu.
6. Không có bộ đếm số thư mỗi người gửi, không so sánh (G3).
7. Privacy (G8): chỉ người gửi và người nhận đọc được nội dung; thành viên cặp khác không đọc được dòng thư lẫn nội dung. Có test SQL.
8. Tạo thư ghi một sự kiện quan hệ `LETTER_SENT`.
9. Reduced motion: không có chuyến bay, phong bì xuất hiện thẳng trong hộp thư.

**Ghi chú kỹ thuật.** Bảng `letters` (couple, người gửi, người nhận, `deliver_at`, `delivered_at`, `opened_at`, `keepsake`) và `letter_contents` (nội dung, lời ký). Ghi qua hàm private security-definer như mọi bảng couple khác. Thêm `letters` vào realtime publication.

**Ngoài phạm vi.** Ảnh (LD-2.5), voice (LD-2.6), giấy viết thư trang trí, nháp lưu tự động.

---

## LD-2.2 Thư hẹn giờ

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: LD-2.1, LD-0.2 · Câu hỏi: Q3, Q5

**User story.** Là một người trong cặp, tôi muốn hẹn ngày lá thư được mở (ngày kỷ niệm sắp tới hoặc một ngày tôi chọn), để người ấy nhận được nó đúng khoảnh khắc ý nghĩa.

**Tiêu chí chấp nhận**

1. Ba lựa chọn giao thư: ngay bây giờ, ngày kỷ niệm năm sắp tới, một ngày trong tương lai (tối đa 50 năm, giống capsule).
2. Khi chỉ chọn ngày, thư đến lúc 00:00 ngày đó theo múi giờ của người nhận (LD-0.2).
3. Trước thời điểm giao, người nhận thấy một phong bì “đang bay tới” với ngày đến, không thấy nội dung (chờ Q3). Nếu người gửi bật “Bất ngờ”, người nhận không thấy gì tới lúc thư đến.
4. Nội dung bị chặn ở database tới thời điểm giao (G8). Test SQL: người nhận đọc `letter_contents` trước hạn trả về rỗng.
5. Người gửi thu hồi được thư chưa giao; thư biến mất khỏi cả hai phía.
6. Đến hạn, thư vào hộp thư mà không cần ai làm gì. Nếu người nhận đang mở app thì cờ bật trong vòng một phút.
7. Capsule cũ vẫn xem và mở được như bây giờ. Khi story này ra mắt, nút “Tạo capsule” trong UI đổi thành “Thư hẹn giờ” (chờ Q5).

**Ghi chú kỹ thuật.** “Đến hạn” được tính khi đọc (`deliver_at <= now()`), không cần job chạy nền; một hàm `refresh_letters` khi mở `/universe` ghi `delivered_at` và sự kiện, theo kiểu `refresh_quests` / `refresh_milestones`. Để cờ bật cho người đang mở app, client hẹn giờ tới `deliver_at` gần nhất rồi gọi refresh.

**Ngoài phạm vi.** Đẩy thông báo khi thư đến (LD-8.2), thư định kỳ.

---

## LD-2.3 Hộp thư và mở thư

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: LD-2.1 · Câu hỏi: Q4

**User story.** Là người nhận, tôi muốn mở lá thư trong hộp thư và thấy vịt có phản ứng dễ thương, để việc đọc thư trở thành một khoảnh khắc nhỏ đáng nhớ.

**Tiêu chí chấp nhận**

1. Hộp thư trong thế giới có cờ bật khi có thư đã đến mà chưa mở, kèm số nhỏ nếu có nhiều hơn một thư.
2. Mở thư: phong bì mở ra, hiện nội dung, lời ký, tên người gửi và ngày gửi. Cùng lúc vịt có phản ứng (vỗ cánh, má hồng) và một hoạt ảnh nhỏ (vài cánh hoa hoặc tim) trong tối đa 2 giây.
3. Lần mở đầu tiên lưu `opened_at`; mở lại không lưu lần nữa.
4. Người gửi thấy lặng lẽ “đã mở” cạnh thư trong danh sách Đã gửi; không có thông báo đẩy (chờ Q4).
5. Có nút “Viết thư hồi âm” mở một lá thư mới trống; không tạo thread.
6. Thư đã mở vẫn đọc lại được mãi trong danh sách Đã nhận.
7. Bàn phím: hộp thư focus được; danh sách thư dùng được bằng phím; nội dung thư đọc được bằng trình đọc màn hình.
8. Reduced motion: không có hoạt ảnh, chỉ hiện nội dung.

**Ngoài phạm vi.** Phản ứng bằng emoji lên thư.

---

## LD-2.4 Lưu thư thành kỷ vật

- Ưu tiên: P0 · Kích thước: S · Release 1
- Phụ thuộc: LD-2.3

**User story.** Là một người trong cặp, tôi muốn giữ những lá thư yêu thích thành một vật thể trong thế giới, để có thể quay lại đọc chúng như một món kỷ vật.

**Tiêu chí chấp nhận**

1. Trên thư đã mở, người nhận hoặc người gửi bấm “Giữ làm kỷ vật”. Mỗi thư có một trạng thái kỷ vật chung cho cả hai.
2. Thư kỷ vật thành một đèn lồng giấy nhỏ trên bầu trời gần hồ, ở vị trí xác định từ id thư và không đổi giữa các phiên.
3. Chạm đèn lồng mở lại lá thư.
4. Bỏ giữ thì đèn lồng biến mất; thư vẫn còn trong danh sách.
5. Thư chưa mở hoặc chưa giao không giữ được.
6. Khi Duck Home ra mắt, thư kỷ vật cũng hiện trên kệ thư (LD-5.4).

**Ghi chú kỹ thuật.** Thêm loại vật thể `LETTER_KEEPSAKE` vào `cosmic_objects` với partial unique index một vật thể mỗi thư, theo mẫu `DISTANT_OBJECT` của dream.

**Ngoài phạm vi.** Gom nhiều thư thành một bộ.

---

## LD-2.5 Thư kèm ảnh

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-2.1

**User story.** Là một người trong cặp, tôi muốn kèm một tấm ảnh vào thư, để người ấy thấy điều tôi đang thấy.

**Tiêu chí chấp nhận**

1. Một ảnh mỗi thư, qua pipeline thu nhỏ trong trình duyệt hiện có (full và thumb, WebP/JPEG).
2. Đường dẫn `<couple>/letters/<letter>/...` trong bucket `universe-media`.
3. Người nhận không ký được URL ảnh trước thời điểm giao (G8); test giống ảnh capsule.
4. Thu hồi thư chưa giao xóa cả ảnh.

**Ngoài phạm vi.** Nhiều ảnh, video.

---

## LD-2.6 Voice note

- Ưu tiên: P1 · Kích thước: L · Release 2
- Phụ thuộc: LD-2.1

**User story.** Là một người trong cặp yêu xa, tôi muốn gửi một đoạn ghi âm ngắn trong thư, để người ấy nghe được giọng mình.

**Tiêu chí chấp nhận**

1. Ghi âm tối đa 60 giây trong trình duyệt; nghe lại, ghi lại hoặc bỏ trước khi gửi.
2. Chạy trên Chrome Android, Safari iOS và desktop. Chấp nhận `audio/webm` và `audio/mp4`; tối đa 2 MB.
3. Người nhận nghe bằng trình phát trong thư; nội dung âm thanh bị chặn tới thời điểm giao (G8).
4. Có ô chú thích chữ tùy chọn cho người không nghe được.
5. Không hỏi quyền micro cho tới khi người dùng bấm “Ghi âm”.

**Ghi chú kỹ thuật.** Bucket `universe-media` hiện chỉ cho `image/webp` và `image/jpeg`; cần migration mở thêm MIME âm thanh và ghi decision record.

**Ngoài phạm vi.** Chuyển giọng nói thành chữ, hiệu ứng giọng.
