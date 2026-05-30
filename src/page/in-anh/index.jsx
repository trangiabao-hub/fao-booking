import React from "react";
import { useBreakpoint } from "../../features/photobooth/hooks/useBreakpoint";
import InAnhMobile from "./layouts/InAnhMobile";
import InAnhTablet from "./layouts/InAnhTablet";
import InAnhDesktop from "./layouts/InAnhDesktop";

export default function InAnhIntroPage() {
  const bp = useBreakpoint();

  if (bp === "desktop") return <InAnhDesktop />;
  if (bp === "tablet") return <InAnhTablet />;
  return <InAnhMobile />;
}
