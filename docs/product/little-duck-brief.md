# Brief gốc — Our Universe: The Little Duck

Bản đề xuất sản phẩm nhận ngày 2026-11-25. Nội dung giữ nguyên để đối chiếu; chỉ định dạng lại thành markdown (danh sách feature chuyển thành bảng). Phân tích và quyết định nằm ở [`little-duck-prd.md`](little-duck-prd.md); story nằm ở [`../backlog/README.md`](../backlog/README.md).

---

Mình đề xuất phát triển Our Universe thành một cozy game dành riêng cho hai người yêu xa, trong đó một chú vịt 2D dễ thương là nhân vật trung tâm. Vũ trụ không còn chỉ là nơi lưu trữ kỷ niệm, mà trở thành một thế giới nhỏ mà hai người cùng chăm sóc và khám phá.

## 1. Core concept

“A little universe that grows with us.”

Hai người cùng chia sẻ một chú vịt. Chú sống trong một thế giới nhỏ, có căn nhà, khu vườn, bầu trời và những hành tinh để khám phá.

- Khi một người gửi lời nhắn, chú vịt có thể mang thư đến một chiếc hộp thư.
- Khi hai người lưu một kỷ niệm, thế giới xuất hiện một vật thể mới.
- Khi cả hai cùng trải qua một cột mốc, một khu vực hoặc hoạt ảnh đặc biệt được mở khóa.
- Khi một người nhớ người kia, họ có thể để lại một dấu hiệu nhỏ trong thế giới chung.
- Khi cả hai cùng mở ứng dụng, chú vịt có thể vui vẻ chào đón hai người.

Điểm quan trọng: đây không phải game để chăm sóc vịt theo kiểu nghĩa vụ. Vịt không chết, không bị bỏ đói, không buồn vì người dùng không đăng nhập. Thế giới phát triển nhờ những khoảnh khắc hai người muốn lưu lại, chứ không phải nhờ chuỗi đăng nhập mỗi ngày.

## 2. Gameplay loop: vòng lặp trải nghiệm

Gameplay nên ngắn, nhẹ nhàng, có cảm giác được chào đón mỗi lần mở app. Không cần nhiệm vụ dày đặc hay hệ thống điểm số.

1. Come back to your universe — Mở app và thấy chú vịt đang làm gì đó: ngủ, ngắm sao, đọc thư hoặc chơi bên hồ.
2. Leave something behind — Gửi lời nhắn, ảnh, voice note, tâm trạng hoặc một điều nhỏ muốn kể cho người kia.
3. Watch the world change — Thư xuất hiện trong hộp thư, kỷ niệm biến thành hoa, và những dấu mốc tạo ra vật thể mới.

### A. Duck Life — cuộc sống của chú vịt

Trải nghiệm hằng ngày

- Duck Mood: người dùng chọn cảm xúc; vịt thay đổi biểu cảm, tư thế và chuyển động.
- Tiny Activities: ngủ trưa, ngắm trăng, đọc sách, tưới cây, ngồi chờ bên cửa sổ.
- Duck Interactions: vuốt ve, ôm, tặng tim, đưa đồ vật cho vịt.
- Time & Weather: buổi sáng, chiều, đêm và thời tiết tạo nên những khung cảnh khác nhau.
- Grow: từ những ngày đầu có thể là 1 con vịt nhí nhảnh như trẻ con, sau đó trưởng thành dần

Mục tiêu: tạo cảm giác thân thuộc, không biến thành game mô phỏng cần chăm sóc liên tục.

### B. Duck Mail — giao tiếp giữa hai người

Tính năng cảm xúc cốt lõi

- Gửi tin nhắn ngắn, ảnh hoặc voice note.
- Đặt thời gian mở thư: ngay lập tức, ngày kỷ niệm hoặc một ngày trong tương lai.
- Chú vịt mang thư đến hộp thư chung.
- Khi người nhận mở thư, vịt có phản ứng dễ thương và một hoạt ảnh nhỏ xuất hiện.
- Lưu thư yêu thích thành kỷ vật trong vũ trụ.

Mục tiêu: biến một hành động giao tiếp quen thuộc thành trải nghiệm riêng của hai người.

### C. Memory Universe — thế giới của hai người

Giá trị tích lũy lâu dài

- Kỷ niệm biến thành hoa, cây, ngôi sao hoặc vật trang trí.
- Chuyến đi biến thành hành tinh để khám phá.
- Ngày kỷ niệm tạo ra mặt trăng hoặc vật thể đặc biệt.
- Những lời hứa trở thành Promise Stars.
- Hai kỷ niệm liên quan tạo thành chòm sao.
- Chạm vào vật thể để xem lại ảnh, câu chuyện và ngày tháng.

Mục tiêu: sau nhiều tháng, thế giới trở thành một bản lưu trữ tình yêu có thể tương tác.

## 5. Các feature nên phát triển

Thứ tự ưu tiên từ trái sang phải theo giai đoạn triển khai.

| Feature | Ưu tiên | Mô tả |
|---|---|---|
| Duck Mood & Animation | P0 | Một chú vịt với vài trạng thái, animation idle, ngủ, vui vẻ, ngắm sao và phản ứng khi được tương tác. Đây là nền tảng của toàn bộ trải nghiệm. Ngoài ra cần có thêm việc con vịt lớn dần theo thời gian. |
| Duck Mail | P0 | Tin nhắn riêng tư, ảnh, voice note và thư hẹn giờ. Nên làm thật tốt một kiểu thư trước khi mở rộng nhiều định dạng. |
| Memory Garden | P0 | Kỷ niệm được lưu lại sẽ tạo ra một bông hoa hay vật thể nhỏ có thể chạm để xem lại. Đây là cách đơn giản nhất để khiến thế giới có ý nghĩa cá nhân. |
| Duck Home | P1 | Một căn phòng chung để đặt ảnh, thư, đồ trang trí và các kỷ vật. Đồ mới được mở khóa từ kỷ niệm, không phải bằng điểm danh. |
| Duck Explorer | P1 | Chú vịt đi khám phá những ngôi sao và hành tinh, mỗi nơi chứa một chủ đề hoặc một giai đoạn trong mối quan hệ. |
| Duck Lore & Memories | P2 | Chú vịt có những vật dụng và thói quen gắn với lịch sử của hai người. Ví dụ, sau một chuyến đi biển, có thể xuất hiện một chiếc vỏ sò trong căn phòng. |

### Một feature tạo khác biệt: Silent Touch

Khi một người mở app, họ có thể để lại một dấu chạm nhỏ trong thế giới chung: một trái tim, một cái ôm hoặc một ngôi sao phát sáng. Người kia nhìn thấy dấu vết đó khi quay lại.

Không bắt buộc trả lời, không tạo áp lực phải online cùng lúc. Với yêu xa Việt Nam–Hàn Quốc, đây có thể là cách biểu đạt sự hiện diện mà không cần bắt đầu một cuộc trò chuyện dài.
