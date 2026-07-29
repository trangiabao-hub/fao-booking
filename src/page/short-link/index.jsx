import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveFaoShortCode } from "../../utils/faoShortLink";

function redirectToTarget(url, navigate) {
  try {
    const target = new URL(url, window.location.origin);
    if (target.origin === window.location.origin) {
      navigate(`${target.pathname}${target.search}${target.hash}`, {
        replace: true,
      });
      return;
    }
  } catch {
    /* fall through */
  }
  window.location.replace(url);
}

export default function ShortLinkRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    resolveFaoShortCode(code).then((url) => {
      if (cancelled) return;
      if (url) {
        redirectToTarget(url, navigate);
        return;
      }
      setFailed(true);
      window.setTimeout(() => navigate("/catalog", { replace: true }), 1200);
    });

    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-semibold text-[#444]">
        {failed ? "Link không còn hiệu lực — chuyển về catalog…" : "Đang mở link…"}
      </p>
    </div>
  );
}
