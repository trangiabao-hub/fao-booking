import React from "react";
import { Link } from "react-router-dom";
import SeoMeta from "../../components/SeoMeta";
import {
  RENTAL_RULES_PATH,
  RENTAL_RULES_UPDATED,
  rentalRulesSections,
} from "../../content/rentalRulesVi";
import { PRIVACY_POLICY_PATH } from "../../content/privacyPolicyVi";
import { SOCIAL_LINKS } from "../../data/contactConfig";

/** Trang quy định thuê máy — /quy-dinh-thue-may. */
export default function RentalRulesPage() {
  return (
    <SeoMeta
      title="Quy định thuê máy ảnh"
      description="Quy định thuê máy ảnh tại FAO Sài Gòn: điều kiện thuê, giờ nhận trả máy, phụ thu khi trả trễ, chính sách huỷ và dời lịch."
      path={RENTAL_RULES_PATH}
    >
      <div className="min-h-dvh bg-[#FEF5ED] pb-16">
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <Link
            to="/"
            className="text-sm font-semibold text-[#E85C9C] hover:underline"
          >
            ← FAO Booking
          </Link>

          <header className="mt-4">
            <h1 className="text-2xl font-black leading-tight text-[#1f1f1f] sm:text-3xl">
              Quy định thuê máy
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6a5a52]">
              Toàn bộ quy định FAO đang áp dụng cho khách thuê máy ảnh, máy
              quay và phụ kiện. Cập nhật ngày {RENTAL_RULES_UPDATED}.
            </p>
          </header>

          <nav className="mt-5 flex flex-wrap gap-2">
            {rentalRulesSections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-[#f2d5c4] bg-white px-3 py-1.5 text-xs font-bold text-[#6a5a52] transition-colors hover:border-[#E85C9C]/60 hover:text-[#a01e58]"
              >
                {index + 1}. {section.title}
              </a>
            ))}
          </nav>

          <div className="mt-6 space-y-4">
            {rentalRulesSections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-6 rounded-2xl border border-[#f2d5c4] bg-white p-5 shadow-[0_10px_28px_rgba(180,120,90,0.08)] sm:p-6"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-xs font-black text-[#FF9FCA]">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-black leading-snug text-[#1f1f1f] sm:text-xl">
                    {section.title}
                  </h2>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-[#7c6a60]">
                  {section.summary}
                </p>

                <ul className="mt-4 space-y-2.5">
                  {section.items.map((item) => (
                    <li
                      key={item.text}
                      className={`flex gap-2.5 rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                        item.emphasis
                          ? "bg-[#fff0f6] font-semibold text-[#1f1f1f]"
                          : "bg-[#faf6f2] text-[#4a3f39]"
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          item.emphasis ? "bg-[#E85C9C]" : "bg-[#c9b6a9]"
                        }`}
                        aria-hidden
                      />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-[#f2d5c4] bg-white p-5 sm:p-6">
            <h2 className="text-base font-black text-[#1f1f1f]">
              Cần shop hỗ trợ thêm?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#7c6a60]">
              Có gì chưa rõ hoặc lịch của bạn cần linh động hơn, nhắn shop
              trước là dễ xử lý nhất.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#E85C9C] px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
              >
                Page Facebook
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-[#f2d5c4] bg-white px-4 py-2.5 text-sm font-bold text-[#4a3f39] transition-colors hover:border-[#E85C9C]/60"
              >
                Instagram
              </a>
            </div>
          </section>

          <footer className="mt-6 border-t border-[#f2d5c4] pt-5 text-sm text-[#7c6a60]">
            <p>
              Quy định này áp dụng cùng với{" "}
              <Link
                to="/hop-dong-thue-chuan"
                className="font-semibold text-[#E85C9C] hover:underline"
              >
                hợp đồng mẫu
              </Link>{" "}
              hai bên ký khi bàn giao máy và{" "}
              <Link
                to={PRIVACY_POLICY_PATH}
                className="font-semibold text-[#E85C9C] hover:underline"
              >
                chính sách quyền riêng tư
              </Link>
              . Khi có nội dung khác nhau về nghĩa vụ tài sản, cọc và bồi
              thường thì hợp đồng thuê được ưu tiên áp dụng.
            </p>
          </footer>
        </div>
      </div>
    </SeoMeta>
  );
}
