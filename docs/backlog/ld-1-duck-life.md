# LD-1 Duck Life

Làm cho chú vịt có đời sống riêng: làm việc nhỏ theo giờ, phản ứng với mood và với cái chạm của người dùng, lớn dần cùng mối quan hệ. Không có nghĩa vụ chăm sóc (G1, G2).

Hiện trạng: SVG vịt vẽ bằng code trong `universe-scene.tsx`, 7 pose theo mood (`features/checkin/weather.ts`), nhảy khi có sao mới (`data-cheer="star"`), bay tim khi check-in (`data-cheer="checkin"`).

---

## LD-1.1 Hoạt động nhỏ của vịt

- Ưu tiên: P0 · Kích thước: L · Release 1
- Phụ thuộc: LD-0.1, LD-0.3

**User story.** Là một người trong cặp, tôi muốn mỗi lần mở app thấy vịt đang làm một việc nhỏ, để có cảm giác thế giới vẫn sống khi mình không ở đó.

**Tiêu chí chấp nhận**

1. Danh mục hoạt động cho Release 1: ngủ, ngắm sao, ngắm trăng, đọc sách, tưới cây, chơi bên hồ, ngồi bên cửa sổ.
2. Hoạt động được chọn bằng luật xác định từ: buổi trong ngày của người xem (LD-0.3), trạng thái thế giới và một hạt giống thay đổi mỗi 15 phút. Cùng đầu vào trong cùng khung 15 phút cho cùng hoạt động, để vịt không nhảy việc liên tục.
3. Gợi ý luật: đêm → ngủ, ngắm sao hoặc ngắm trăng; sáng → tưới cây hoặc chơi bên hồ; chiều → đọc sách hoặc chơi bên hồ. Có thư chưa mở → đọc thư bên hộp thư. Có thư hẹn giờ sắp đến trong 24 giờ → ngồi bên cửa sổ (chờ đón, không phải buồn).
4. Mood hôm nay (đã có) quyết định *cách* vịt làm việc đó: “mệt” thì ngủ gật khi đọc sách, “vui” thì vừa tưới cây vừa nhún nhảy.
5. Không hoạt động nào được chọn vì người dùng vắng mặt lâu (G1). Không có hoạt động “chờ mãi”, “buồn vì không ai về”.
6. Trình đọc màn hình nghe được một câu ngắn, ví dụ “Vịt đang ngắm sao”.
7. Reduced motion: vịt ở tư thế tĩnh của hoạt động đó.

**Ghi chú kỹ thuật.** Hàm thuần trong `src/features/duck/` (ví dụ `chooseActivity(viewerTime, world, moods)`) có unit test. Đạo cụ (sách, bình tưới, chăn) là lớp SVG thêm vào vịt; tái dùng hệ `data-pose`.

**Ngoài phạm vi.** Hoạt động gắn với lịch sử cặp (LD-7.2), hoạt động có đồ vật trong nhà (LD-5.5).

---

## LD-1.2 Chọn mood ngay trong cảnh, biểu cảm rõ hơn

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: không

**User story.** Là một người trong cặp, tôi muốn chọn cảm xúc của mình chỉ bằng một chạm vào vịt và thấy vịt đổi nét mặt ngay, để chia sẻ tâm trạng mà không phải mở một biểu mẫu.

**Tiêu chí chấp nhận**

1. Chạm vào hồ hoặc vịt mở bảng chọn mood nhỏ với 8 mood hiện có; một chạm là lưu (dùng lại `save_checkin`, vẫn một check-in mỗi người mỗi ngày, sửa được trong ngày).
2. Ghi chú và ảnh của check-in vẫn có, nhưng là tùy chọn “thêm vài dòng”.
3. Mỗi mood có biểu cảm riêng ngoài tư thế: mắt, má hồng, lông mày, và một đạo cụ nhỏ (chăn cho “mệt”, bong bóng cho “cần không gian”, tim cho “nhớ”).
4. Khi hai người có mood khác nhau, vịt luân phiên hai biểu cảm (đã có cho tư thế). Có chú thích nhỏ cho biết mỗi biểu cảm là của ai.
5. Người kia đang mở app thấy biểu cảm đổi qua realtime mà không cần tải lại (realtime `daily_checkins` đã có).
6. Không có câu chữ nào đánh giá mood (“Hôm nay bạn không vui à?”) (G3, G4).

**Ghi chú kỹ thuật.** Đổi tên hiển thị “Check-in” thành “Mood hôm nay”. Không đổi schema.

**Ngoài phạm vi.** Thêm mood mới.

---

## LD-1.3 Vuốt ve, ôm, tặng tim cho vịt

- Ưu tiên: P0 · Kích thước: M · Release 1
- Phụ thuộc: không

**User story.** Là một người trong cặp, tôi muốn chạm vào vịt và thấy nó phản ứng dễ thương, để có một khoảnh khắc nhỏ dễ chịu mỗi lần mở app.

**Tiêu chí chấp nhận**

1. Vuốt nhẹ trên vịt (kéo con trỏ hoặc ngón tay qua vịt): vịt nhắm mắt, nghiêng đầu.
2. Chạm giữ trên 600 ms: vịt ôm (cánh khép lại, má hồng).
3. Nút tim nhỏ cạnh vịt: tim bay lên từ vịt.
4. Mỗi phản ứng dài tối đa 1,5 giây và không chặn thao tác khác.
5. Chạm liên tục không có giới hạn, không có hình phạt, không có bộ đếm (G2, G3).
6. Tương tác này chỉ diễn ra trên máy người dùng và không lưu. Ngay sau khi ôm, có lựa chọn “Gửi cái ôm này cho [tên]” để tạo dấu chạm (LD-4.1) khi tính năng đó có.
7. Bàn phím: vịt focus được; Enter mở menu Vuốt ve / Ôm / Tặng tim.
8. Reduced motion: chỉ đổi biểu cảm, không có chuyển động.

**Ghi chú kỹ thuật.** Hiện vịt nằm trong lớp DOM có `pointer-events` riêng; cần hit-test vịt không xung đột với kéo xoay bầu trời.

**Ngoài phạm vi.** Đưa đồ vật cho vịt (LD-5.5).

---

## LD-1.4 Vịt lớn dần

- Ưu tiên: P0 · Kích thước: L · Release 1
- Phụ thuộc: không · Câu hỏi: Q2

**User story.** Là một cặp đôi, chúng tôi muốn chú vịt bắt đầu là một vịt nhí và lớn dần theo thời gian chúng tôi ở bên nhau trong app, để thấy chính mối quan hệ của mình đang lớn lên.

**Tiêu chí chấp nhận**

1. Ba giai đoạn: vịt nhí, vịt nhỡ, vịt lớn. Mỗi giai đoạn có hình riêng (tỷ lệ đầu và thân, lông tơ, âm điệu chuyển động) nhưng dùng chung hệ biểu cảm và hoạt động.
2. Giai đoạn tính từ số ngày kể từ khi thành viên thứ hai vào universe, theo múi giờ của cặp. Ngưỡng đề xuất: 0–29 ngày nhí, 30–179 nhỡ, từ 180 lớn (chờ Q2).
3. Giai đoạn không bao giờ lùi, kể cả khi ai đó rời couple rồi quay lại hay đổi ngày bắt đầu quan hệ.
4. Giai đoạn không phụ thuộc số lần mở app, số check-in hay streak (G2, G5).
5. Lần đầu mỗi người mở app sau khi vịt lên giai đoạn mới, có một hoạt ảnh “lớn lên” ngắn và câu “Vịt đã lớn thêm một chút”. Mỗi người thấy đúng một lần.
6. Couple đã có sẵn trước khi tính năng ra mắt nhận giai đoạn đúng với số ngày đã qua, không bắt đầu lại từ vịt nhí.
7. Test: tính giai đoạn ở ngày 0, 29, 30, 179, 180; hoạt ảnh lên giai đoạn không hiện lần thứ hai.

**Ghi chú kỹ thuật.** Giai đoạn là hàm thuần của ngày; không cần cột lưu giai đoạn. Cần lưu “giai đoạn đã xem” theo từng thành viên cho hoạt ảnh một lần. Ngày tham chiếu: `joined_at` của thành viên thứ hai trong `couple_members`.

**Ngoài phạm vi.** Giai đoạn sau “vịt lớn”; tùy biến ngoại hình.

---

## LD-1.5 Vịt chào khi cả hai cùng online

- Ưu tiên: P1 · Kích thước: M · Release 2
- Phụ thuộc: LD-8.1

**User story.** Là một cặp yêu xa, chúng tôi muốn khi cả hai cùng mở app thì vịt vui vẻ chào cả hai, để biết lúc đó người kia cũng đang ở đây.

**Tiêu chí chấp nhận**

1. Khi người thứ hai mở app trong lúc người thứ nhất đang mở, cả hai màn hình thấy vịt vẫy cánh chào và hai chiếc lông nhỏ (đại diện hai người) bay quanh hồ.
2. Lời chào phát tối đa một lần mỗi lần gặp; không lặp nếu một người tải lại trang trong vòng 10 phút.
3. Khi chỉ một người online, không có gì báo “người kia không ở đây” (G6).
4. Ai đã tắt chia sẻ trạng thái (LD-8.1) thì không kích hoạt lời chào và không thấy lời chào.
5. Mỗi lần mở app (kể cả một mình) vịt có một cử chỉ chào nhỏ một lần.

**Ngoài phạm vi.** Hoạt động chung theo thời gian thực.

---

## LD-1.6 Đặt tên cho vịt

- Ưu tiên: P0 · Kích thước: S · Release 1
- Phụ thuộc: không · Câu hỏi: Q10

**User story.** Là một cặp đôi, chúng tôi muốn đặt tên cho chú vịt, để nó thật sự là của riêng chúng tôi.

**Tiêu chí chấp nhận**

1. Tên mặc định là “Vịt”. Một trong hai người đặt tên (1–24 ký tự, chấp nhận tiếng Việt và tiếng Hàn); người kia có thể đổi.
2. Tên hiện ở các câu của vịt (“Mochi đang ngắm sao”) và đồng bộ cho cả hai qua realtime.
3. Lần đầu đặt tên tạo một sự kiện quan hệ để lịch sử ghi lại “Ngày vịt có tên”.
4. Thành viên cặp khác không đọc được tên.

**Ghi chú kỹ thuật.** Một cột trên `universes` (đã có một dòng mỗi cặp) qua hàm private, giống cách lưu cài đặt cặp.

**Ngoài phạm vi.** Lịch sử các lần đổi tên.
