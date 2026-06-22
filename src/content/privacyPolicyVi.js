/** Nội dung chính sách quyền riêng tư — dùng cho SPA và trang HTML tĩnh (Meta App Review). */
export const PRIVACY_POLICY_PATH = "/chinh-sach-quyen-rieng-tu";
export const PRIVACY_POLICY_CANONICAL = "https://faocamera.vn/chinh-sach-quyen-rieng-tu";
export const PRIVACY_POLICY_UPDATED = "23/06/2026";

export const privacyPolicySections = [
  {
    title: "1. Phạm vi áp dụng",
    paragraphs: [
      "Chính sách này mô tả cách FAO Sài Gòn — Cho thuê máy ảnh (\"FAO\", \"chúng tôi\") thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân khi bạn sử dụng website faocamera.vn, ứng dụng đặt thuê thiết bị, tài khoản thành viên, Facebook Page/Messenger của FAO và ứng dụng Meta \"Demo chat\" do FAO vận hành để hỗ trợ đặt thuê và chăm sóc khách hàng.",
      "Bằng việc sử dụng dịch vụ hoặc đăng nhập qua Facebook/Google, bạn xác nhận đã đọc và đồng ý với chính sách này.",
    ],
  },
  {
    title: "2. Đơn vị quản lý dữ liệu",
    paragraphs: [
      "Tên thương hiệu: FAO Sài Gòn — Cho thuê máy ảnh",
      "Website: https://faocamera.vn",
      "Email liên hệ: giabaotran912@gmail.com",
      "Hotline / Zalo: 0901 355 198",
      "Chi nhánh: Lầu 1, 475 Huỳnh Văn Bánh, Phú Nhuận, TP.HCM và chi nhánh Thủ Đức (theo thông tin trên website).",
    ],
  },
  {
    title: "3. Dữ liệu chúng tôi thu thập",
    paragraphs: [
      "Thông tin bạn cung cấp trực tiếp: họ tên, số điện thoại, email, Facebook/Instagram (nếu có), thông tin đơn thuê (máy, ngày nhận/trả, chi nhánh, ghi chú), ảnh CMND/CCCD hoặc tài liệu liên quan khi ký hợp đồng thuê (nếu shop yêu cầu theo quy trình nội bộ).",
      "Thông tin từ đăng nhập Facebook/Google (khi bạn chọn): ID tài khoản, tên hiển thị, ảnh đại diện, email (nếu bạn cấp quyền) — theo phạm vi quyền bạn đồng ý trên màn hình Meta/Google.",
      "Dữ liệu Messenger: Page-scoped ID (PSID), tên hiển thị trên inbox, lịch sử tin nhắn với Page FAO — để trả lời tư vấn, xác nhận đơn và gửi nhắc nhận/trả máy theo lịch thuê.",
      "Dữ liệu kỹ thuật: cookie, địa chỉ IP, loại trình duyệt, trang đã xem, mã tham chiếu marketing (UTM) — phục vụ vận hành website, phân tích lượt truy cập và cải thiện dịch vụ.",
    ],
  },
  {
    title: "4. Mục đích sử dụng",
    paragraphs: [
      "Xử lý đơn thuê máy ảnh, thanh toán, giao/nhận thiết bị và hỗ trợ sau thuê.",
      "Liên hệ qua Messenger, Zalo, điện thoại hoặc email về lịch thuê, cọc, gia hạn, nhắc trả máy và thông báo liên quan đến đơn hàng (utility/transactional — không gửi quảng cáo không liên quan).",
      "Quản lý tài khoản thành viên, điểm tích lũy và lịch sử đơn.",
      "Phòng chống gian lận, tranh chấp thiết bị và tuân thủ hợp đồng thuê.",
      "Cải thiện website, đo hiệu quả kênh SEO/blog (dữ liệu tổng hợp, không bán cho bên thứ ba).",
    ],
  },
  {
    title: "5. Facebook / Meta",
    paragraphs: [
      "FAO sử dụng Meta Platform (Facebook Login, Messenger API, Page token) qua ứng dụng \"Demo chat\". Dữ liệu nhận từ Meta được xử lý theo chính sách này và Chính sách dữ liệu của Meta (facebook.com/privacy/policy).",
      "Chúng tôi chỉ yêu cầu quyền cần thiết cho hoạt động hỗ trợ khách (ví dụ: pages_messaging, pages_utility_messaging) và không bán dữ liệu Messenger cho bên thứ ba.",
      "Bạn có thể ngắt kết nối bằng cách gỡ quyền ứng dụng trong cài đặt Facebook hoặc nhắn Page FAO yêu cầu xóa dữ liệu liên quan (trong phạm vi pháp luật cho phép).",
    ],
    link: {
      label: "Chính sách dữ liệu Meta",
      href: "https://www.facebook.com/privacy/policy/",
    },
  },
  {
    title: "6. Chia sẻ dữ liệu",
    paragraphs: [
      "Chúng tôi có thể chia sẻ dữ liệu với: nhà cung cấp hosting, cổng thanh toán (PayOS), email/SMS, Meta (khi bạn tương tác qua Facebook) — chỉ mức cần thiết để vận hành dịch vụ.",
      "Có thể tiết lộ khi luật pháp Việt Nam yêu cầu hoặc để bảo vệ quyền lợi hợp pháp của FAO và khách hàng.",
      "Chúng tôi không bán danh sách khách hàng cho bên thứ ba vì mục đích marketing của họ.",
    ],
  },
  {
    title: "7. Lưu trữ và bảo mật",
    paragraphs: [
      "Dữ liệu đơn thuê và tài khoản được lưu trên máy chủ bảo mật; thời gian lưu phù hợp với nghĩa vụ kế toán, giải quyết tranh chấp và quy định pháp luật (thông thường tối đa vài năm sau khi hoàn tất giao dịch, trừ khi pháp luật yêu cầu lâu hơn).",
      "Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức hợp lý (phân quyền nội bộ, mật khẩu, HTTPS). Không hệ thống nào an toàn tuyệt đối; nếu phát hiện sự cố, chúng tôi sẽ thông báo theo quy định hiện hành.",
    ],
  },
  {
    title: "8. Quyền của bạn",
    paragraphs: [
      "Yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân (trong phạm vi pháp luật).",
      "Rút lại đồng ý marketing (nếu có) mà không ảnh hưởng xử lý đơn đang thực hiện.",
      "Khiếu nại tới cơ quan quản lý nhà nước có thẩm quyền nếu cho rằng quyền riêng tư bị vi phạm.",
      "Liên hệ: giabaotran912@gmail.com hoặc hotline 0901 355 198 — chúng tôi phản hồi trong thời gian hợp lý.",
    ],
  },
  {
    title: "9. Trẻ em",
    paragraphs: [
      "Dịch vụ hướng tới khách hàng từ 18 tuổi trở lên hoặc có sự đồng ý của phụ huynh/người giám hộ khi thuê thiết bị. Chúng tôi không cố ý thu thập dữ liệu trẻ em dưới 13 tuổi.",
    ],
  },
  {
    title: "10. Cập nhật chính sách",
    paragraphs: [
      "Chúng tôi có thể cập nhật chính sách này; phiên bản mới có ngày hiệu lực tại đầu trang. Việc tiếp tục sử dụng dịch vụ sau khi cập nhật được hiểu là bạn chấp nhận thay đổi (trừ khi pháp luật yêu cầu đồng ý riêng).",
    ],
  },
];
