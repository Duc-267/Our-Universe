# LD-3 Memory Garden

Mỗi kỷ niệm mọc thành một cây hoặc bông hoa trong vườn mà hai người có thể chạm vào để xem lại. Kèm Promise Stars cho những lời hứa.

Hiện trạng: mỗi kỷ niệm là một sticker sao (`STAR` / `BRIGHT_STAR`) ở vị trí lưu cố định trên bầu trời; chòm sao nối các sao đó; gravity đổi cỡ và độ mờ của sao.

---

## LD-3.1 Kỷ niệm mọc thành cây trong vườn

- Ưu tiên: P0 · Kích thước: L · Release 1
- Phụ thuộc: LD-0.1 · Câu hỏi: Q1

**User story.** Là một cặp đôi, chúng tôi muốn mỗi kỷ niệm mình lưu mọc thành một cây hay bông hoa trong vườn, để thấy thế giới của mình lớn lên từ chính những khoảnh khắc đó.

**Tiêu chí chấp nhận**

1. Lưu một kỷ niệm thì một cây mới mọc trong vườn với hoạt ảnh nảy mầm → nở (tối đa 2 giây). Người kia đang mở app thấy cây mọc qua realtime.
2. Loài cây theo danh mục kỷ niệm (đề xuất, chờ duyệt hình):

   | Danh mục | Cây |
   |---|---|
   | everyday | Hoa cúc nhỏ |
   | date | Hoa hồng |
   | trip | Bồ công anh |
   | funny | Hướng dương |
   | special | Cây non (lớn hơn các hoa) |
   | difficult | Hoa sen mọc ở mép hồ |
   | random | Hoa dại, màu ngẫu nhiên theo id |

3. Kỷ niệm quan trọng (importance ≥ 8) có cây to hơn và lấp lánh nhẹ. Gravity hiện có đổi cỡ cây giống cách nó đổi cỡ sao.
4. Mỗi cây có vị trí xác định từ id kỷ niệm, lưu lại, và không đổi giữa các phiên. Hai cây không chồng lên nhau.
5. Chạm cây mở chi tiết kỷ niệm hiện có (ảnh, câu chuyện, ngày, người viết, sửa và xóa với tác giả).
6. Sửa danh mục thì đổi loài cây nhưng giữ vị trí. Xóa kỷ niệm thì cây biến mất trong cùng giao dịch.
7. Kỷ niệm đã có trước khi tính năng ra mắt được trồng bằng migration backfill, không mất kỷ niệm nào.
8. Theo đề xuất A của Q1: sao trên trời của kỷ niệm vẫn còn (chòm sao và Explorer vẫn dùng), vẽ nhỏ hơn hiện tại để vườn là nơi chính. Nếu PO chọn B, story phải viết lại phần chòm sao.
9. Có danh sách vườn dùng được bằng bàn phím, nhóm theo tháng, mở cùng chi tiết kỷ niệm.
10. Thành viên cặp khác không thấy cây (RLS như `cosmic_objects`).

**Ghi chú kỹ thuật.** Loại vật thể mới `GARDEN_PLANT` trong `cosmic_objects`, khóa theo `memory_id`. Chỉ mục duy nhất hiện tại “một sao mỗi kỷ niệm” phải đổi thành “một vật thể mỗi kỷ niệm mỗi loại”. `private.create_memory`, `update_memory`, `delete_memory` tạo, sửa, xóa cây cùng giao dịch. Vị trí lưu trong hệ tọa độ 2D của vườn, không phải quỹ đạo 3D.

**Ngoài phạm vi.** Tưới cây hay chăm cây (vi phạm G1); người dùng tự chọn loài cây.

---

## LD-3.2 Vườn mở rộng theo số cây

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: LD-3.1

**User story.** Là một cặp đã lưu rất nhiều kỷ niệm, chúng tôi muốn khu vườn rộng ra theo số kỷ niệm, để cây không chen chúc và khu vườn phản ánh lịch sử của mình.

**Tiêu chí chấp nhận**

1. Vườn bắt đầu với một luống. Mỗi khi số cây vượt sức chứa luống hiện tại (đề xuất 24 cây), một luống mới mở ra và có hoạt ảnh nhỏ một lần.
2. Luống mở theo số kỷ niệm, không theo thời gian hay số lần mở app (G5). Xóa kỷ niệm không đóng luống đã mở.
3. Người dùng kéo hoặc vuốt để đi trong vườn khi vườn rộng hơn khung nhìn.
4. Với 1000 cây: desktop giữ khoảng 60 FPS, điện thoại từ 30 FPS trở lên (SPEC §14). Chỉ vẽ cây trong khung nhìn.

**Ngoài phạm vi.** Người dùng tự xếp lại cây.

---

## LD-3.3 Promise Stars

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: không

**User story.** Là một cặp đôi, chúng tôi muốn những lời hứa với nhau thành những ngôi sao riêng trên trời, để nhớ và cùng giữ chúng.

**Tiêu chí chấp nhận**

1. Một lời hứa có nội dung (1–200 ký tự), người hứa (tôi, người ấy, hoặc cả hai), và ngày hẹn tùy chọn.
2. Lời hứa đang giữ là một ngôi sao có vầng sáng ấm, khác với sao kỷ niệm.
3. Đánh dấu “đã thực hiện” thì ngôi sao có thêm một vòng sáng và có thể gắn với một kỷ niệm.
4. Không có trạng thái “thất hứa”, không đếm lời hứa quá hạn, không nhắc nhở trách móc (G1, G3, G4). Qua ngày hẹn mà chưa thực hiện thì sao vẫn sáng như cũ.
5. Người tạo có thể cất lời hứa đi một cách lặng lẽ: ngôi sao biến mất, không thông báo cho người kia.
6. Thành viên cặp khác không đọc được.

**Ghi chú kỹ thuật.** Bảng `promises` và loại vật thể `PROMISE_STAR`, theo mẫu future dream.

**Ngoài phạm vi.** Biến lời hứa thành quest.
