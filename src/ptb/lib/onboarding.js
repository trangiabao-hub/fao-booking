/** Onboarding album photobooth — kịch bản tour. */

/**
 * Mỗi bước bám vào một `data-ptb-tour` trong editor.
 * Bước không tìm thấy phần tử sẽ tự bị bỏ qua (mobile/desktop render khác nhau).
 *
 * - `advanceOn: "click"` — khách chạm thẳng vào phần tử để đi tiếp, tour không chặn thao tác.
 * - `group` + `dismissSelector` — khi rời khỏi nhóm thì bấm nút đóng trước,
 *   nếu không bảng tùy chỉnh (mobile) sẽ che mất phần tử của bước kế.
 *
 * Hai luồng dùng chung editor nên chỉ khác nhau ở bước cuối (lưu Album so với
 * in thẳng) và ở cách gọi tên tab ảnh — phần còn lại giữ nguyên một kịch bản.
 */
function buildTourSteps({ framesBody, finalStep }) {
  return [
    {
      id: "layout",
      selector: '[data-ptb-tour="layout"]',
      title: "Chọn kiểu ảnh",
      body: "Strip dọc 1×4, lưới 2×2, ảnh đơn 1×1 hoặc 9 ô trắng đen. Đổi lúc nào cũng được, ảnh đã thêm vẫn giữ nguyên.",
    },
    {
      id: "frames",
      selector: '[data-ptb-tour="frames"]',
      title: "Chọn frame bạn thích",
      body: framesBody,
    },
    {
      id: "preview",
      selector: '[data-ptb-tour="preview"]',
      title: "Thêm ảnh vào từng ô",
      body: "Chạm ô trống để tải ảnh lên. Chạm vào ảnh để cắt lại, kéo để dời, chụm hai ngón để phóng to.",
    },
    {
      id: "config",
      selector: '[data-ptb-tour="config"]',
      title: "Tùy chỉnh trước khi in",
      body: "Đây là nơi đổi màu khung, chữ dưới frame và cách in.",
      advanceOn: "click",
      hint: "Chạm thử để mở — tour sẽ giới thiệu tiếp từng mục bên trong.",
    },
    {
      id: "cfg-print",
      group: "config",
      dismissSelector: '[data-ptb-tour="cfg-close"]',
      selector: '[data-ptb-tour="cfg-print"]',
      title: "Kiểu in",
      body: "Trắng đen cho ảnh cổ điển, Không cắt giữ trọn viền frame. Với strip 1×4 còn chọn được in hai frame giống nhau trên một tấm.",
    },
    {
      id: "cfg-color",
      group: "config",
      dismissSelector: '[data-ptb-tour="cfg-close"]',
      selector: '[data-ptb-tour="cfg-color"]',
      title: "Màu khung",
      body: "Ba màu quen thuộc là trắng, đen và xanh rêu. Bấm Khác để lấy đúng màu bạn muốn.",
    },
    {
      id: "cfg-brand",
      group: "config",
      dismissSelector: '[data-ptb-tour="cfg-close"]',
      selector: '[data-ptb-tour="cfg-brand"]',
      title: "Chữ dưới frame",
      body: "Đổi dòng chữ ký ở đáy strip thành tên bạn, tên chuyến đi hay ngày tháng — hoặc ẩn hẳn đi.",
    },
    finalStep,
  ];
}

/** Album chuyến đi: ghép xong lưu vào Album rồi chọn ảnh gửi in. */
export const PTB_TOUR_STEPS = buildTourSteps({
  framesBody:
    "Kho frame theo chủ đề, lọc nhanh theo từng kiểu ảnh. Tab Ảnh của bạn là nơi xem lại các strip đã lưu.",
  finalStep: {
    id: "save",
    selector: '[data-ptb-tour="save"]',
    title: "Lưu rồi gửi in",
    body: "Lưu strip vào Album, chọn ảnh muốn in và gửi cho shop. Shop in sẵn, giao khi bạn trả máy.",
  },
});

/** Link tạm tại shop: không có bước lưu Album, bấm In ngay là vào hàng in. */
export const PTB_INSTANT_TOUR_STEPS = buildTourSteps({
  framesBody:
    "Kho frame theo chủ đề, lọc nhanh theo từng kiểu ảnh. Tab Ảnh của bạn là những ảnh shop vừa tải lên cho bạn.",
  finalStep: {
    id: "print",
    selector: '[data-ptb-tour="save"]',
    title: "Bấm In ngay",
    body: "Ảnh vào thẳng hàng in của shop, không cần lưu Album. Ghép tấm khác rồi in tiếp cũng được.",
  },
});
