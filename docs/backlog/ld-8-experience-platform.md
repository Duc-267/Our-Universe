# LD-8 Hạ tầng trải nghiệm

Những khả năng không hiện thành một tính năng riêng nhưng các epic khác cần: biết người kia đang mở app, thông báo đẩy, và giao diện đúng ngôn ngữ của từng người.

---

## LD-8.1 Presence: biết người kia đang mở app

- Ưu tiên: P1 · Kích thước: S · Release 2
- Phụ thuộc: không

**User story.** Là một người trong cặp, tôi muốn app biết khi cả hai cùng đang ở trong thế giới, và tôi muốn tự tắt việc chia sẻ đó, để có những khoảnh khắc chung mà vẫn giữ được riêng tư.

**Tiêu chí chấp nhận**

1. Mỗi couple có một kênh presence; chỉ hai thành viên vào được.
2. Không lưu lịch sử online vào database; không hiển thị “lần cuối online”.
3. Mỗi người có cài đặt “Cho người ấy biết khi tôi đang ở đây”, mặc định bật, tắt được bất cứ lúc nào.
4. Presence chỉ dùng cho những khoảnh khắc vui thêm (LD-1.5), không dùng để báo vắng mặt (G6).

**Ghi chú kỹ thuật.** Supabase Realtime Presence trên kênh theo couple id; quyền vào kênh kiểm thành viên như các kênh realtime hiện có.

**Ngoài phạm vi.** Trạng thái “đang nhập”.

---

## LD-8.2 PWA và web push

- Ưu tiên: P1 · Kích thước: L · Release 2
- Phụ thuộc: LD-2.2

**User story.** Là một người trong cặp, tôi muốn cài app lên màn hình chính và nhận một thông báo nhẹ khi có thư đến, để không bỏ lỡ lá thư hẹn giờ người ấy gửi.

**Tiêu chí chấp nhận**

1. App cài được như PWA trên Android, iOS (16.4 trở lên) và desktop: có manifest, icon, màn hình mở đầu.
2. Người dùng chủ động bật thông báo trong cài đặt; app không hỏi quyền ngay khi mở.
3. Loại thông báo trong release này: thư đã đến (gồm thư hẹn giờ), capsule mở được, có đồ mới trong nhà. Mỗi loại bật hoặc tắt riêng.
4. Thông báo không chứa nội dung riêng tư (G8): “Có một lá thư trong hộp thư”, không trích nội dung.
5. Không có thông báo nhắc mở app, nhắc check-in hay nhắc trả lời (G4).
6. Dấu chạm im lặng không tạo thông báo (giữ tinh thần “thấy khi quay lại”).
7. Thư hẹn giờ gửi thông báo trong vòng 5 phút sau `deliver_at`.

**Ghi chú kỹ thuật.** Cần service worker, một route server trên Vercel để gửi push, và một job theo lịch để quét thư tới hạn (Vercel Cron hoặc pg_cron của Supabase). Khóa VAPID riêng là bí mật phía server đầu tiên của app: chỉ đặt trong biến môi trường Vercel không có tiền tố `NEXT_PUBLIC_`, không đưa vào repo. Ghi decision record khi chọn.

**Ngoài phạm vi.** Thông báo qua email, app native.

---

## LD-8.3 Giao diện vi / ko / en

- Ưu tiên: P1 · Kích thước: L · Release 2
- Phụ thuộc: không · Câu hỏi: Q6

**User story.** Là người Hàn Quốc trong một cặp Việt – Hàn, tôi muốn dùng app bằng tiếng Hàn trong khi người ấy dùng tiếng Việt, để cả hai đều thoải mái trong cùng một thế giới.

**Tiêu chí chấp nhận**

1. Mỗi người chọn ngôn ngữ giao diện riêng: tiếng Việt, tiếng Hàn hoặc tiếng Anh. Lần đầu đề xuất theo ngôn ngữ trình duyệt.
2. Toàn bộ chuỗi giao diện, câu của vịt và thông báo theo ngôn ngữ của người xem.
3. Nội dung người dùng viết (kỷ niệm, thư, tên vịt) giữ nguyên như khi viết, không dịch.
4. Ngày và giờ hiển thị theo định dạng của ngôn ngữ đã chọn.
5. Câu chữ ở cả ba ngôn ngữ được rà theo G3 và G4 trước khi phát hành.
6. Font hiện tại không có ký tự Hangul nên cần font dự phòng cho tiếng Hàn. Font chữ thân (Nunito) đã nạp subset `vietnamese`; font tiêu đề (Fredoka) chỉ nạp `latin` và `latin-ext`, cần kiểm tra dấu tiếng Việt trên tiêu đề và thêm font dự phòng nếu thiếu.

**Ngoài phạm vi.** Dịch nội dung người dùng.
