# Backlog — The Little Duck

Story cho hướng sản phẩm mới trong [`../product/little-duck-prd.md`](../product/little-duck-prd.md). Mỗi epic nằm trong một file.

## Cách dùng backlog này

Backlog không nằm trong `docs/requirements/` vì gate `pre-push` / `pr-check` từ chối mọi file ở đó còn ô DoD chưa tick. Quy trình:

1. Chọn story đã **Ready** theo thứ tự release.
2. Tạo nhánh riêng từ `main` mới nhất (AGENTS.md).
3. Chép story sang `docs/requirements/<release>-<tên>.md` theo `feature-template.md`. Tiêu chí chấp nhận thành các ô Definition of Done; guardrail liên quan (G1–G8 trong PRD) đi vào Constraints.
4. Làm, tick hết DoD, mở PR vào `main`.
5. Cập nhật cột Trạng thái trong bảng dưới đây ở cùng PR.

## Definition of Ready

- Tiêu chí chấp nhận rõ ràng và test được.
- Câu hỏi mở liên quan (Q1–Q11 trong PRD) đã có câu trả lời.
- Có phác thảo hình (kể cả vẽ tay) cho mọi hình mới của vịt hoặc thế giới.
- Đã xác định thay đổi dữ liệu: bảng, RLS, migration, realtime.

## Definition of Done (bổ sung cho AGENTS.md)

- Guardrail G1–G8 đạt cho phần story chạm tới.
- Migration có RLS và test trong `scripts/test-db-pglite.mjs` lẫn `scripts/test-db.sh` khi có thay đổi database.
- Có đường thay thế bằng bàn phím hoặc danh sách cho thao tác trong canvas; tôn trọng reduced motion.
- Kiểm trên khung 390 px (điện thoại) và desktop.
- `docs/architecture.md` cập nhật khi có quyết định mới; CI xanh trên PR vào `main`.

## Kích thước

S ≈ 1–2 ngày, M ≈ 3–5 ngày, L ≈ 1–2 tuần, XL nên tách nhỏ trước khi làm.

## Danh sách story

| ID | Story | Ưu tiên | Kích thước | Release | Phụ thuộc | Câu hỏi | Trạng thái |
|---|---|---|---|---|---|---|---|
| LD-0.1 | Thế giới nhiều vùng | P0 | L | 1 | — | — | Ready |
| LD-0.2 | Múi giờ của từng người | P0 | M | 1 | — | — | Ready |
| LD-0.3 | Sáng, chiều, tối theo giờ người xem | P0 | M | 1 | LD-0.2 | Q9 | Chờ PO |
| LD-0.4 | Gom thanh bên thành điểm vào theo vùng | P0 | M | 1 | LD-0.1 | — | Ready |
| LD-1.1 | Hoạt động nhỏ của vịt | P0 | L | 1 | LD-0.1, LD-0.3 | — | Ready sau LD-0.3 |
| LD-1.2 | Chọn mood ngay trong cảnh, biểu cảm rõ hơn | P0 | M | 1 | — | — | Ready |
| LD-1.3 | Vuốt ve, ôm, tặng tim cho vịt | P0 | M | 1 | — | — | Ready |
| LD-1.4 | Vịt lớn dần | P0 | L | 1 | — | Q2 | Chờ PO |
| LD-1.5 | Vịt chào khi cả hai cùng online | P1 | M | 2 | LD-8.1 | — | Backlog |
| LD-1.6 | Đặt tên cho vịt | P0 | S | 1 | — | Q10 | Chờ PO |
| LD-2.1 | Viết và gửi thư chữ | P0 | L | 1 | LD-0.1 | — | Ready |
| LD-2.2 | Thư hẹn giờ | P0 | M | 1 | LD-2.1, LD-0.2 | Q3, Q5 | Chờ PO |
| LD-2.3 | Hộp thư và mở thư | P0 | M | 1 | LD-2.1 | Q4 | Chờ PO |
| LD-2.4 | Lưu thư thành kỷ vật | P0 | S | 1 | LD-2.3 | — | Ready |
| LD-2.5 | Thư kèm ảnh | P1 | M | 2 | LD-2.1 | — | Backlog |
| LD-2.6 | Voice note | P1 | L | 2 | LD-2.1 | — | Backlog |
| LD-3.1 | Kỷ niệm mọc thành cây trong vườn | P0 | L | 1 | LD-0.1 | Q1 | Chờ PO |
| LD-3.2 | Vườn mở rộng theo số cây | P0 | M | 1 | LD-3.1 | — | Ready sau LD-3.1 |
| LD-3.3 | Promise Stars | P1 | M | 2 | — | — | Backlog |
| LD-4.1 | Để lại dấu chạm | P0 | M | 1 | LD-0.1 | Q7 | Chờ PO |
| LD-4.2 | Thấy dấu chạm khi quay lại | P0 | M | 1 | LD-4.1 | Q4 | Chờ PO |
| LD-5.1 | Căn phòng chung | P1 | L | 2 | LD-0.1 | — | Backlog |
| LD-5.2 | Đồ trang trí mở khóa từ kỷ niệm | P1 | M | 2 | LD-5.1 | — | Backlog |
| LD-5.3 | Sắp xếp phòng | P1 | M | 2 | LD-5.2 | — | Backlog |
| LD-5.4 | Khung ảnh và kệ thư | P1 | M | 2 | LD-5.1, LD-2.4 | — | Backlog |
| LD-5.5 | Đưa đồ vật cho vịt | P1 | S | 2 | LD-5.2, LD-1.3 | — | Backlog |
| LD-6.1 | Vịt bay tới hành tinh, mặt trăng, chòm sao | P1 | L | 2 | LD-0.1 | — | Backlog |
| LD-6.2 | Chương theo năm | P1 | M | 2 | LD-6.1 | — | Backlog |
| LD-7.1 | Kỷ vật từ chuyến đi và kỷ niệm | P2 | M | 3 | LD-5.1 | — | Backlog |
| LD-7.2 | Thói quen của vịt gắn với lịch sử | P2 | M | 3 | LD-1.1 | — | Backlog |
| LD-7.3 | Sổ tay của vịt | P2 | M | 3 | LD-7.1, PR #22 | Q8 | Backlog |
| LD-8.1 | Presence: biết người kia đang mở app | P1 | S | 2 | — | — | Backlog |
| LD-8.2 | PWA và web push | P1 | L | 2 | LD-2.2 | — | Backlog |
| LD-8.3 | Giao diện vi / ko / en | P1 | L | 2 | — | Q6 | Backlog |

Mục Later (chưa tách story): Monthly Cosmic Journal thành “thư tháng” vịt bỏ vào hộp thư (Epic 4.2), gợi ý tên chòm sao (4.3), Couple Wrapped (4.4), so sánh thế giới đầu năm và cuối năm (4.5), dòng thời gian (4.6), và các ánh xạ chưa làm trong SPEC §6 (crater, binary star, pulsar).

## File theo epic

- [LD-0 Nền tảng thế giới](ld-0-world-foundation.md)
- [LD-1 Duck Life](ld-1-duck-life.md)
- [LD-2 Duck Mail](ld-2-duck-mail.md)
- [LD-3 Memory Garden](ld-3-memory-garden.md)
- [LD-4 Silent Touch](ld-4-silent-touch.md)
- [LD-5 Duck Home](ld-5-duck-home.md)
- [LD-6 Duck Explorer](ld-6-duck-explorer.md)
- [LD-7 Duck Lore & Memories](ld-7-duck-lore.md)
- [LD-8 Hạ tầng trải nghiệm](ld-8-experience-platform.md)
