/** Quy định thuê máy — nội dung dùng cho trang /quy-dinh-thue-may. */
export const RENTAL_RULES_PATH = "/quy-dinh-thue-may";
export const RENTAL_RULES_UPDATED = "19/08/2026";

export const rentalRulesSections = [
  {
    id: "dieu-kien-thue",
    title: "Điều kiện thuê máy",
    summary:
      "Vài điều kiện cơ bản giúp shop giữ máy an toàn và giữ giá thuê tốt cho khách iu.",
    items: [
      {
        text: "FAO cho thuê với khách từ 16 tuổi trở lên. Khách dưới 16 tuổi cần sự cho phép và bảo đảm của phụ huynh.",
      },
      {
        text: "Shop không giao dịch với acc clone, khách iu vui lòng dùng acc chính để thuê. Nếu không có acc chính hoặc acc chính chưa đủ legit, shop nhận cọc 10 – 20 triệu tuỳ dòng máy.",
      },
      {
        text: "Thuê từ 2 máy trở lên: mỗi máy cần 1 CCCD chính chủ. Không áp dụng cho phụ kiện như lens, flash, tripod…",
      },
    ],
  },
  {
    id: "nhan-tra-may",
    title: "Nhận máy, trả máy và trả trễ",
    summary:
      "Máy của shop thường có khách nối lịch ngay sau bạn, nên giờ trả là phần shop cần khách iu giữ đúng nhất.",
    items: [
      {
        text: "Khách iu có thể nhận máy sớm hơn giờ hẹn nếu chưa có khách trước đang thuê — cứ nhắn shop trước để check giúp.",
      },
      {
        text: "Trả máy đúng giờ đã đặt. Nếu biết sẽ trả trễ, khách vui lòng báo shop trước để shop kịp sắp lịch, không ảnh hưởng khách sau.",
      },
      {
        text: "Trả trễ làm ảnh hưởng lịch khách sau: shop xin phụ thu 100% giá trị lịch thuê của khách sau.",
        emphasis: true,
      },
    ],
  },
  {
    id: "huy-doi-lich",
    title: "Huỷ lịch và dời lịch",
    summary:
      "Lịch đã đặt là shop đã giữ máy riêng cho bạn và từ chối khách khác, nên mong khách iu báo sớm khi có thay đổi.",
    items: [
      {
        text: "Dời lịch: shop hỗ trợ dời 1 lần khi khách báo trước 3 ngày.",
      },
      {
        text: "Huỷ lịch báo trước từ 7 ngày: shop hoàn lại 80%.",
      },
      {
        text: "Huỷ lịch báo trước từ 4 đến dưới 7 ngày: shop hoàn lại 50%.",
      },
      {
        text: "Huỷ gấp, tức dưới 4 ngày trước giờ nhận máy: shop không hoàn tiền.",
        emphasis: true,
      },
    ],
  },
];
