/**
 * Bài viết blog — sinh HTML tĩnh tại /<slug>/ (cùng pattern trang SEO).
 * sections: { type: "p"|"h2"|"ul", text?, items? }
 * image / imageAlt — thumbnail, hero, og:image (đường dẫn trong public/)
 */
export const DEFAULT_BLOG_IMAGE = "/og-image.png";

export const BLOG_POSTS = [
  {
    slug: "thue-may-anh-chup-ky-yeu-sinh-vien-nen-thue-gi",
    title: "Thuê máy ảnh chụp kỷ yếu: Đừng thuê bừa nếu không muốn ảnh lớp nhìn như camera trường học",
    description:
      "Kinh nghiệm thuê máy ảnh chụp kỷ yếu cho sinh viên. Gợi ý Canon, Fujifilm và lens dễ chụp cho người không chuyên tại TP.HCM.",
    excerpt:
      "Rất nhiều lớp thuê đúng máy nhưng vẫn ra ảnh xấu. Lý do thường không nằm ở body máy… mà nằm ở lens và cách chọn concept.",
    date: "2026-05-28",
    category: "Kỷ yếu",
    readMinutes: 6,
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1974&auto=format&fit=crop",
    imageAlt:
      "Sinh viên thuê máy ảnh chụp kỷ yếu ngoài trời tại TP.HCM",
    sections: [
      {
        type: "p",
        text:
          "Sai lầm phổ biến nhất mùa kỷ yếu: thuê máy nhìn thật pro nhưng cầm không nổi sau 30 phút."
      },
      {
        type: "p",
        text:
          "Nhiều lớp còn thuê lens tele chỉ vì thấy xóa phông đẹp. Tới lúc chụp tập thể thì phải đứng xa gần hết sân trường mới lấy đủ người."
      },
      {
        type: "h2",
        text: "Sinh viên nên thuê máy nào cho dễ chụp nhất?"
      },
      {
        type: "ul",
        items: [
          "Canon R50: Dễ dùng, màu da sáng, hợp chụp áo dài và chân dung.",
          "Fujifilm X-T30 II: Chụp ra màu film chill sẵn, hợp concept thanh xuân vintage.",
          "Canon G7X III: Nhỏ gọn, ai cũng biết bấm, cực hợp team không rành máy ảnh."
        ]
      },
      {
        type: "p",
        text:
          "Nếu lớp đông, ưu tiên lens góc rộng hoặc lens kit. Đừng cố thuê lens quá xịn nếu không biết dùng."
      },
      {
        type: "h2",
        text: "Kỷ yếu đẹp không nằm ở máy quá đắt"
      },
      {
        type: "p",
        text:
          "Thật ra thứ quyết định vibe bộ ảnh là ánh sáng, outfit và màu ảnh. Fuji đang được sinh viên thuê cực nhiều vì ảnh JPEG ra khỏi máy đã có vibe điện ảnh nhẹ nhẹ rồi."
      },
      {
        type: "p",
        text:
          "Một tip khá đáng tiền: hãy chụp lúc 4h chiều trở đi. Ánh nắng mềm hơn rất nhiều, da lên đẹp hơn hẳn chụp giữa trưa." 
      }
    ],
    relatedSeoSlugs: [
      "thue-may-anh-chup-ao-dai",
      "thue-may-anh-sinh-vien-tphcm"
    ],
    relatedBlogSlugs: [
      "kinh-nghiem-thue-may-anh-lan-dau",
      "fujifilm-film-simulation"
    ],
    ctaLink: "/catalog",
    ctaLabel: "Xem máy ảnh chụp kỷ yếu"
  },

  {
    slug: "thue-may-anh-di-bien-song-ao",
    title: "Đi biển mà thuê máy nặng là xác định mỏi vai từ ngày đầu tiên",
    description:
      "Top máy ảnh nhỏ gọn đi biển đẹp cho Gen Z: Fujifilm, G7X, DJI Pocket 3. Kèm tips chống cát và nước biển thực tế.",
    excerpt:
      "Mang DSLR to đùng ra biển nghe thì ngầu. Nhưng tới ngày thứ 2 là chỉ muốn bỏ luôn máy ở khách sạn.",
    date: "2026-05-29",
    category: "Du lịch",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2070&auto=format&fit=crop",
    imageAlt:
      "Du lịch biển với máy ảnh compact nhỏ gọn",
    sections: [
      {
        type: "p",
        text:
          "Đi biển cần nhất là máy nhẹ. Chứ không phải máy nhìn chuyên nghiệp."
      },
      {
        type: "p",
        text:
          "Đa số khách thuê lần đầu đều bị cuốn theo kiểu: máy càng to càng đẹp. Và rồi họ dành cả chuyến đi để… đeo máy cho đau vai."
      },
      {
        type: "h2",
        text: "3 dòng máy đang được thuê nhiều nhất mùa hè"
      },
      {
        type: "ul",
        items: [
          "Canon G7X III: Màu da đẹp cực mạnh, bật flash lên là đúng vibe Hongkong Y2K.",
          "DJI Pocket 3: Quay vlog chống rung gần như vô đối.",
          "Fujifilm X100V: Chụp cafe, hoàng hôn, bikini đều ra vibe điện ảnh." 
        ]
      },
      {
        type: "h2",
        text: "Cảnh báo: Cát biển phá máy nhanh hơn bạn nghĩ"
      },
      {
        type: "ul",
        items: [
          "Đừng thay lens ngoài bãi biển.",
          "Đừng để tay dính kem chống nắng cầm vào máy.",
          "Chụp xong nhớ lau body liền vì hơi muối dễ làm oxy hóa." 
        ]
      },
      {
        type: "p",
        text:
          "Nếu chỉ muốn có ảnh đẹp up Instagram và vài reel chill chill thì compact hoặc Pocket 3 là quá đủ rồi." 
      }
    ],
    relatedSeoSlugs: [
      "thue-may-anh-du-lich",
      "thue-pocket-3-tphcm"
    ],
    relatedBlogSlugs: [
      "bao-quan-may-anh-mua-mua",
      "top-may-anh-vlog-2026"
    ],
    ctaLink: "/catalog?tag=du-lich",
    ctaLabel: "Xem máy đi biển hot nhất"
  },

  {
    slug: "fujifilm-song-ao-da-lat",
    title: "Vì sao hội đi Đà Lạt giờ toàn thuê Fujifilm thay vì DSLR?",
    description:
      "Review Fujifilm cho người không chuyên đi Đà Lạt, cafe, du lịch. Dòng máy được Gen Z thuê nhiều nhất vì ảnh ra sẵn vibe film.",
    excerpt:
      "Fuji đúng kiểu máy dành cho người lười chỉnh ảnh nhưng vẫn muốn Instagram nhìn như travel blogger Nhật Bản.",
    date: "2026-05-27",
    category: "Review",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070&auto=format&fit=crop",
    imageAlt:
      "Máy ảnh Fujifilm vintage chụp cafe và du lịch Đà Lạt",
    sections: [
      {
        type: "p",
        text:
          "Có một sự thật là rất nhiều người thuê Fuji không hề biết chỉnh Lightroom."
      },
      {
        type: "p",
        text:
          "Họ chỉ cần giơ máy lên. Bấm. Và ảnh đã có vibe rồi." 
      },
      {
        type: "h2",
        text: "Điểm ăn tiền nhất của Fujifilm"
      },
      {
        type: "p",
        text:
          "Film Simulation. Hiểu đơn giản là màu film được set sẵn trong máy. Chụp xong gửi AirDrop qua điện thoại là đăng được luôn." 
      },
      {
        type: "ul",
        items: [
          "Classic Chrome: Vibe đường phố Nhật.",
          "Nostalgic Neg: Hợp hoàng hôn và cafe vintage.",
          "Astia: Chụp người cực nịnh da." 
        ]
      },
      {
        type: "h2",
        text: "Ai nên thuê Fuji?"
      },
      {
        type: "ul",
        items: [
          "Người thích sống ảo nhưng lười edit.",
          "Team Đà Lạt, cafe, picnic.",
          "Người thích vibe điện ảnh kiểu Hàn Quốc." 
        ]
      },
      {
        type: "p",
        text:
          "Fuji không phải máy mạnh nhất. Nhưng chắc chắn là một trong những dòng máy khiến người ta muốn chụp ảnh nhiều hơn." 
      }
    ],
    relatedSeoSlugs: [
      "thue-fujifilm-tphcm",
      "thue-may-anh-di-da-lat"
    ],
    relatedBlogSlugs: [
      "thue-may-anh-du-lich-he",
      "kinh-nghiem-thue-may-anh-lan-dau"
    ],
    ctaLink: "/catalog?category=fuji",
    ctaLabel: "Xem máy Fujifilm đang hot"
  },

  {
    slug: "thue-pocket-3-quay-vlog",
    title: "DJI Pocket 3 đang là 'vũ khí bí mật' của hội TikTok du lịch",
    description:
      "Review DJI Pocket 3 cho vlog du lịch, TikTok, cafe, food review. Nhỏ gọn, chống rung mạnh, cực dễ dùng cho người mới.",
    excerpt:
      "Pocket 3 nhỏ hơn bạn nghĩ rất nhiều. Nhưng chất lượng video thì đủ làm nhiều người bỏ luôn máy ảnh to.",
    date: "2026-05-26",
    category: "Vlog",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2070&auto=format&fit=crop",
    imageAlt:
      "DJI Pocket 3 quay vlog du lịch và TikTok",
    sections: [
      {
        type: "p",
        text:
          "Có những đứa đi du lịch chỉ cần 2 thứ: điện thoại và Pocket 3."
      },
      {
        type: "p",
        text:
          "Nhỏ. Nhanh. Chống rung cực mạnh. Và gần như không cần biết gì về máy ảnh vẫn quay đẹp." 
      },
      {
        type: "h2",
        text: "Vì sao Pocket 3 hot dữ vậy?"
      },
      {
        type: "ul",
        items: [
          "Chống rung gimbal vật lý rất mượt.",
          "Màn hình xoay dọc quay TikTok cực tiện.",
          "Lowlight tốt hơn điện thoại khá nhiều.",
          "Bỏ túi quần được." 
        ]
      },
      {
        type: "h2",
        text: "Pocket 3 hợp ai nhất?"
      },
      {
        type: "ul",
        items: [
          "Người quay daily vlog.",
          "Food reviewer.",
          "Người đi du lịch không thích vác đồ nặng.",
          "Creator mới tập làm content." 
        ]
      },
      {
        type: "p",
        text:
          "Rất nhiều khách thuê Pocket 3 xong quay nghiện luôn vì nó tiện kiểu cầm lên là dùng được ngay." 
      }
    ],
    relatedSeoSlugs: [
      "thue-pocket-3",
      "thue-may-quay-vlog"
    ],
    relatedBlogSlugs: [
      "top-may-anh-vlog-tiktok-2026",
      "thue-may-anh-di-bien-song-ao"
    ],
    ctaLink: "/catalog?category=vlog",
    ctaLabel: "Xem DJI Pocket 3"
  },

  {
    slug: "thue-may-anh-lan-dau-can-biet-gi",
    title: "Lần đầu thuê máy ảnh: Đừng ký hợp đồng nếu chưa check 5 thứ này",
    description:
      "Checklist thuê máy ảnh cho người mới tại TP.HCM. Tips kiểm tra body, lens, pin và thẻ nhớ trước khi nhận máy.",
    excerpt:
      "Nhiều người thuê máy xong tới nơi mới phát hiện pin yếu, thẻ lỗi hoặc không biết quay kiểu gì.",
    date: "2026-05-25",
    category: "Tips",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=2070&auto=format&fit=crop",
    imageAlt:
      "Người mới thuê máy ảnh lần đầu tại Sài Gòn",
    sections: [
      {
        type: "p",
        text:
          "Thuê máy ảnh không đáng sợ như nhiều người nghĩ. Nhưng vẫn có vài thứ bắt buộc phải check trước khi rời shop." 
      },
      {
        type: "h2",
        text: "Checklist cực quan trọng"
      },
      {
        type: "ul",
        items: [
          "Chụp thử vài tấm ngay tại shop.",
          "Check màn hình cảm ứng và autofocus.",
          "Xem pin còn tốt không.",
          "Kiểm tra thẻ nhớ có lỗi không.",
          "Chụp tình trạng body trước khi nhận." 
        ]
      },
      {
        type: "p",
        text:
          "Nếu không biết dùng máy, cứ nhờ nhân viên set Auto sẵn. Người mới không cần cố học manual ngay chuyến đầu." 
      },
      {
        type: "h2",
        text: "Người mới nên thuê máy nào?"
      },
      {
        type: "ul",
        items: [
          "Canon G7X nếu thích đơn giản.",
          "R50 nếu muốn thử máy ảnh interchangeable lens.",
          "Pocket 3 nếu ưu tiên quay vlog." 
        ]
      }
    ],
    relatedSeoSlugs: [
      "thue-may-anh-nguoi-moi",
      "thue-may-anh-sai-gon"
    ],
    relatedBlogSlugs: [
      "thue-hay-mua-may-anh",
      "top-may-anh-vlog-2026"
    ],
    ctaLink: "/catalog",
    ctaLabel: "Xem máy dễ dùng cho người mới"
  },

  {
    slug: "canon-g7x-hot-tro-lai-2026",
    title: "Canon G7X lại cháy hàng vì TikTok: Có thật sự đáng thuê không?",
    description:
      "Review Canon G7X Mark II và Mark III cho Gen Z thích selfie, cafe, du lịch và chụp flash Y2K.",
    excerpt:
      "Có lý do khiến gần như tiệm thuê máy nào ở Sài Gòn cũng full lịch G7X cuối tuần.",
    date: "2026-05-30",
    category: "Review",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?q=80&w=1974&auto=format&fit=crop",
    imageAlt:
      "Canon G7X chụp cafe và selfie phong cách Y2K",
    sections: [
      {
        type: "p",
        text:
          "G7X đang hot trở lại không phải vì specs. Mà vì vibe." 
      },
      {
        type: "p",
        text:
          "Cái kiểu bật flash lên là da đẹp liền, ảnh nhìn giống camera digicam đời cũ đang cực hợp trend TikTok." 
      },
      {
        type: "h2",
        text: "Điểm khiến G7X được Gen Z mê"
      },
      {
        type: "ul",
        items: [
          "Màu da nịnh cực mạnh.",
          "Nhỏ gọn mang cafe rất tiện.",
          "Màn hình lật selfie dễ dùng.",
          "Quay vlog đủ đẹp cho TikTok và reel." 
        ]
      },
      {
        type: "h2",
        text: "G7X hợp ai nhất?"
      },
      {
        type: "ul",
        items: [
          "Các bạn nữ thích selfie.",
          "Người thích style flash Y2K.",
          "Người đi cafe, concert, du lịch ngắn ngày." 
        ]
      },
      {
        type: "p",
        text:
          "Nếu chỉ muốn có ảnh đẹp đăng mạng xã hội mà không muốn học máy ảnh quá nhiều thì G7X gần như là lựa chọn an toàn nhất hiện tại." 
      }
    ],
    relatedSeoSlugs: [
      "thue-g7x-tphcm",
      "thue-may-anh-compact"
    ],
    relatedBlogSlugs: [
      "thue-may-anh-di-bien-song-ao",
      "thue-may-anh-lan-dau-can-biet-gi"
    ],
    ctaLink: "/catalog?category=compact",
    ctaLabel: "Xem Canon G7X"
  }
];

export const BLOG_POSTS_BY_SLUG = Object.fromEntries(
  BLOG_POSTS.map((p) => [p.slug, p])
);

export function getBlogPostPath(slug) {
  return `/${slug}`;
}

export function getBlogPostImage(post) {
  return post?.image || DEFAULT_BLOG_IMAGE;
}

/** Sắp mới nhất trước */
export const BLOG_POSTS_SORTED = [...BLOG_POSTS].sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);