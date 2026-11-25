# PRD — Our Universe: The Little Duck

- Trạng thái: Draft chờ PO xác nhận các câu hỏi mở ở mục 10
- Ngày: 2026-11-25
- Nguồn: [`little-duck-brief.md`](little-duck-brief.md), mã nguồn `main` tại `d618815` và PR [#22](https://github.com/Duc-267/Our-Universe/pull/22) (AI Archivist, chưa merge)
- Story: [`../backlog/README.md`](../backlog/README.md)

## 1. Bối cảnh

Our Universe đã đi hết Phase 0–3 trong `SPEC.md`: hai người cùng một universe, kỷ niệm thành sao, capsule, check-in cảm xúc, Same Moment, quest, chuyến đi thành hành tinh, ngày kỷ niệm thành mặt trăng, chòm sao, memory gravity, cosmic event và future dream. Epic 4.1 (bản tóm tắt archive) đã xong ở PR #22 và migration đã chạy trên database thật.

Brief mới đổi trọng tâm: từ “bản đồ vũ trụ lưu kỷ niệm” sang **cozy game cho hai người yêu xa**, với chú vịt 2D là nhân vật trung tâm sống trong một thế giới nhỏ có nhà, vườn, bầu trời và hành tinh. Phần lớn dữ liệu và luật đã có vẫn dùng được; thứ thay đổi là cách thế giới được trình bày và ba khả năng mới: **thư**, **vườn**, **dấu chạm**.

Người dùng chính là một cặp Việt Nam – Hàn Quốc (UTC+7 và UTC+9).

## 2. Mục tiêu và không phải mục tiêu

### Mục tiêu

1. Mỗi lần mở app có cảm giác được chào đón: thấy vịt đang làm một việc nhỏ hợp với giờ của mình.
2. Có một cách gửi điều gì đó cho người kia mà không phải là chat: thư (gửi ngay hoặc hẹn ngày) và dấu chạm im lặng.
3. Mỗi kỷ niệm làm thế giới thay đổi một cách dễ thấy: một cái cây hoặc bông hoa có thể chạm vào.
4. Vịt lớn lên cùng mối quan hệ, nhưng không bao giờ phụ thuộc vào việc đăng nhập đều đặn.

### Không phải mục tiêu

- Không phải game nuôi thú ảo: vịt không đói, không ốm, không buồn, không chết, không bỏ đi.
- Không phải app chat: không thread, không “đang nhập…”, không gọi thoại hay video.
- Không có điểm số, xếp hạng, streak, phần thưởng điểm danh, hay so sánh ai làm nhiều hơn.
- Không có người chơi thứ ba, không có mạng xã hội.

## 3. Nguyên tắc “không nghĩa vụ” (guardrail)

Mọi story phải đạt các guardrail dưới đây trước khi coi là xong. Mỗi dòng có thể kiểm thử được.

| Mã | Guardrail | Cách kiểm |
|---|---|---|
| G1 | Không trạng thái tiêu cực nào của vịt hay thế giới sinh ra từ việc vắng mặt (đói, buồn, ốm, héo, bụi bặm, bỏ đi). | Đặt đồng hồ hệ thống tới 90 ngày sau lần mở cuối; thế giới và vịt không xấu đi. |
| G2 | Không streak, không đếm ngày liên tiếp, không thưởng điểm danh. | Rà UI và dữ liệu: không có trường hay chuỗi chữ nào đếm ngày liên tiếp. |
| G3 | Không điểm mối quan hệ, không xếp hạng, không so sánh hai người. | Rà chuỗi chữ; không hiện “ai gửi nhiều hơn”. |
| G4 | Thông báo và câu chữ không trách móc (“Vịt nhớ bạn lắm đấy…”, “Đã 5 ngày rồi…”). | Rà chuỗi chữ trước khi merge. |
| G5 | Đồ vật và vùng mới mở khóa từ kỷ niệm hay cột mốc đã xảy ra, không từ tần suất mở app. | Kiểm luật mở khóa trong migration và test. |
| G6 | Không tính năng nào yêu cầu hai người online cùng lúc mới hoàn thành được. Cùng online chỉ thêm niềm vui. | Kịch bản test với một người offline. |
| G7 | Mọi hoạt ảnh tôn trọng `prefers-reduced-motion`. Mọi thao tác trong canvas có đường thay thế bằng bàn phím hoặc danh sách. | Test reduced motion và bàn phím. |
| G8 | Nội dung riêng tư (thư chưa tới hạn, ảnh, voice) bị ẩn ở tầng database (RLS / hàm private), không chỉ ở UI. Thông báo đẩy không chứa nội dung. | Test SQL với vai người nhận trước hạn. |

Lưu ý: vịt rũ xuống khi một người *tự chọn* mood “buồn” (đã có) không vi phạm G1, vì đó là cảm xúc người dùng chủ động chia sẻ, không phải hình phạt.

## 4. Hiện trạng so với brief (gap analysis)

| Brief | Đã có trong code | Khoảng trống |
|---|---|---|
| Vịt 2D trung tâm | SVG vịt vẽ bằng code ở giữa canvas (`universe-scene.tsx`), 7 pose: look, bounce, glide, droop, fidget, rest, lean; nhảy khi có sao mới; bay tim khi check-in | Chưa có hoạt động theo giờ, chưa tương tác trực tiếp, chưa lớn dần, chưa có tên |
| Duck Mood | Check-in 8 mood/ngày/người quyết định pose và tint bầu trời (`features/checkin/weather.ts`) | Chọn mood phải mở panel bên cạnh; biểu cảm còn ít (chủ yếu tư thế) |
| Time & Weather | “Thời tiết” theo mood; bầu trời luôn là đêm | Chưa có sáng/chiều/tối theo giờ thật; chỉ có một múi giờ cho cả cặp (`couple_settings.timezone`) |
| Thế giới có nhà, vườn, hồ | Chỉ có bầu trời quay 3D quanh vịt và một cái hồ nhỏ dưới vịt | Chưa có mặt đất, vườn, nhà, hộp thư |
| Duck Mail | Secret capsule: một tin nhắn khóa tới ngày mở, người kia thấy vật thể nhưng không thấy nội dung | Chưa có thư gửi đích danh, gửi ngay, hộp thư, phản ứng khi mở, lưu thành kỷ vật, ảnh trong thư, voice note |
| Memory Garden | Mỗi kỷ niệm là một sticker sao (`STAR` / `BRIGHT_STAR`) ở quỹ đạo cố định | Chưa có cây/hoa trong vườn |
| Chuyến đi → hành tinh | Có (`PLANET` khi trip được đánh dấu quan trọng) | Chưa “đi thăm” được |
| Kỷ niệm năm → mặt trăng | Có (`MOON` mỗi năm, cosmic event aurora) | — |
| Chòm sao | Có, tạo thủ công | — |
| Promise Stars | Gần nhất là Future Dream (`DISTANT_OBJECT`, hoàn thành thành kỷ niệm) | Chưa có khái niệm lời hứa |
| Silent Touch | Không có | Toàn bộ |
| Cùng mở app thì vịt chào | Realtime chỉ làm mới dữ liệu | Chưa có presence |
| Duck Home | Không có | Toàn bộ |
| Duck Explorer | Chạm hành tinh mở dialog chi tiết | Chưa có chuyến bay, chưa có “chương” |
| Duck Lore | Archive (PR #22) đếm lại lịch sử bằng câu chữ thực tế | Chưa có kỷ vật hay thói quen |
| Thông báo | Không có | Web push cần PWA và service worker |
| Ngôn ngữ | UI tiếng Anh | Cặp Việt – Hàn có thể cần vi / ko |

Phát hiện thêm từ code:

- **Thanh bên dày đặc:** `/universe` hiện xếp khoảng 11 panel (check-in, archive, Same Moment, quest, trip, chòm sao, cosmic event, dream, milestone, danh sách sao, danh sách capsule). Điều này đi ngược nguyên tắc “Discovery over dashboard” của SPEC và cảm giác cozy game. Hướng mới là gom thành điểm vào theo vùng của thế giới (hộp thư, vườn, nhà, bầu trời).
- **Múi giờ:** “hôm nay” của check-in và ngày kỷ niệm đang theo múi giờ của cả cặp. Với hai người ở hai múi giờ, cảnh sáng/tối phải theo giờ của người đang xem.
- **Tài liệu kiến trúc cũ:** SPEC còn ghi React Three Fiber và Cloudflare R2; thực tế là canvas 2D tự viết và Supabase Storage (đã có decision record).

## 5. Mô hình thế giới mục tiêu

Một màn hình chính duy nhất là “thế giới”, chia thành các vùng nằm trong cùng một cảnh:

| Vùng | Chứa gì | Điểm vào cho |
|---|---|---|
| Bầu trời | Mặt trăng kỷ niệm, hành tinh chuyến đi, chòm sao, ngôi sao kỷ niệm quan trọng, dream ở xa, Promise Star, phần thưởng quest, cosmic event | Duck Explorer, chòm sao, dream, lời hứa |
| Hồ | Vịt (nhà của vịt ở ngoài trời), Same Moment | Duck Life, tương tác với vịt |
| Vườn | Cây và hoa từ kỷ niệm | Memory Garden, tạo kỷ niệm |
| Nhà | Mặt tiền ngôi nhà; bên trong là Duck Home (P1) | Duck Home, kỷ vật |
| Hộp thư | Cờ hộp thư bật lên khi có thư | Duck Mail |

Dấu chạm im lặng có thể xuất hiện ở bất kỳ vùng nào (tim trên mặt hồ, ngôi sao sáng trên mái nhà).

### Bảng ánh xạ sự kiện → vật thể (mục tiêu)

| Sự kiện | Vật thể | Trạng thái |
|---|---|---|
| Kỷ niệm | Cây/hoa trong vườn theo danh mục (xem LD-3.1) | Mới |
| Kỷ niệm quan trọng (importance ≥ 8) | Cây lớn hơn, có lấp lánh; vẫn là `BRIGHT_STAR` trên trời | Mở rộng |
| Chuyến đi quan trọng | Hành tinh | Có |
| Ngày kỷ niệm năm | Mặt trăng, đồng thời là cổng vào “chương” của năm đó (P1) | Có / mở rộng |
| Hai kỷ niệm liên quan | Chòm sao | Có |
| Same Moment | Twin stars | Có |
| Lời hứa | Promise Star | Mới (P1) |
| Ước mơ chung | Vật thể ở xa, thành kỷ niệm khi hoàn thành | Có |
| Thư được lưu làm kỷ vật | Đèn lồng giấy trên trời; kệ thư trong nhà khi có Duck Home | Mới |
| Dấu chạm | Dấu vết tạm thời (không phải vật thể vĩnh viễn) | Mới |
| Cột mốc đã xảy ra | Đồ trang trí mới trong nhà (P1) | Mới |
| Chuyến đi / kỷ niệm có kỷ vật | Món đồ (vỏ sò, vé tàu…) trong nhà (P2) | Mới |

## 6. Danh sách tính năng và ưu tiên

| Epic | Ưu tiên brief | Đề xuất của BA | Ghi chú |
|---|---|---|---|
| LD-0 Nền tảng thế giới | — | P0 (enabler) | Vùng thế giới, giờ theo từng người, sáng/chiều/tối, gom thanh bên |
| LD-1 Duck Life | P0 | P0 | Hoạt động nhỏ, mood picker trong cảnh, tương tác, lớn dần, đặt tên |
| LD-2 Duck Mail | P0 | P0 thư chữ; P1 ảnh, voice | Brief yêu cầu “làm thật tốt một kiểu thư trước” |
| LD-3 Memory Garden | P0 | P0; Promise Star P1 | |
| LD-4 Silent Touch | không ghi | **P0** (đề xuất kéo lên) | Nhỏ (một bảng + realtime), phục vụ trực tiếp cặp yêu xa, là điểm khác biệt chính |
| LD-5 Duck Home | P1 | P1 | |
| LD-6 Duck Explorer | P1 | P1 | Tái dùng hành tinh, mặt trăng, chòm sao |
| LD-7 Duck Lore | P2 | P2 | Có thể hấp thụ archive của Epic 4.1 thành “Sổ tay của vịt” |
| LD-8 Hạ tầng trải nghiệm | — | P1 | PWA, web push, presence, đa ngôn ngữ |
| Phase 4 còn lại (4.2–4.6) | — | Later | Monthly Journal có thể thành “thư tháng” vịt bỏ vào hộp thư |

## 7. Kế hoạch release

### Release 1 — “Vịt về nhà” (P0)

Thứ tự trong release theo phụ thuộc:

1. LD-0.1 vùng thế giới, LD-0.2 múi giờ từng người, LD-0.3 sáng/chiều/tối, LD-0.4 gom thanh bên
2. LD-1.1 hoạt động nhỏ, LD-1.2 mood picker trong cảnh, LD-1.3 tương tác, LD-1.4 lớn dần, LD-1.6 đặt tên vịt
3. LD-3.1 vườn kỷ niệm, LD-3.2 vườn mở rộng
4. LD-2.1 thư chữ, LD-2.2 thư hẹn giờ, LD-2.3 hộp thư và mở thư, LD-2.4 lưu thư thành kỷ vật
5. LD-4.1 để lại dấu chạm, LD-4.2 thấy dấu chạm khi quay lại

Tiêu chí thoát: một người mở app thấy vịt đang làm gì đó theo giờ của mình; có thể gửi thư chữ (ngay hoặc hẹn ngày), để lại dấu chạm; mỗi kỷ niệm mới mọc thành cây; vịt có tên và giai đoạn lớn; tất cả guardrail G1–G8 đạt.

### Release 2 — “Ngôi nhà nhỏ” (P1)

LD-2.5 thư có ảnh, LD-2.6 voice note, LD-1.5 chào khi cùng online, LD-3.3 Promise Star, LD-5.x Duck Home, LD-6.x Duck Explorer, LD-8.x PWA / web push / đa ngôn ngữ.

### Release 3 — “Chuyện của vịt” (P2)

LD-7.x kỷ vật, thói quen, sổ tay của vịt; sau đó các mục Later.

## 8. Chỉ số

Chỉ dùng nội bộ, không bao giờ hiện cho người dùng (G3).

| Chỉ số | Định nghĩa | Vì sao |
|---|---|---|
| Kích hoạt | Người dùng gửi thư, dấu chạm hoặc lưu kỷ niệm đầu tiên | Hành động “để lại gì đó” đầu tiên |
| Kích hoạt cặp | Cả hai người đều đã để lại ít nhất một thứ | Thế giới thật sự là của hai người |
| Quay lại tự nguyện | Cặp mở app lại sau D1 / D7 / D30 | Không dùng streak để đo |
| Giá trị cảm xúc | Tỷ lệ mở lại kỷ niệm cũ hơn 30 ngày (giữ từ SPEC) | Giả thuyết cốt lõi của sản phẩm |
| Giá trị của thư | Tỷ lệ thư được lưu thành kỷ vật | Thư có ý nghĩa đủ để giữ |

Hiện app chưa có hạ tầng analytics; cần một quyết định riêng (câu hỏi Q11).

## 9. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Khối lượng hình vẽ: giai đoạn lớn × hoạt động × mood | Trễ release | SVG ghép lớp: thân theo giai đoạn + bộ biểu cảm dùng chung + đạo cụ theo hoạt động. Xem lại Rive/Lottie nếu SVG không đủ. |
| Trượt dần thành game nuôi thú | Phá nguyên tắc sản phẩm | Guardrail G1–G6 là điều kiện merge |
| Vườn hàng trăm cây trên điện thoại | Giật, tốn pin | Gom lô vẽ, chỉ vẽ cây trong khung nhìn, giới hạn hạt; mục tiêu 30+ FPS trên mobile (SPEC §14) |
| Voice note trên iOS Safari | Định dạng khác nhau (`audio/mp4` vs `audio/webm`) | Chấp nhận cả hai MIME, thử trên thiết bị thật |
| Web push trên iOS cần cài PWA (iOS 16.4+) | Thư hẹn giờ “đến” mà không ai biết | Thư vẫn chờ trong hộp thư; push chỉ là phần thêm |
| Lệch múi giờ Việt Nam – Hàn Quốc | Ngày giao thư, sáng/tối sai | Lưu `deliver_at` dạng timestamptz; giờ trong ngày theo múi giờ người xem |
| Rò nội dung thư trước hạn | Mất niềm tin | Tách nội dung ra bảng riêng như `capsule_contents`, RLS chặn tới hạn (G8) |
| Rào cản ngôn ngữ trong cặp | Một người không đọc được UI | Đa ngôn ngữ theo từng người (LD-8.3); dịch nội dung thư nằm ngoài phạm vi |

## 10. Câu hỏi mở cho PO

Mỗi câu có đề xuất mặc định. Story liên quan chỉ được đánh dấu Ready khi câu hỏi của nó đã được trả lời.

| # | Câu hỏi | Đề xuất của BA | Story |
|---|---|---|---|
| Q1 | Kỷ niệm sống ở đâu: **A** vừa là cây trong vườn vừa giữ sao trên trời (chòm sao vẫn chạy), hay **B** chuyển hẳn xuống vườn (chòm sao thành luống hoa)? | **A**: không mất dữ liệu, chòm sao và gravity giữ nguyên; sao trên trời vẽ nhỏ lại để vườn là nơi chính | LD-3.1 |
| Q2 | Vịt lớn theo gì, ngưỡng bao nhiêu? | Theo số ngày kể từ khi cả hai cùng vào universe: 0–29 ngày “vịt nhí”, 30–179 “vịt nhỡ”, từ 180 “vịt lớn”. Không bao giờ lùi. | LD-1.4 |
| Q3 | Thư hẹn giờ có hiện cho người nhận là “đang bay tới” không? | Mặc định hiện phong bì và ngày đến, không hiện nội dung. Người gửi có thể bật “Bất ngờ” để giấu luôn sự tồn tại tới ngày đến. | LD-2.2 |
| Q4 | Người gửi có biết thư hay dấu chạm đã được xem? | Thư: có, hiện lặng lẽ “đã mở” trong danh sách đã gửi, không đẩy thông báo. Dấu chạm: không, để giữ tinh thần không áp lực. | LD-2.3, LD-4.2 |
| Q5 | Capsule và thư hẹn giờ gộp làm một? | Giữ capsule cũ đọc được như bây giờ. Sau LD-2.2, nút “tạo capsule” đổi thành “thư hẹn giờ”. Không chuyển dữ liệu trong Release 1. | LD-2.2 |
| Q6 | Ngôn ngữ giao diện? | vi, ko, en; mỗi người tự chọn | LD-8.3 |
| Q7 | Kéo Silent Touch lên P0? | Có | LD-4.x |
| Q8 | Merge PR #22 (archive) bây giờ? | Có, merge như hiện tại; sau này đưa vào “Sổ tay của vịt” (LD-7.3) | LD-7.3 |
| Q9 | Sáng/chiều/tối theo giờ người xem hay giờ chung của cặp? | Giờ người xem, kèm dòng nhỏ “Ở chỗ người ấy đang 21:10” | LD-0.3 |
| Q10 | Ai đặt tên vịt? | Một trong hai người đặt; người kia có thể đổi; tên mặc định “Vịt” | LD-1.6 |
| Q11 | Có thêm analytics không, công cụ nào? | Chưa thêm trong Release 1; nếu thêm thì chỉ gửi sự kiện ẩn danh, không gửi nội dung | — |

## 11. Phạm vi loại trừ

- Chat thời gian thực, gọi thoại, gọi video
- Dịch tự động nội dung thư
- Thời tiết thật theo vị trí (cần quyền vị trí; mood-weather đã đủ cho Release 1)
- Tùy biến ngoại hình vịt (màu, quần áo); chỉ có tên
- Cửa hàng, tiền ảo, vật phẩm mua bằng tiền
- App native; vẫn là web app, PWA ở Release 2
