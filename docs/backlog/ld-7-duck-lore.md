# LD-7 Duck Lore & Memories

Chú vịt có đồ vật và thói quen gắn với lịch sử của hai người, ví dụ sau một chuyến đi biển, căn phòng có thêm một chiếc vỏ sò. Mọi luật đều xác định và giải thích được; không dùng model ngôn ngữ trong epic này.

---

## LD-7.1 Kỷ vật từ chuyến đi và kỷ niệm

- Ưu tiên: P2 · Kích thước: M · Release 3
- Phụ thuộc: LD-5.1

**User story.** Là một cặp đôi, chúng tôi muốn mang về một món kỷ vật nhỏ từ mỗi chuyến đi hay kỷ niệm đặc biệt, để căn phòng của vịt lưu lại dấu vết những nơi chúng tôi đã đến.

**Tiêu chí chấp nhận**

1. Khi lưu chuyến đi hoặc kỷ niệm, có bước tùy chọn “Mang về một kỷ vật” với danh mục: vỏ sò, vé tàu, lá phong, đá cuội, bưu thiếp, móc khóa, cành hoa ép, vé xem phim.
2. App gợi ý sẵn một kỷ vật theo luật đơn giản (ví dụ điểm đến hoặc ghi chú có “biển”, “beach”, “바다” → vỏ sò); người dùng xác nhận, đổi hoặc bỏ qua. Không gợi ý thì không chọn sẵn.
3. Kỷ vật hiện trong ngăn “đồ chưa đặt” của Duck Home và đặt được lên kệ (LD-5.3).
4. Chạm kỷ vật mở lại chuyến đi hoặc kỷ niệm của nó.
5. Xóa chuyến đi hoặc kỷ niệm thì kỷ vật gắn với nó cũng biến mất.

**Ngoài phạm vi.** Nhận diện ảnh để gợi ý kỷ vật.

---

## LD-7.2 Thói quen của vịt gắn với lịch sử

- Ưu tiên: P2 · Kích thước: M · Release 3
- Phụ thuộc: LD-1.1

**User story.** Là một cặp đôi, chúng tôi muốn vịt dần có những thói quen phản ánh cách chúng tôi sống cùng nhau, để thấy nó thật sự là vịt của riêng mình.

**Tiêu chí chấp nhận**

1. Danh mục luật ban đầu (đề xuất): nhiều kỷ niệm danh mục “date” → vịt hay cầm một bông hồng; có từ ba hành tinh trở lên → vịt hay xem bản đồ; có từ năm Same Moment trở lên → vịt hay chụp ảnh bầu trời; có lá thư kỷ vật → vịt hay đọc thư trên giường.
2. Thói quen là thêm lựa chọn cho LD-1.1, không thay hoạt động cơ bản.
3. Mỗi thói quen có lý do hiển thị được, ví dụ “Vịt hay cầm hoa hồng vì hai bạn có 12 kỷ niệm hẹn hò.”
4. Thói quen chỉ thêm vào, không bao giờ mất đi vì ít hoạt động (G1).
5. Câu chữ chỉ kể lại, không đánh giá (“hai bạn hẹn hò nhiều”, không phải “hai bạn rất hợp nhau”) (G3).

**Ngoài phạm vi.** Thói quen do AI suy ra.

---

## LD-7.3 Sổ tay của vịt

- Ưu tiên: P2 · Kích thước: M · Release 3
- Phụ thuộc: LD-7.1, PR #22 · Câu hỏi: Q8

**User story.** Là một cặp đôi, chúng tôi muốn một cuốn sổ tay nơi vịt ghi lại kỷ vật, thói quen và câu chuyện của chúng tôi, để có một chỗ đọc lại lịch sử chung bằng giọng kể dễ thương.

**Tiêu chí chấp nhận**

1. Sổ tay nằm trên bàn trong Duck Home; mở ra là các trang.
2. Trang đầu là đoạn tóm tắt archive của Epic 4.1 (PR #22), viết lại theo giọng của vịt nhưng giữ đúng số liệu và quy tắc không đánh giá, không khuyên.
3. Các trang tiếp: danh sách kỷ vật kèm câu chuyện, danh sách thói quen kèm lý do (LD-7.2), giai đoạn lớn của vịt và ngày lên giai đoạn.
4. Couple chưa có dữ liệu thấy một trang trống với câu cố định, giống câu rỗng của archive.

**Ghi chú kỹ thuật.** Đoạn archive hiện được ghép trong PostgreSQL (`private.refresh_archive`). Đổi giọng kể là đổi chuỗi trong hàm đó, không thêm model.

**Ngoài phạm vi.** Thư tháng do AI viết (Later, Epic 4.2).
