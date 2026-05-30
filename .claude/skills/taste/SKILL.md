---
name: taste
description: Đánh giá "gu thẩm mỹ" (visual taste) của các trang web trong project — review thiết kế, UI/UX, layout, typography, màu sắc, spacing, responsive và độ chỉn chu thị giác. Dùng khi user muốn "review thẩm mỹ", "check UI", "trang này nhìn ổn chưa", "góp ý thiết kế", "đánh giá gu", hoặc trước khi publish một trang HTML mới.
---

# Taste — Review thẩm mỹ & UI

Mục tiêu: đánh giá một trang (hoặc diff thay đổi) dưới góc nhìn **thẩm mỹ và trải nghiệm thị giác**, không phải bug logic. Đây là project cho thuê máy ảnh (tiếng Việt), output là HTML tĩnh trong `public/`, nguồn ở `src/` + `components/` + `pages/`. Đối tượng người dùng là khách thuê máy ảnh trên mobile là chủ yếu.

## Khi nào dùng
- User hỏi về giao diện/thiết kế/"gu"/"nhìn có đẹp không".
- Trước khi đẩy một landing page sản phẩm mới (vd `public/thue-may-anh-*`).
- Sau khi sửa CSS/layout và muốn xác nhận nhìn vẫn chỉn chu.

## Quy trình

1. **Xác định phạm vi.** Nếu user chỉ một trang/file cụ thể thì review đúng nó. Nếu nói chung chung, ưu tiên file đang mở trong IDE hoặc diff hiện tại (`git diff`). Với landing sản phẩm, các file nằm ở `public/thue-may-anh-*/index.html`.

2. **Đọc thực thể.** Mở file HTML/CSS liên quan. Nếu có thể, render thực tế (mở bằng skill `run`/`verify` hoặc chụp màn hình) để nhận xét bằng mắt thay vì chỉ đọc code — taste là về cái nhìn thấy.

3. **Chấm theo 7 trục dưới đây.** Mỗi trục cho 1 nhận xét ngắn + mức độ (✅ ổn / ⚠️ nên sửa / ❌ lỗi rõ). Chỉ nêu điều có căn cứ thị giác, không bịa.

4. **Trả về:** (a) 3–5 điểm mạnh, (b) danh sách vấn đề xếp theo độ ưu tiên kèm fix cụ thể (selector/giá trị đề xuất), (c) nếu user đồng ý thì áp dụng sửa.

## 7 trục đánh giá

1. **Hệ thống thị giác (consistency)** — màu, font, bo góc, bóng đổ, button có nhất quán giữa các trang/section không? Có dùng đúng màu thương hiệu không?
2. **Typography** — phân cấp tiêu đề rõ ràng (h1>h2>body)? Line-height đủ thở (~1.5 cho body)? Font tiếng Việt hiển thị đủ dấu, không lỗi font? Cỡ chữ mobile ≥ 15–16px?
3. **Spacing & layout** — khoảng cách đều, có nhịp (4/8px scale)? Không bị dồn cục hay trống huơ? Căn lề nhất quán? Width nội dung không quá dài (≤ ~70ch cho đoạn text).
4. **Màu & tương phản** — đạt WCAG AA (text thường ≥ 4.5:1)? Màu nhấn dùng tiết chế, đúng chỗ CTA? Không chói/lệch tông.
5. **Hình ảnh** — ảnh máy ảnh sắc nét, tỉ lệ đồng nhất, có `alt`, không méo (object-fit), không nặng quá (lazy-load)?
6. **CTA & chuyển đổi** — nút "Thuê ngay"/"Đặt lịch"/liên hệ nổi bật, dễ bấm trên mobile (≥44px), vị trí hợp lý? Hành động chính rõ ràng.
7. **Responsive & mobile** — bố cục không vỡ ở 360–414px, không tràn ngang (overflow-x), tap target đủ to, ảnh và bảng co giãn tốt.

## Nguyên tắc
- **Cụ thể, hành động được.** "Tăng `line-height` đoạn mô tả từ 1.2 → 1.6" tốt hơn "chữ hơi chật".
- **Ưu tiên mobile** — phần lớn khách vào từ điện thoại.
- **Tôn trọng brand hiện có.** Đề xuất tinh chỉnh trong hệ thống sẵn có, đừng thay toàn bộ phong cách trừ khi user yêu cầu.
- **Phân biệt rõ** "lỗi" (vỡ layout, không đọc được) với "khẩu vị" (gợi ý chủ quan) — gắn nhãn để user biết cái nào nên ưu tiên.
