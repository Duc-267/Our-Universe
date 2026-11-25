# LD-5 Duck Home

Căn phòng chung bên trong ngôi nhà, nơi đặt ảnh, thư, đồ trang trí và kỷ vật. Đồ mới mở khóa từ kỷ niệm và cột mốc, không bao giờ từ điểm danh (G5).

---

## LD-5.1 Căn phòng chung

- Ưu tiên: P1 · Kích thước: L · Release 2
- Phụ thuộc: LD-0.1

**User story.** Là một cặp đôi, chúng tôi muốn bước vào ngôi nhà của vịt và thấy một căn phòng chung ấm cúng, để có một góc riêng giữ những thứ quý giá của hai người.

**Tiêu chí chấp nhận**

1. Chạm ngôi nhà trong thế giới thì vào bên trong; có nút quay ra.
2. Căn phòng có các vị trí cố định: tường treo ba khung ảnh, kệ thư, bàn, kệ đồ, thảm, cửa sổ, giường của vịt.
3. Cửa sổ hiện cảnh bên ngoài theo buổi trong ngày của người xem (LD-0.3).
4. Vịt ở trong phòng khi hoạt động của nó là đọc sách hoặc ngồi bên cửa sổ (LD-1.1).
5. Phòng mới có sẵn một vài đồ cơ bản (giường vịt, thảm) để không trống trơn.
6. Có danh sách các vị trí và đồ vật dùng được bằng bàn phím.
7. Reduced motion: vào và ra phòng là cắt cảnh.

**Ngoài phạm vi.** Nhiều phòng, tầng hai.

---

## LD-5.2 Đồ trang trí mở khóa từ kỷ niệm

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-5.1

**User story.** Là một cặp đôi, chúng tôi muốn những cột mốc thật của mình mở khóa đồ trang trí mới cho căn phòng, để căn phòng kể lại hành trình của chúng tôi.

**Tiêu chí chấp nhận**

1. Danh mục mở khóa ban đầu (đề xuất):

   | Điều kiện | Đồ vật |
   |---|---|
   | Kỷ niệm đầu tiên | Chậu cây nhỏ |
   | Chuyến đi quan trọng đầu tiên (hành tinh) | Quả địa cầu |
   | Mỗi mặt trăng kỷ niệm năm | Đèn mặt trăng có số năm |
   | Same Moment hoàn thành đầu tiên | Khung ảnh đôi |
   | Lá thư kỷ vật đầu tiên | Giá cài thư |
   | Mỗi loại phần thưởng quest lần đầu | Đồ tương ứng (mảnh sao, chậu hoa, đèn tinh vân…) |
   | Mốc 100 ngày, 365 ngày | Rèm cửa, chuông gió |

2. Mở khóa là vĩnh viễn và không trùng: chạy lại không tạo bản sao (giống `refresh_milestones`).
3. Couple có sẵn dữ liệu nhận ngay những đồ đã đủ điều kiện khi tính năng ra mắt.
4. Đồ mới mở khóa hiện một dấu nhỏ trên ngôi nhà ngoài thế giới: “Có đồ mới trong nhà”.
5. Không điều kiện nào dựa trên số lần mở app, số ngày liên tiếp hay số check-in (G2, G5).

**Ghi chú kỹ thuật.** Danh mục đồ vật cố định trong PostgreSQL và TypeScript như catalog quest. Bảng `home_items` (couple, mã đồ, nguồn mở khóa, vị trí đặt nếu có).

**Ngoài phạm vi.** Mua đồ, tiền ảo.

---

## LD-5.3 Sắp xếp phòng

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-5.2

**User story.** Là một người trong cặp, tôi muốn đặt, đổi chỗ và cất đồ trong phòng, để căn phòng mang dấu ấn của cả hai.

**Tiêu chí chấp nhận**

1. Đồ đã mở khóa nằm trong một ngăn “đồ chưa đặt”. Kéo thả (hoặc chọn rồi chọn vị trí bằng bàn phím) để đặt vào một vị trí phù hợp loại đồ.
2. Đổi chỗ hai đồ, cất đồ về ngăn. Không bao giờ mất đồ đã mở khóa.
3. Thay đổi đồng bộ cho người kia qua realtime; hai người cùng sửa thì lần lưu sau cùng thắng.
4. Không có khái niệm “phòng đẹp” hay điểm trang trí (G3).

**Ngoài phạm vi.** Xoay đồ, đặt tự do ngoài vị trí cố định.

---

## LD-5.4 Khung ảnh và kệ thư

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-5.1, LD-2.4

**User story.** Là một người trong cặp, tôi muốn chọn ảnh kỷ niệm treo trên tường và thấy thư kỷ vật trên kệ, để căn phòng đầy những thứ của chính chúng tôi.

**Tiêu chí chấp nhận**

1. Chạm một khung ảnh để chọn ảnh từ ảnh của kỷ niệm (thumb khi xem phòng, ảnh tối ưu khi phóng to; dùng URL ký ngắn hạn hiện có).
2. Chạm ảnh trên tường mở kỷ niệm của nó.
3. Kệ thư hiện các lá thư kỷ vật (LD-2.4); chạm để đọc lại.
4. Xóa kỷ niệm thì khung ảnh trở lại trống, không lỗi.

**Ngoài phạm vi.** Ảnh không gắn với kỷ niệm.

---

## LD-5.5 Đưa đồ vật cho vịt

- Ưu tiên: P1 · Kích thước: S · Release 2
- Phụ thuộc: LD-5.2, LD-1.3

**User story.** Là một người trong cặp, tôi muốn đưa một món đồ cho vịt và xem nó chơi với món đó, để có thêm một cách tương tác vui với vịt.

**Tiêu chí chấp nhận**

1. Từ menu tương tác của vịt chọn “Đưa đồ”, chọn một đồ đã mở khóa có đánh dấu “vịt chơi được” (ví dụ quả địa cầu, đèn mặt trăng).
2. Vịt có hoạt ảnh riêng cho từng nhóm đồ, tối đa 3 giây; đồ không bị tiêu hao.
3. Tương tác chỉ diễn ra trên máy người dùng và không lưu, như LD-1.3.

**Ngoài phạm vi.** Đồ ăn cho vịt (dễ dẫn tới cảm giác phải cho ăn, vi phạm G1).
