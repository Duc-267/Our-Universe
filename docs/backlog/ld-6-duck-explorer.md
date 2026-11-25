# LD-6 Duck Explorer

Vịt bay tới những ngôi sao và hành tinh đã có, mỗi nơi chứa một chủ đề hoặc một giai đoạn của mối quan hệ. Epic này tái dùng dữ liệu sẵn có: hành tinh (chuyến đi), mặt trăng (ngày kỷ niệm năm), chòm sao (nhóm kỷ niệm).

---

## LD-6.1 Vịt bay tới hành tinh, mặt trăng, chòm sao

- Ưu tiên: P1 · Kích thước: L · Release 2
- Phụ thuộc: LD-0.1

**User story.** Là một cặp đôi, chúng tôi muốn cùng vịt bay tới một hành tinh hay chòm sao và khám phá những gì bên trong, để xem lại một chuyến đi hay một chủ đề như đang thật sự đến thăm nơi đó.

**Tiêu chí chấp nhận**

1. Chạm hành tinh, mặt trăng hoặc chòm sao hiện thêm nút “Đi thăm” bên cạnh chi tiết hiện có.
2. “Đi thăm”: vịt bay từ hồ tới vật thể (tối đa 2 giây), rồi mở cảnh của nơi đó.
3. Cảnh hành tinh: điểm đến, ngày đi và về, ghi chú, các kỷ niệm và ảnh gắn với chuyến đi, đặt trên bề mặt hành tinh.
4. Cảnh chòm sao: tên chòm sao và các kỷ niệm thành viên nối bằng đường sao.
5. Cảnh mặt trăng: xem LD-6.2.
6. Nút “Về nhà” đưa vịt bay về hồ.
7. Chạm kỷ niệm trong cảnh mở chi tiết kỷ niệm hiện có.
8. Không có huy hiệu “đã khám phá” hay phần trăm hoàn thành (G3).
9. Reduced motion: không có chuyến bay, chuyển cảnh là cắt.
10. Bàn phím: “Đi thăm” và “Về nhà” dùng được bằng phím; nội dung cảnh có danh sách tương đương.

**Ngoài phạm vi.** Hai người cùng đi thăm theo thời gian thực.

---

## LD-6.2 Chương theo năm

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-6.1

**User story.** Là một cặp đôi, chúng tôi muốn mỗi năm bên nhau là một chương có thể ghé thăm, để xem lại cả một giai đoạn của mối quan hệ.

**Tiêu chí chấp nhận**

1. Mỗi mặt trăng kỷ niệm năm là cổng vào chương của năm quan hệ kết thúc vào ngày đó (ví dụ mặt trăng thứ nhất mở “Năm thứ nhất”).
2. Năm đang diễn ra là “Chương đang viết”, vào từ một vầng trăng non mờ.
3. Cảnh chương: các kỷ niệm của năm đó nhóm theo tháng, kèm hành tinh chuyến đi, cột mốc, Same Moment và thư kỷ vật trong khoảng ngày đó.
4. Năm tính theo `relationship_start_date` và múi giờ của cặp, cùng luật ngày kỷ niệm đang dùng (29/2 thành 28/2 ở năm không nhuận).
5. Chương không có nội dung vẫn mở được với câu “Năm này còn yên ắng.”, không có câu so sánh với năm khác (G3).

**Ngoài phạm vi.** Câu tóm tắt chương do AI viết (nằm trong Later: Monthly Journal, Wrapped).
