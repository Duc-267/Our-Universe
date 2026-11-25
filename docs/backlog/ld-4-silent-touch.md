# LD-4 Silent Touch

Một dấu hiệu hiện diện nhỏ, không cần trả lời: một trái tim, một cái ôm hoặc một ngôi sao sáng để lại trong thế giới chung. Người kia thấy khi quay lại. BA đề xuất kéo lên P0 (Q7) vì nhỏ và phục vụ trực tiếp cặp yêu xa Việt Nam – Hàn Quốc.

---

## LD-4.1 Để lại dấu chạm

- Ưu tiên: P0 (đề xuất) · Kích thước: M · Release 1
- Phụ thuộc: LD-0.1 · Câu hỏi: Q7

**User story.** Là một người đang nhớ người ấy, tôi muốn để lại một dấu chạm nhỏ trong thế giới chung chỉ bằng một chạm, để người ấy biết tôi đã ghé qua mà không cần bắt đầu một cuộc trò chuyện.

**Tiêu chí chấp nhận**

1. Ba loại dấu chạm: trái tim, cái ôm, ngôi sao sáng. Gửi bằng một chạm từ nút trong thế giới; không có ô nhập chữ.
2. Sau khi gửi, người gửi thấy dấu chạm của mình hiện lên rồi mờ dần ở chỗ của nó trong thế giới (tim trên mặt hồ, ôm cạnh vịt, sao trên mái nhà).
3. Có thể gửi từ lựa chọn “Gửi cái ôm này” sau khi ôm vịt (LD-1.3).
4. Không giới hạn số lần gửi, nhưng không có bộ đếm hiện ra cho ai (G2, G3).
5. Mỗi dấu chạm lưu người gửi, loại, thời điểm gửi và thời điểm người nhận thấy.
6. Thành viên cặp khác không đọc được (G8).
7. Reduced motion: dấu chạm hiện tĩnh, không bay.

**Ghi chú kỹ thuật.** Bảng `silent_touches`, ghi qua hàm private; không phải `cosmic_objects` vì đây là dấu vết tạm thời. Thêm vào realtime publication.

**Ngoài phạm vi.** Kèm chữ, kèm ảnh (đó là thư).

---

## LD-4.2 Thấy dấu chạm khi quay lại

- Ưu tiên: P0 (đề xuất) · Kích thước: M · Release 1
- Phụ thuộc: LD-4.1 · Câu hỏi: Q4

**User story.** Là người nhận, tôi muốn khi mở app thấy những dấu chạm người ấy để lại lúc tôi vắng mặt, để cảm thấy được nhớ tới mà không bị áp lực phải trả lời.

**Tiêu chí chấp nhận**

1. Khi mở app, các dấu chạm chưa thấy hiện ở chỗ của chúng trong thế giới; vịt mang chúng tới (ví dụ thả tim xuống mặt hồ).
2. Nhiều dấu chạm cùng loại được gom lại hiển thị, ví dụ “3 cái ôm từ Minh”. Tối đa 12 dấu vết vẽ cùng lúc, phần còn lại gộp vào con số.
3. Nếu người nhận đang mở app khi dấu chạm tới, nó hiện ngay qua realtime với một hoạt ảnh nhẹ.
4. Sau khi người nhận đã thấy, dấu chạm mờ dần trong vài giây và được đánh dấu đã thấy.
5. Không có lời nhắc “Trả lời đi”, không có nút trả lời bắt buộc (G4, G6). Người nhận *có thể* gửi lại một dấu chạm nếu muốn.
6. Người gửi không biết dấu chạm đã được thấy hay chưa (chờ Q4).
7. Dấu chạm cũ không biến thành trạng thái tiêu cực, ví dụ “có 20 dấu chạm bạn chưa xem” (G1, G4).

**Ngoài phạm vi.** Lịch sử dấu chạm đầy đủ; thống kê dấu chạm.
