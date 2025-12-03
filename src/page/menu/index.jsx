import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Star, Zap, ArrowRight, Sparkles } from "lucide-react";

// --- CSS NOISE TEXTURE ---
const NoiseOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none z-[60] opacity-[0.04] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  ></div>
);

// --- DATA SOURCE (Giữ nguyên) ---
const cameraData = {
  canon: [
    {
      id: "c1",
      name: "CANON RP",
      type: "Lens kit + flash",
      price: "260k",
      img: "https://static.bhphoto.com/images/images500x500/canon_3380c002_eos_rp_mirrorless_digital_1549926861_1461734.jpg", // Đúng RP Mirrorless
    },
    {
      id: "c2",
      name: "CANON R50V",
      type: "Lens kit + flash",
      price: "250k",
      img: "https://static.bhphoto.com/images/images500x500/canon_5811c012_eos_r50_mirrorless_camera_1675815349_1748811.jpg", // R50 (V bản content creator thường chỉ khác phụ kiện, body y hệt)
    },
    {
      id: "c3",
      name: "CANON R50",
      type: "Lens kit",
      price: "210k",
      img: "https://static.bhphoto.com/images/images500x500/canon_5811c002_eos_r50_mirrorless_camera_1675815349_1748805.jpg",
    },
    {
      id: "c4",
      name: "CANON G7X II",
      type: "Compact",
      price: "200k",
      img: "https://static.bhphoto.com/images/images500x500/canon_1066c001_powershot_g7_x_mark_1455755913_1223211.jpg", // Chuẩn G7X Mark II (vòng đỏ ở nút chụp)
    },
    {
      id: "c5",
      name: "CANON M50 II",
      type: "Lens kit",
      price: "190k",
      img: "https://static.bhphoto.com/images/images500x500/canon_4728c001_eos_m50_mark_ii_1602685741_1598460.jpg",
    },
    {
      id: "c6",
      name: "CANON M200",
      type: "Lens kit",
      price: "180k",
      img: "https://static.bhphoto.com/images/images500x500/canon_3699c011_eos_m200_mirrorless_digital_1570659424_1510257.jpg", // M200 nút quay phim chấm đỏ trên top
    },
    {
      id: "c7",
      name: "CANON M100",
      type: "Lens kit",
      price: "160k",
      img: "https://static.bhphoto.com/images/images500x500/canon_2209c011_eos_m100_mirrorless_digital_1503980753_1354722.jpg", // M100 vân giả da ở grip
    },
    {
      id: "c8",
      name: "CANON M10",
      type: "Lens kit",
      price: "140k",
      img: "https://static.bhphoto.com/images/images500x500/Canon_0584C011_EOS_M10_Mirrorless_Digital_1444747716_1188034.jpg", // M10 grip trơn hoàn toàn
    },
    {
      id: "c9",
      name: "CANON IXY 170",
      type: "Compact Vintage",
      price: "90k",
      img: "https://global.canon/ja/c-museum/wp-content/uploads/2015/05/dcc643_ixus170_b.jpg", // Đúng mã IXUS 170 (Tên QT của IXY 170)
    },
    {
      id: "c10",
      name: "CANON IXY 910IS",
      type: "Compact Vintage",
      price: "80k",
      img: "https://global.canon/ja/c-museum/wp-content/uploads/2015/05/dcc549-ixy910is_b.jpg", // Chuẩn IXY 910 IS viền cong "Curvaceous"
    },
  ],
  fujifilm: [
    {
      id: "f1",
      name: "FUJIFILM XS20",
      type: "Lens XF 18-55 f2.8",
      price: "400k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16781852_x_s20_mirrorless_camera_black_1684918734_1767423.jpg", // Grip sâu đặc trưng XS20
    },
    {
      id: "f2",
      name: "FUJIFILM XT30 II",
      type: "Lens XF 18-55 f2.8",
      price: "350k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16759732_x_t30_ii_mirrorless_camera_1630567634_1661642.jpg",
    },
    {
      id: "f3",
      name: "FUJIFILM XS10",
      type: "Lens XF 18-55 f2.8",
      price: "350k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16670041_x_s10_mirrorless_digital_camera_1602728022_1596708.jpg",
    },
    {
      id: "f4",
      name: "FUJIFILM XM5",
      type: "Lens kit",
      price: "300k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16673752_x_e4_mirrorless_digital_camera_1611756539_1618774.jpg", // (Ảnh X-E4 - Model phù hợp nhất về dáng và giá vì XM5 chưa ra mắt)
    },
    {
      id: "f5",
      name: "FUJIFILM XT200",
      type: "Lens kit",
      price: "240k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16646536_x_t200_mirrorless_digital_camera_1579774619_1541011.jpg",
    },
    {
      id: "f6",
      name: "FUJIFILM XT20",
      type: "Lens kit",
      price: "230k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16543534_x_t20_mirrorless_digital_camera_1484807490_1311234.jpg",
    },
    {
      id: "f7",
      name: "FUJIFILM XT100",
      type: "Lens kit",
      price: "200k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16581452_x_t100_mirrorless_digital_camera_1527145711_1410182.jpg",
    },
    {
      id: "f8",
      name: "FUJIFILM XA5",
      type: "Lens kit",
      price: "160k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16570659_x_a5_mirrorless_digital_camera_1517406856_1385496.jpg", // Đúng XA5 (mặt da)
    },
    {
      id: "f9",
      name: "FUJIFILM XA3",
      type: "Lens kit",
      price: "150k",
      img: "https://static.bhphoto.com/images/images500x500/fujifilm_16533723_x_a3_mirrorless_digital_camera_1472120392_1276081.jpg", // XA3 body trơn
    },
  ],
  lens: [
    {
      id: "l1",
      name: "LENS 70-200MM",
      type: "f2.8 LII IS USM",
      price: "250k",
      img: "https://static.bhphoto.com/images/images500x500/Canon_2751B002_EF_70_200mm_f_2_8L_IS_1268334466_680103.jpg", // Chuẩn L Lens Trắng
    },
    {
      id: "l2",
      name: "LENS 24-70MM",
      type: "f2.8L mark II USM",
      price: "200k",
      img: "https://static.bhphoto.com/images/images500x500/Canon_5175B002_EF_24_70mm_f_2_8L_II_1328601614_843008.jpg", // Viền đỏ chuẩn dòng L
    },
    {
      id: "l3",
      name: "LENS 70-300MM",
      type: "F/4-5.6 IS USM",
      price: "100k",
      img: "https://static.bhphoto.com/images/images500x500/Canon_0345B002_EF_70_300mm_f_4_5_6_IS_1478103758_397663.jpg", // Lens vỏ đen thường, đúng với giá thuê 100k
    },
    {
      id: "l4",
      name: "LENS RF 50MM",
      type: "F1.8 STM",
      price: "80k",
      img: "https://static.bhphoto.com/images/images500x500/canon_4515c002_rf_50mm_f_1_8_stm_1604473663_1601517.jpg", // Lens RF chân bạc
    },
    {
      id: "l5",
      name: "LENS EF 50MM",
      type: "F1.8 STM",
      price: "60k",
      img: "https://static.bhphoto.com/images/images500x500/Canon_0570C002_EF_50mm_f_1_8_STM_1431327578_1143786.jpg", // Lens EF chân đen
    },
    {
      id: "l6",
      name: "FUJI XF 18-55MM",
      type: "f/2.8-4 R LM OIS",
      price: "80k",
      img: "https://static.bhphoto.com/images/images500x500/Fujifilm_16276479_XF_18_55mm_f_2_8_4_R_1347069151_888496.jpg", // Lens Kit Fuji
    },
  ],
  gear: [
    {
      id: "g1",
      name: "SONY A6400",
      type: "Lens 18-105mm + flash",
      price: "300k",
      img: "https://static.bhphoto.com/images/images500x500/sony_ilce_6400l_b_alpha_a6400_mirrorless_digital_1547565773_1453768.jpg", // A6400 viewfinder lệch trái
    },
    {
      id: "g2",
      name: "SONY ZV E10",
      type: "Lens kit + flash",
      price: "200k",
      img: "https://static.bhphoto.com/images/images500x500/sony_zv_e10_mirrorless_camera_body_1627386358_1655301.jpg", // ZV E10 (kèm bông lọc gió đặc trưng)
    },
    {
      id: "g3",
      name: "SONY ZV1",
      type: "Compact + flash",
      price: "190k",
      img: "https://static.bhphoto.com/images/images500x500/sony_dczv1_b_zv_1_digital_camera_1590499637_1565880.jpg", // ZV1 ống kính liền
    },
    {
      id: "g4",
      name: "POCKET 3",
      type: "Full combo",
      price: "180k",
      img: "https://static.bhphoto.com/images/images500x500/dji_cp_os_00000301_01_osmo_pocket_3_1698239611_1791249.jpg", // Chuẩn Osmo Pocket 3 màn hình xoay ngang
    },
    {
      id: "g5",
      name: "INSTA360 GO ULTRA",
      type: "Full combo",
      price: "100k",
      img: "https://static.bhphoto.com/images/images500x500/insta360_cinsabka_go_3_action_camera_1687873155_1773429.jpg", // Ảnh GO 3 (Loại phổ biến nhất cho thuê hiện nay)
    },
    {
      id: "g6",
      name: "SAMSUNG S23 ULTRA",
      type: "Sạc nhanh + sạc dự phòng",
      price: "350k",
      img: "https://images.samsung.com/is/image/samsung/p6pim/vn/2302/gallery/vn-galaxy-s23-s918-sm-s918bzkaxxv-534863073?$650_519_PNG$", // S23 Ultra mặt lưng đen
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

// --- ANIMATION VARIANTS (Optimized for Mobile) ---
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Hiện từng món rất nhanh
      when: "beforeChildren", // Đợi parent hiện rồi mới tới child
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 }, // Biến mất tức thì để nhường chỗ
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// --- COMPONENTS ---

const PinkTapeMarquee = () => (
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

// CHIC CARD: Đã loại bỏ "layout" prop để nhẹ máy
const ChicCard = ({ item }) => {
  const { original, discounted } = getDiscountPrice(item.price);

  return (
    <motion.div
      variants={cardVariants}
      className="relative group select-none h-full z-10"
    >
      <div className="bg-[#FFFBF5] rounded-xl p-3 pt-10 pb-3 relative border-2 border-transparent hover:border-[#FF9FCA] shadow-[0_4px_10px_rgba(0,0,0,0.03)] active:scale-98 transition-all duration-200 flex flex-col items-center h-full overflow-hidden cursor-pointer touch-manipulation">
        {/* SALE BADGE */}
        <div className="absolute top-0 left-0 bg-[#333] group-hover:bg-[#E85C9C] text-white px-3 py-1.5 rounded-br-xl z-20 shadow-sm transition-colors duration-300">
          <span className="text-[9px] md:text-[10px] font-black tracking-widest leading-none block">
            -20% trong tuần
          </span>
        </div>

        {/* STUDENT BADGE */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-center transform rotate-6">
          <div className="bg-[#FFC2DF] text-[#333] text-[9px] font-bold px-2 py-1 rounded border border-[#333] shadow-[2px_2px_0_rgba(0,0,0,0.1)] uppercase text-center leading-[1.1]">
            <div>SV Cọc</div>
            <div className="text-[11px] font-black">500k</div>
          </div>
        </div>

        {/* IMAGE CONTAINER */}
        <div className="w-24 h-24 md:w-32 md:h-32 mb-4 relative shrink-0">
          <div className="w-full h-full rounded-full border-4 border-white shadow-[0_5px_20px_#ffe4f0] overflow-hidden relative bg-white">
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 text-yellow-400 drop-shadow-sm z-20">
            <Star size={20} fill="currentColor" />
          </div>
        </div>

        {/* INFO BODY */}
        <div className="text-center w-full flex flex-col flex-grow">
          <h3 className="font-sans text-[#222] text-sm md:text-lg font-black uppercase tracking-tight mb-1 leading-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="text-[10px] md:text-xs text-gray-500 font-medium italic line-clamp-1 mb-3">
            {item.type}
          </p>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FF9FCA] to-transparent opacity-50 mb-3"></div>

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

            <div className="bg-[#222] text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
              <ArrowRight size={16} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StylishTabs = ({ activeTab, setActiveTab }) => (
  <div className="w-full px-2 mb-8 z-20 overflow-x-auto no-scrollbar pt-2 touch-pan-x">
    <div className="flex justify-start md:justify-center gap-3 min-w-max pb-2 px-2">
      {CATEGORIES.map((cat) => {
        const isActive = activeTab === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`relative px-5 py-2.5 rounded-lg uppercase text-xs md:text-sm font-black tracking-widest transition-all duration-200 active:scale-95 touch-manipulation group ${
              isActive
                ? "text-[#E85C9C] translate-y-[-1px]"
                : "text-[#555] bg-white border border-transparent"
            }`}
          >
            {/* Background shadow static để nhẹ máy */}
            {isActive && (
              <div className="absolute inset-0 rounded-lg shadow-[3px_3px_0_#ddd] -z-10"></div>
            )}

            {/* Active BG: Sử dụng layoutId nhưng transition rất nhanh */}
            {isActive && (
              <motion.div
                layoutId="activeTabChic"
                className="absolute inset-0 bg-[#222] rounded-lg border border-[#222]"
                transition={{ duration: 0.15, ease: "easeInOut" }}
              />
            )}

            <span
              className={`relative z-10 flex items-center gap-2 transition-all ${
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
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#FFC2DF] rounded-full blur-[120px] opacity-30 mix-blend-multiply"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-[#FFF2CC] rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden flex flex-col pb-10 selection:bg-[#FF9FCA] selection:text-white">
      <NoiseOverlay />
      <PageBackground />
      <PinkTapeMarquee />

      <div className="w-full max-w-2xl mx-auto pt-24 px-4 z-20">
        {/* -- HEADER -- */}
        <div className="text-center mb-10 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-8">
            <Star
              className="text-[#FFD700] fill-[#FFD700] w-10 h-10 drop-shadow-md"
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
            FAQ{" "}
            <span className="text-[#333]" style={{ WebkitTextStroke: "0" }}>
              Digital
            </span>{" "}
            Camera
          </h1>

          <div className="relative inline-block mt-2 transform -rotate-1">
            <h2
              className="text-4xl md:text-5xl text-[#E85C9C] font-normal relative"
              style={{ fontFamily: "Brush Script MT, cursive" }}
            >
              cho thuê máy ảnh Sài Gòn
            </h2>
          </div>
        </div>

        {/* -- TABS & CONTENT -- */}
        <StylishTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* CONTAINER FIXED HEIGHT (nếu cần) hoặc FLEX GROW */}
        <div className="min-h-[50vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-2 gap-4 md:gap-8 px-1 md:px-0 pb-12"
            >
              {cameraData[activeTab]?.map((item) => (
                <ChicCard key={`${activeTab}-${item.id}`} item={item} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* -- FOOTER -- */}
      <div className="mt-auto px-4 text-center z-50">
        <div className="inline-block bg-[#FFFBF5]/95 border border-[#E85C9C]/20 px-4 py-3 md:px-8 md:py-4 rounded-full shadow-lg backdrop-blur-md w-full md:w-auto">
          <div className="flex flex-wrap md:flex-nowrap gap-x-4 gap-y-2 items-center justify-center text-[10px] md:text-xs font-bold text-[#555] uppercase tracking-wide">
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C]"
            >
              <MapPin size={14} className="text-[#E85C9C]" /> PN, Phan Đình
              Phùng
            </a>

            <div className="h-3 w-px bg-gray-300 hidden md:block"></div>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C]"
            >
              <MapPin size={14} className="text-[#E85C9C]" /> Q9, Vinhome
            </a>

            {/* Nút Gọi: Làm to ra cho dễ bấm trên mobile */}
            <a
              href="tel:0901355198"
              className="flex items-center gap-2 bg-[#222] text-white px-5 py-2 rounded-full active:bg-[#E85C9C] ml-auto md:ml-2 w-full md:w-auto justify-center mt-2 md:mt-0 shadow-lg"
            >
              <Phone size={14} fill="currentColor" /> 0901 355 198
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChicCameraMenu;
