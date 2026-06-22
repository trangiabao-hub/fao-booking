import React from "react";
import { Link } from "react-router-dom";
import SeoMeta from "../../components/SeoMeta";
import {
  PRIVACY_POLICY_PATH,
  PRIVACY_POLICY_UPDATED,
  privacyPolicySections,
} from "../../content/privacyPolicyVi";

export default function PrivacyPolicyPage() {
  return (
    <SeoMeta
      title="Chính sách quyền riêng tư"
      description="Chính sách quyền riêng tư của FAO Sài Gòn — faocamera.vn, đặt thuê máy ảnh, Messenger và ứng dụng Meta Demo chat."
      path={PRIVACY_POLICY_PATH}
    >
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          padding: "24px 16px 48px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#0f172a",
          lineHeight: 1.65,
        }}
      >
        <article style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            <Link to="/" style={{ color: "#E85C9C", textDecoration: "none" }}>
              ← FAO Booking
            </Link>
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>
            Chính sách quyền riêng tư
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
            Có hiệu lực từ {PRIVACY_POLICY_UPDATED}. Áp dụng cho faocamera.vn và
            ứng dụng Meta &quot;Demo chat&quot; của FAO.
          </p>

          {privacyPolicySections.map((section) => (
            <section key={section.title} style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: "0 0 10px",
                  color: "#111",
                }}
              >
                {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} style={{ margin: "0 0 10px", fontSize: 15 }}>
                  {p}
                </p>
              ))}
              {section.link ? (
                <p style={{ margin: "0 0 10px", fontSize: 15 }}>
                  <a href={section.link.href} style={{ color: "#E85C9C" }} rel="noopener noreferrer">
                    {section.link.label}
                  </a>
                </p>
              ) : null}
            </section>
          ))}

          <footer
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid #e2e8f0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            <p style={{ margin: 0 }}>
              Liên hệ:{" "}
              <a href="mailto:giabaotran912@gmail.com" style={{ color: "#E85C9C" }}>
                giabaotran912@gmail.com
              </a>{" "}
              · Hotline 0901 355 198
            </p>
          </footer>
        </article>
      </div>
    </SeoMeta>
  );
}
