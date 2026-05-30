import React from "react";
import SlideNav from "../../../components/SlideNav";
import FloatingContactButton from "../../../components/FloatingContactButton";
import { ptbShellBg } from "../../../features/photobooth/theme";
import InAnhSamplesShowcase from "../components/InAnhSamplesShowcase";
import InAnhCta from "../components/InAnhCta";

export default function InAnhMobile() {
  return (
    <div className={`${ptbShellBg} min-h-dvh pb-32`}>
      <SlideNav />

      <div className="max-w-lg mx-auto px-3 sm:px-4 pt-4 pb-6">
        <InAnhSamplesShowcase variant="mobile" className="-mx-0.5 sm:mx-0" />
        <InAnhCta layout="stack" variant="mobile" className="mt-5 px-1" />
      </div>

      <FloatingContactButton />
    </div>
  );
}
