import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Star, Zap, ArrowRight, Sparkles } from "lucide-react";

// --- CSS NOISE TEXTURE (Hiệu ứng hạt nhiễu giống giấy in) ---
const NoiseOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none z-[60] opacity-[0.04] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  ></div>
);

// --- DATA SOURCE ---
const cameraData = {
  canon: [
    {
      id: "c1",
      name: "CANON RP",
      type: "Full-frame Entry",
      price: "260k",
      img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "c2",
      name: "CANON R50V",
      type: "Vlog Hybrid",
      price: "250k",
      img: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "c3",
      name: "CANON R50",
      type: "Lens kit",
      price: "210k",
      img: "https://images.unsplash.com/photo-1519638831568-d9897f54ed69?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "c4",
      name: "G7X MARK II",
      type: "Digital Compact",
      price: "200k",
      img: "https://images.unsplash.com/photo-1564466021183-b09787e6da87?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "c5",
      name: "CANON M50 II",
      type: "Mirrorless",
      price: "190k",
      img: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "c6",
      name: "CANON IXY 170",
      type: "Vintage Vibe",
      price: "90k",
      img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80",
    },
  ],
  fujifilm: [
    {
      id: "f1",
      name: "FUJI XS20",
      type: "XF 18-55 F2.8",
      price: "400k",
      img: "https://images.unsplash.com/photo-1616423664045-60dd43217b18?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "f2",
      name: "XT30 MARK II",
      type: "XF 18-55 F2.8",
      price: "350k",
      img: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "f3",
      name: "FUJI XS10",
      type: "Stabilized Body",
      price: "350k",
      img: "https://images.unsplash.com/photo-1519183071298-a2962feb80a3?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "f4",
      name: "FUJI XA5",
      type: "Entry Level",
      price: "160k",
      img: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=400&q=80",
    },
  ],
  lens: [
    {
      id: "l1",
      name: "RF 70-200MM",
      type: "F2.8 L IS USM",
      price: "250k",
      img: "https://images.unsplash.com/photo-1617005082412-cb95b4cb2075?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "l2",
      name: "RF 50MM",
      type: "F1.8 STM",
      price: "80k",
      img: "https://images.unsplash.com/photo-1610427976899-7dd2a1c22df2?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "l3",
      name: "XF 18-55MM",
      type: "F2.8-4 R LM",
      price: "80k",
      img: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=400&q=80",
    },
  ],
  gear: [
    {
      id: "g1",
      name: "SONY A6400",
      type: "Lens 18-105",
      price: "300k",
      img: "https://images.unsplash.com/photo-1563855581177-3e1e21b069d7?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "g2",
      name: "SONY ZV E10",
      type: "Content Creator",
      price: "200k",
      img: "https://images.unsplash.com/photo-1588483977959-58b3f3079b7b?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "g3",
      name: "DJI POCKET 3",
      type: "Creator Combo",
      price: "180k",
      img: "https://images.unsplash.com/photo-1594918804705-7f55e5d398f6?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "g4",
      name: "S23 ULTRA",
      type: "Gimbal Mode",
      price: "350k",
      img: "https://images.unsplash.com/photo-1675712534571-081829cb8c1e?auto=format&fit=crop&w=400&q=80",
    },
  ],
};

const CATEGORIES = [
  { key: "canon", label: "CANON" },
  { key: "fujifilm", label: "FUJI" },
  { key: "lens", label: "LENS" },
  { key: "gear", label: "GEAR" },
];

const getDiscountPrice = (priceStr) => {
  const numberPart = parseInt(priceStr.replace(/[^0-9]/g, ""));
  if (isNaN(numberPart)) return { original: priceStr, discounted: priceStr };
  const discountedNum = Math.floor(numberPart * 0.8);
  return { original: priceStr, discounted: `${discountedNum}k` };
};

// --- COMPONENTS ---

const PinkTapeMarquee = () => (
  // Dùng fixed z-index cao để đảm bảo luôn nằm trên cùng nhưng dưới Noise
  <div className="absolute top-0 -left-[5%] w-[110%] bg-[#FF9FCA] h-9 md:h-11 flex items-center overflow-hidden border-b-2 border-white z-40 shadow-sm transform rotate-[0.5deg]">
    <motion.div
      className="flex whitespace-nowrap text-[#333] font-black text-[11px] md:text-sm uppercase tracking-[0.2em] font-sans"
      animate={{ x: [0, -2000] }}
      transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
    >
      {[...Array(12)].map((_, i) => (
        <span key={i} className="mx-6 flex items-center gap-4">
          <Zap size={14} fill="white" className="text-white shrink-0" />
          Giảm 20% từ thứ 2 tới thứ 6
          <span className="w-1.5 h-1.5 rounded-full bg-white mx-1 shrink-0"></span>
          Sinh viên cọc đồng giá 500k
        </span>
      ))}
    </motion.div>
  </div>
);

const ChicCard = ({ item, index }) => {
  const { original, discounted } = getDiscountPrice(item.price);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="relative group select-none h-full z-10"
    >
      <div className="bg-[#FFFBF5] rounded-xl p-3 pt-10 pb-3 relative border-2 border-transparent hover:border-[#FF9FCA] shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:shadow-[5px_5px_0px_#FF9FCA] transition-all duration-300 flex flex-col items-center h-full overflow-hidden cursor-pointer">
        {/* -- 1. SALE BADGE: Tăng tính dễ đọc -- */}
        <div className="absolute top-0 left-0 bg-[#333] group-hover:bg-[#E85C9C] text-white px-3 py-1.5 rounded-br-xl z-20 shadow-sm transition-colors duration-300">
          <span className="text-[9px] md:text-[10px] font-black tracking-widest leading-none block">
            -20% MON-FRI
          </span>
        </div>

        {/* -- 2. STUDENT BADGE: Chỉnh layout 2 dòng cho gọn -- */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-center transform rotate-6 group-hover:rotate-12 transition-transform duration-300">
          <div className="bg-[#FFC2DF] text-[#333] text-[9px] font-bold px-2 py-1 rounded border border-[#333] shadow-[2px_2px_0_rgba(0,0,0,0.1)] uppercase text-center leading-[1.1]">
            <div>SV Cọc</div>
            <div className="text-[11px] font-black">500k</div>
          </div>
        </div>

        {/* -- IMAGE CONTAINER -- */}
        <div className="w-24 h-24 md:w-32 md:h-32 mb-4 relative shrink-0">
          <div className="w-full h-full rounded-full border-4 border-white shadow-[0_5px_20px_#ffe4f0] overflow-hidden group-hover:scale-105 transition-transform duration-500 relative bg-white">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 z-10 transition-opacity"></div>
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 text-yellow-400 drop-shadow-sm z-20">
            <Star size={20} fill="currentColor" className="animate-spin-slow" />
          </div>
        </div>

        {/* -- INFO BODY -- */}
        <div className="text-center w-full flex flex-col flex-grow">
          {/* Tên sản phẩm dùng font condensed mạnh mẽ */}
          <h3 className="font-sans text-[#222] text-sm md:text-lg font-black uppercase tracking-tight mb-1 leading-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="text-[10px] md:text-xs text-gray-500 font-medium italic line-clamp-1 mb-3">
            {item.type}
          </p>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FF9FCA] to-transparent opacity-50 mb-3"></div>

          {/* Price Row: Căn chỉnh lại Baseline */}
          <div className="mt-auto flex items-end justify-between w-full px-1">
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-gray-400 line-through decoration-rose-400 decoration-1 mb-0.5">
                {original}
              </span>
              <span
                className="text-lg md:text-2xl font-black text-[#E85C9C]"
                style={{ textShadow: "1px 1px 0 #FFF" }}
              >
                {discounted}
              </span>
            </div>

            {/* Icon Arrow tạo affordance (khả năng nhấp) */}
            <div className="bg-[#222] text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#FF9FCA] group-hover:text-white transition-all shadow-md group-hover:-rotate-45 duration-300">
              <ArrowRight size={16} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StylishTabs = ({ activeTab, setActiveTab }) => (
  <div className="w-full px-2 mb-8 z-20 overflow-x-auto no-scrollbar pt-2">
    <div className="flex justify-start md:justify-center gap-3 min-w-max pb-2 px-2">
      {CATEGORIES.map((cat) => {
        const isActive = activeTab === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`relative px-5 py-2.5 rounded-lg uppercase text-xs md:text-sm font-black tracking-widest transition-all duration-300 group ${
              isActive
                ? "text-[#E85C9C] translate-y-[-2px]"
                : "text-[#555] bg-white border border-transparent hover:border-[#FF9FCA]/50"
            }`}
          >
            {/* Background shadow cho Tab */}
            {isActive && (
              <div className="absolute inset-0 rounded-lg shadow-[4px_4px_0_#ddd] -z-10"></div>
            )}

            {/* Active BG */}
            {isActive && (
              <motion.div
                layoutId="activeTabChic"
                className="absolute inset-0 bg-[#222] rounded-lg border border-[#222]"
                transition={{ duration: 0.2 }}
              />
            )}

            <span
              className={`relative z-10 flex items-center gap-2 group-hover:gap-3 transition-all ${
                isActive ? "text-[#FF9FCA]" : ""
              }`}
            >
              {cat.label}
              {isActive && <Sparkles size={12} fill="currentColor" />}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// --- MAIN PAGE ---
const ChicCameraMenu = () => {
  const [activeTab, setActiveTab] = useState("canon");

  const PageBackground = () => (
    <div className="fixed inset-0 overflow-hidden -z-10 bg-[#FEF5ED]">
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white to-transparent opacity-80"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#FFC2DF] rounded-full blur-[120px] opacity-30 mix-blend-multiply animate-pulse-slow"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-[#FFF2CC] rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden flex flex-col pb-10">
      <NoiseOverlay />
      <PageBackground />
      <PinkTapeMarquee />

      {/* Floating Elements (Tạo độ sâu trường ảnh) */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-40 select-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#FF9FCA]"
            style={{
              left: Math.random() * 100 + "%",
              fontSize: Math.random() * 20 + 10,
            }}
            initial={{ top: -20, opacity: 0 }}
            animate={{ top: "110vh", opacity: [0, 0.6, 0], rotate: 180 }}
            transition={{
              duration: 30 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear",
            }}
          >
            ✦
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-2xl mx-auto pt-24 px-4 z-20">
        {/* -- TITLE HEADER (Đã chỉnh sửa typo FAO -> FAQ) -- */}
        <div className="text-center mb-10 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-8">
            <Star
              className="text-[#FFD700] fill-[#FFD700] w-10 h-10 animate-bounce-slow drop-shadow-md"
              strokeWidth={1.5}
            />
          </div>

          <h1
            className="text-5xl md:text-7xl font-black text-transparent uppercase tracking-[-0.05em] leading-[0.9] mb-4 relative z-10"
            style={{
              fontFamily: "Impact, sans-serif",
              WebkitTextStroke: "1px #E85C9C",
              textShadow: "4px 4px 0px rgba(255, 194, 223, 0.4)",
            }}
          >
            FAO{" "}
            <span className="text-[#333]" style={{ WebkitTextStroke: "0" }}>
              Digital
            </span>{" "}
            Camera
          </h1>

          <div className="relative inline-block mt-2 transform -rotate-1">
            <div className="absolute inset-0 bg-[#FFD700] opacity-20 blur-lg rounded-full"></div>
            <h2
              className="text-4xl md:text-5xl text-[#E85C9C] font-normal relative"
              style={{ fontFamily: "Brush Script MT, cursive" }}
            >
              cho thuê máy ảnh Sài Gòn
            </h2>
          </div>
        </div>

        <StylishTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <motion.div
          className="grid grid-cols-2 gap-4 md:gap-8 px-1 md:px-0 pb-12"
          layout
        >
          <AnimatePresence mode="popLayout">
            {cameraData[activeTab]?.map((item, index) => (
              <ChicCard
                key={`${activeTab}-${item.id}`}
                item={item}
                index={index}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* -- FOOTER (Cải thiện nút bấm) -- */}
      <div className="mt-auto px-4 text-center z-50">
        <div className="inline-block bg-[#FFFBF5]/90 border border-[#E85C9C]/20 px-4 py-3 md:px-8 md:py-4 rounded-full shadow-lg backdrop-blur-md hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex flex-wrap md:flex-nowrap gap-x-4 gap-y-2 items-center justify-center text-[10px] md:text-xs font-bold text-[#555] uppercase tracking-wide">
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C] transition-colors"
              title="Xem bản đồ Quận Phú Nhuận"
            >
              <MapPin size={14} className="text-[#E85C9C]" />
              Phan Đình Phùng, PN
            </a>

            <span className="text-[#FF9FCA]/50 opacity-50 hidden md:block">
              |
            </span>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C] transition-colors"
              title="Xem bản đồ Quận 9"
            >
              <MapPin size={14} className="text-[#E85C9C]" />
              Vinhome Q9
            </a>

            <div className="w-full md:w-auto h-px bg-[#ccc] md:hidden opacity-30 my-1"></div>

            <span className="text-[#FF9FCA]/50 opacity-50 hidden md:block">
              |
            </span>

            {/* CALL BUTTON HIGHLIGHT */}
            <a
              href="tel:0901355198"
              className="flex items-center gap-2 bg-[#222] text-white px-4 py-2 rounded-full hover:bg-[#E85C9C] transition-colors shadow-lg active:scale-95 ml-0 md:ml-2"
              title="Gọi ngay để tư vấn"
            >
              <Phone size={14} fill="currentColor" /> 0901 355 198
            </a>
          </div>
        </div>

        <div className="mt-6 text-[9px] text-[#999] tracking-widest uppercase opacity-60">
          © 2024 FAO Digital Camera - Rental Service
        </div>
      </div>
    </div>
  );
};

export default ChicCameraMenu;
