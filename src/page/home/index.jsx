import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  QrCodeIcon,
  CameraIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { ChevronRightIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import SlideNav from "../../components/SlideNav";
import BookingPromoBanners from "../../components/BookingPromoBanners";
import {
  MESSENGER_LINK,
  PHONE_NUMBER,
  PHONE_DISPLAY,
  SOCIAL_LINKS,
} from "../../data/contactConfig";
import { BRANCHES } from "../../data/localBusiness";
import { PRIVACY_POLICY_PATH } from "../../content/privacyPolicyVi";
import "./homeLanding.css";

const NAV = [
  { to: "/", label: "Trang chủ" },
  { to: "/catalog", label: "Đặt lịch" },
  { to: "/feedback", label: "Feedback & HDSD" },
  { to: "/my-bookings", label: "Đơn hàng" },
  { to: "/account", label: "Tài khoản" },
];

const HEADLINE_LINES = ["FAO Sài Gòn", "Chuyên cho thuê máy ảnh HCM"];
const BRANDS = ["Canon", "Fuji", "Sony", "Ricoh", "DJI"];
const HERO_EASE = [0.16, 1, 0.3, 1];

const HIGHLIGHTS = [
  {
    icon: "/home/fao-emoji-student.png",
    title: "Chỉ cần CCCD hoặc VNeID",
    note: "Shop không giữ giấy tờ gốc",
  },
  {
    icon: "/home/fao-step-pay.png",
    title: "Cọc 0đ cho HSSV",
    note: "Hoặc cọc bằng laptop, iPad, điện thoại",
  },
  {
    icon: "/home/fao-step-camera.png",
    title: "Trễ dưới 30 phút không phụ thu",
    note: "Cần thêm giờ, nhắn trước là được",
  },
];

const FAQS = [
  {
    q: "Ảnh mình chụp lấy ra kiểu gì?",
    a: "Shop chuẩn bị sẵn đầu đọc thẻ để bạn lấy ảnh qua điện thoại hoặc laptop. Trả máy mà chưa kịp copy, shop xuất ảnh lên Google Drive gửi bạn.",
  },
  {
    q: "Sợ màu ảnh không như ý?",
    a: "Lúc nhận máy, shop set sẵn màu hot trend hoặc đúng tông màu bạn muốn. Đang chụp mà chưa ưng, gọi video shop chỉnh lại cùng bạn ngay.",
  },
  {
    q: "Chưa từng dùng dòng máy này?",
    a: "Nhân viên hướng dẫn chi tiết từng thao tác lúc bạn nhận máy. Trong lúc thuê có vướng gì, nhắn shop là được hỗ trợ ngay.",
  },
  {
    q: "Lỡ máy hư thì có phải đền?",
    a: "Máy ảnh là thiết bị điện tử, có tuổi thọ riêng. Lỗi phát sinh không do va đập hay do cách bạn dùng thì shop không tính bồi thường, còn hoàn lại tiền thuê.",
  },
];

function HeroRise({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: HERO_EASE }}
    >
      {children}
    </motion.div>
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--home-line)] bg-white/88 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--home-accent)] text-white shadow-[0_8px_18px_-10px_rgb(199,54,122)]">
            <CameraIcon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-[13px] font-extrabold tracking-[0.12em] text-[var(--home-ink)]">
            FAO.CAMERA
          </span>
        </Link>

        <nav
          className="hidden items-center gap-0.5 lg:flex"
          aria-label="Điều hướng chính"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--home-muted)] transition hover:bg-[#fde8f0] hover:text-[var(--home-accent)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={MESSENGER_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="home-cta min-h-10 px-4 text-sm"
        >
          Tư vấn ngay
        </a>
      </div>
    </header>
  );
}

function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="home-hero-wash relative">
      <div className="mx-auto max-w-[1200px] px-4 pt-9 pb-11 sm:px-6 lg:px-8 lg:pt-14 lg:pb-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-6">
            <HeroRise>
              <p className="home-hero-brands">
                {BRANDS.map((brand) => (
                  <span key={brand}>{brand}</span>
                ))}
              </p>
            </HeroRise>

            <HeroRise delay={0.08}>
              <h1 className="home-hero-title">
                <span className="home-hero-title-main">
                  {HEADLINE_LINES[0]}
                </span>
                <span className="home-hero-title-sub">{HEADLINE_LINES[1]}</span>
              </h1>
            </HeroRise>

            <HeroRise delay={0.16}>
              <p className="home-hero-lead">
                Xem lịch trống từng ngày, cọc online là máy được giữ tên bạn.
                Nhận tại Phú Nhuận hoặc Thủ Đức.
              </p>
            </HeroRise>

            <HeroRise
              delay={0.24}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link to="/catalog" className="home-cta home-cta-glow">
                Check lịch trống
                <ChevronRightIcon className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#uu-dai" className="home-cta-ghost">
                Xem ưu đãi
              </a>
            </HeroRise>
          </div>

          <motion.div
            className="lg:col-span-6"
            initial={reduce ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: HERO_EASE }}
          >
            <figure className="home-hero-media">
              <img
                src="/home/fao-hero-lifestyle.jpg"
                alt="Bạn trẻ cầm máy Fujifilm, phong cách FAO Sài Gòn"
                className="home-hero-photo"
                width={900}
                height={1200}
                fetchPriority="high"
              />
            </figure>
          </motion.div>
        </div>

        <HeroRise delay={0.32} className="mt-9 lg:mt-12">
          <ul className="home-hero-perks" aria-label="Ưu đãi khi thuê tại FAO">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <img
                  src={item.icon}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                />
                <div>
                  <p className="home-perk-title">{item.title}</p>
                  <p className="home-perk-note">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </HeroRise>
      </div>
    </section>
  );
}

function HomeProcess() {
  const steps = [
    {
      icon: MagnifyingGlassIcon,
      title: "Chọn máy ảnh ưng ý",
      body: "Chọn máy ảnh phù hợp với mọi nhu cầu.",
    },
    {
      icon: PencilSquareIcon,
      title: "Điền form",
      body: "Nhập thông tin, ngày thuê và chọn hình thức thuê.",
    },
    {
      icon: QrCodeIcon,
      title: "Thanh toán nhanh website",
      body: "Có ngay mã đơn hàng xác nhận.",
    },
    {
      icon: CameraIcon,
      title: "Đến shop nhận máy",
      body: "Hoặc shop hỗ trợ ship dưới 10km.",
    },
  ];

  return (
    <section id="huong-dan" className="home-botanical scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <h2 className="max-w-[18ch] text-3xl font-extrabold tracking-tight text-[var(--home-ink)] sm:text-4xl">
            Quy trình thuê máy
          </h2>
        </Reveal>

        <div className="relative mt-10">
          <div
            className="home-process-line pointer-events-none absolute top-8 right-8 left-8 hidden h-px lg:block"
            aria-hidden
          />
          <ol className="home-step-list grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={index * 0.06}>
                  <li className="home-step relative flex items-start gap-4 lg:block">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--home-accent)] bg-white text-[var(--home-accent)] lg:h-16 lg:w-16">
                      <Icon className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[var(--home-ink)] lg:mt-4 lg:text-lg">
                        {step.title}
                      </h3>
                      <p className="mt-1 max-w-[32ch] text-sm leading-relaxed text-[var(--home-muted)] lg:max-w-[28ch]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

const OFFERS = [
  {
    title: "Giảm 20% giá thuê",
    note: "Áp dụng thứ hai đến thứ sáu, đặt trực tiếp trên web.",
  },
  {
    title: "Cọc 0đ cho học sinh, sinh viên",
    note: "Còn đi học tại TP.HCM, mang thẻ HSSV kèm lịch học và CCCD.",
  },
  {
    title: "Tặng kèm 3 phụ kiện",
    note: "Sạc dự phòng, hắt sáng, quạt mini, miễn phí cho mọi đơn thuê.",
  },
];

function HomeFaq() {
  return (
    <section id="hoi-dap" className="home-faq scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <h2 className="home-section-title">Khách hay hỏi trước khi thuê</h2>
        </Reveal>

        <dl className="home-faq-list mt-9">
          {FAQS.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.05}>
              <div className="home-faq-row">
                <dt className="home-faq-q">{item.q}</dt>
                <dd className="home-faq-a">{item.a}</dd>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal className="mt-9">
          <Link to="/feedback" className="home-link-arrow">
            Xem ảnh khách chụp thật
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function HomeOffers() {
  return (
    <section id="uu-dai" className="home-camera-dots scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-5">
            <Link
              to="/catalog"
              className="home-offer-poster mx-auto block max-w-[400px] lg:max-w-none"
            >
              <img
                src="/home/fao-offer-poster.jpg"
                alt="Thuê máy ảnh FAO Sài Gòn giảm 20% thứ hai đến thứ sáu. Cọc 0đ cho HSSV còn học tại TP.HCM. Pocket 3 144k, Canon R50 168k, Canon G7X 160k, Fuji X-T30 280k."
                className="home-offer-poster-img"
                width={819}
                height={1024}
              />
            </Link>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal>
              <h2 className="home-section-title">Ưu đãi hot</h2>
              <p className="home-offer-lead">
                Ba ưu đãi bên dưới áp dụng cho đơn đặt qua website. Xem lịch
                trống và giá từng ngày rồi chốt, không phải chờ báo giá.
              </p>
            </Reveal>

            <Reveal className="mt-7">
              <ul className="home-offer-list">
                {OFFERS.map((offer) => (
                  <li key={offer.title}>
                    <CheckCircleIcon
                      className="home-offer-check h-6 w-6 shrink-0"
                      aria-hidden
                    />
                    <div>
                      <p className="home-offer-title">{offer.title}</p>
                      <p className="home-offer-note">{offer.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="mt-7">
              <p className="home-offer-prices">
                Giá sau giảm: DJI Pocket 3 còn 144.000đ, Canon G7X 160.000đ,
                Canon R50 168.000đ, Fujifilm X-T30 280.000đ mỗi ngày, cùng hơn
                100 dòng máy khác.
              </p>
              <div className="mt-6">
                <Link to="/catalog" className="home-cta home-cta-glow">
                  Check lịch trống
                  <ChevronRightIcon className="h-5 w-5" aria-hidden />
                </Link>
              </div>
              <p className="home-offer-fine">
                Cuối tuần và mùa cao điểm máy hết sớm, đặt trước để giữ đúng
                ngày bạn cần.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFooter() {
  const branches = [BRANCHES.PHU_NHUAN, BRANCHES.Q9];

  return (
    <footer className="border-t border-[var(--home-line)] bg-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--home-accent)] text-white">
              <CameraIcon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-[13px] font-extrabold tracking-[0.12em]">
              FAO.CAMERA
            </span>
          </Link>
          <ul className="mt-5 space-y-3 text-sm text-[var(--home-muted)]">
            {branches.map((branch) => (
              <li key={branch.id}>
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 hover:text-[var(--home-accent)]"
                >
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{branch.fullAddress}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="inline-flex items-center gap-2 hover:text-[var(--home-accent)]"
              >
                <PhoneIcon className="h-4 w-4" aria-hidden />
                {PHONE_DISPLAY}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--home-ink)] ring-1 ring-[var(--home-line)] hover:bg-[#fde8f0]"
            >
              Instagram
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--home-ink)] ring-1 ring-[var(--home-line)] hover:bg-[#fde8f0]"
            >
              Facebook
            </a>
            <a
              href={BRANCHES.PHU_NHUAN.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--home-ink)] ring-1 ring-[var(--home-line)] hover:bg-[#fde8f0]"
            >
              Google Maps
            </a>
          </div>
        </div>

        <div className="lg:col-span-3">
          <p className="text-sm font-bold text-[var(--home-ink)]">Menu</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/catalog" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Check lịch trống
              </Link>
            </li>
            <li>
              <Link to="/feedback" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Ảnh feedback & hướng dẫn
              </Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-4">
          <p className="text-sm font-bold text-[var(--home-ink)]">Chính sách</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <li>
              <a href="#huong-dan" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Quy trình
              </a>
            </li>
            <li>
              <Link to="/hop-dong-thue-chuan" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Quy định
              </Link>
            </li>
            <li>
              <a href="#uu-dai" className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Quyền lợi
              </a>
            </li>
            <li>
              <Link to={PRIVACY_POLICY_PATH} className="text-[var(--home-muted)] hover:text-[var(--home-accent)]">
                Bảo mật
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="home-landing min-h-[100dvh] overflow-x-hidden">
      <a href="#home-main" className="home-skip">
        Bỏ qua điều hướng
      </a>
      <HomeHeader />
      <BookingPromoBanners />
      <main id="home-main">
        <HomeHero />
        <HomeProcess />
        <HomeFaq />
        <HomeOffers />
      </main>
      <HomeFooter />
      <SlideNav mobileOnly />
    </div>
  );
}
