// src/HomePage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CameraIcon, ShieldCheckIcon, StarIcon, SparklesIcon, ChevronRightIcon, 
  Bars3Icon, XMarkIcon, FilmIcon, VideoCameraIcon
} from '@heroicons/react/24/solid';

// Cần cài đặt Swiper: npm install swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';

// Import CSS của Swiper
import 'swiper/css';
import 'swiper/css/pagination';

// --- Dữ liệu tĩnh ---
const categories = [
    { name: 'Fujifilm', description: 'Chất ảnh film, hoài cổ và đầy nghệ thuật.', image: '/fuji.jpg', link: '/booking?category=fuji' },
    { name: 'Canon', description: 'Màu sắc chân thực, lựa chọn an toàn.', image: '/canon.jpg', link: '/booking?category=canon' },
    { name: 'Sony', description: 'Công nghệ đỉnh cao cho quay video và vlog.', image: '/sony.jpg', link: '/booking?category=sony' },
    { name: 'Action Cam & Pocket', description: 'Nhỏ gọn, đa năng, bắt trọn khoảnh khắc.', image: '/pocket.jpg', link: '/booking?category=pocket' },
];
const features = [
    { icon: StarIcon, title: 'Máy xịn, giá xinh', description: 'Luôn cập nhật các dòng máy hot nhất với chi phí thuê hợp lý.' },
    { icon: SparklesIcon, title: 'Vệ sinh kỹ lưỡng', description: 'Mỗi thiết bị đều được làm sạch và kiểm tra cẩn thận trước khi giao.' },
    { icon: ShieldCheckIcon, title: 'Thủ tục đơn giản', description: 'Chỉ cần CCCD/Hộ chiếu. Đặt lịch online nhanh chóng, tiện lợi.' },
];
const swiperStyles = `
  .swiper-pagination-bullet { background-color: #f9a8d4 !important; width: 10px !important; height: 10px !important; opacity: 0.5 !important; }
  .swiper-pagination-bullet-active { background-color: #ec4899 !important; opacity: 1 !important; }
`;

// --- Các Component Tái sử dụng ---
const AnimatedSection = ({ children, className = '', id }) => (
  <motion.section id={id} className={`py-20 sm:py-24 ${className}`} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease: "easeOut" }}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  </motion.section>
);

const BackgroundPattern = () => (
    <motion.div 
        className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e879f9_1px,transparent_1px)] [background-size:32px_32px]"
        animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
            duration: 40,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
        }}
    />
);

const Sparkle = ({ className }) => (
    <motion.div
        className={`absolute rounded-full bg-pink-300 ${className}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1, 0], opacity: [0, 0.7, 0] }}
        transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatType: 'loop', 
            ease: 'easeInOut',
            delay: Math.random() * 2 // Random delay for each sparkle
        }}
    />
);


// --- Các Component Chính của Trang ---
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleScroll = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };
  
  const navLinks = [
    { name: 'Tính năng', id: 'features' },
    { name: 'Feedback', id: 'testimonials'},
    { name: 'Dòng máy', id: 'categories' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <CameraIcon className="h-8 w-8 text-pink-500" />
            <span className="text-xl font-bold text-pink-800 tracking-tight">Fao Sài Gòn</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.id} href={`#${link.id}`} onClick={(e) => handleScroll(e, link.id)} className="text-sm font-medium text-slate-600 hover:text-pink-500 transition-colors duration-300">
                {link.name}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/booking" className="hidden sm:inline-block bg-pink-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-pink-600 transition-all duration-300 shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95">
              Thuê máy ngay
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden z-50 text-pink-800">
              {isMenuOpen ? <XMarkIcon className="h-7 w-7"/> : <Bars3Icon className="h-7 w-7"/>}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-lg border-t border-pink-100 shadow-lg">
            <nav className="flex flex-col items-center gap-6 py-8">
              {navLinks.map(link => (
                <a key={link.id} href={`#${link.id}`} onClick={(e) => handleScroll(e, link.id)} className="text-lg font-medium text-slate-700 hover:text-pink-500 transition-colors">
                  {link.name}
                </a>
              ))}
              <Link to="/booking" className="mt-4 bg-pink-500 text-white font-semibold px-8 py-3 rounded-full text-base hover:bg-pink-600 transition-all duration-300 shadow-lg shadow-pink-500/30 active:scale-95">
                Thuê máy ngay
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const HeroSection = () => {
  const title = "Lưu khoảnh khắc cùng";
  const title2 = "Fao Sài Gòn";

  const sentenceVariant = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        staggerChildren: 0.08,
      },
    },
  };

  const wordVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const FloatingIcon = ({ icon: Icon, className, delay = 0 }) => (
    <motion.div
      className={`absolute text-pink-200/80 z-0 ${className}`}
      initial={{ opacity: 0, scale: 0, y: 100, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 50,
        damping: 12,
        delay: 1.5 + delay,
      }}
    >
      <motion.div
        animate={{
          y: [0, -25, 5, -25, 0],
          rotate: [-10, 15, -10],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 8 + Math.random() * 4,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        <Icon />
      </motion.div>
    </motion.div>
  );

  return (
    // ===== FIX HERE: Changed 100vh to 100dvh =====
    <div className="relative bg-gradient-to-b from-rose-50 to-pink-100 text-center overflow-hidden flex flex-col items-center justify-center min-h-[calc(100dvh-5rem)] md:pt-28 md:pb-36">
      <BackgroundPattern />

      <FloatingIcon icon={CameraIcon} className="top-[15%] left-[5%] w-12 h-12 md:w-20 md:h-20" delay={0.1} />
      <FloatingIcon icon={FilmIcon} className="bottom-[10%] left-[15%] w-10 h-10 md:w-16 md:h-16 rotate-12" delay={0.3} />
      <FloatingIcon icon={VideoCameraIcon} className="top-[20%] right-[5%] w-14 h-14 md:w-24 md:h-24 -rotate-12" delay={0.2} />
      <FloatingIcon icon={CameraIcon} className="bottom-[15%] right-[10%] w-9 h-9 md:w-14 md:h-14 rotate-[20deg]" delay={0.4} />

      <Sparkle className="top-[10%] left-[5%] h-2 w-2" />
      <Sparkle className="top-[20%] right-[10%] h-3 w-3" />
      <Sparkle className="bottom-[15%] left-[20%] h-4 w-4" />
      <Sparkle className="bottom-[25%] right-[15%] h-2 w-2" />
      <Sparkle className="top-[40%] left-[30%] h-3 w-3 hidden md:block" />
      <Sparkle className="top-[50%] right-[35%] h-2 w-2 hidden md:block" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.h1
          className="text-4xl sm:text-4xl lg:text-6xl font-extrabold text-pink-900 tracking-tight"
          variants={sentenceVariant}
          initial="hidden"
          animate="visible"
        >
          {title.split(" ").map((word, index) => (
            <motion.span key={index} variants={wordVariant} className="inline-block mr-3">
              {word}
            </motion.span>
          ))}
          <br />
          <p className="text-pink-500 mt-4">
            {title2.split(" ").map((word, index) => (
              <motion.span key={index} variants={wordVariant} className="inline-block mr-3">
                {word}
              </motion.span>
            ))}
          </p>
        </motion.h1>
        
        <motion.p
          className="mt-6 max-w-2xl mx-auto text-lg text-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2 }}
        >
          Dịch vụ cho thuê máy ảnh và phụ kiện xịn sò dành cho các bạn nữ. Chỉ cần vài cú click để có ngay một 'em' máy ảnh xinh xắn cho chuyến đi sắp tới!
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 1.4 }}
        >
          <Link
            to="/booking"
            className="mt-10 inline-flex items-center gap-3 bg-pink-500 text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-pink-600 transition-all duration-300 shadow-xl shadow-pink-500/40 transform hover:scale-105"
          >
            Chọn máy & bắt đầu sáng tạo <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

const FeaturesSection = () => (
  <AnimatedSection id="features" className="bg-rose-50">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <motion.div 
            key={index} 
            className="bg-white p-8 rounded-2xl shadow-md border border-pink-100"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ type: "spring", stiffness: 90, damping: 15, delay: index * 0.1 }}
          >
            <div className="inline-block bg-pink-500 p-4 rounded-full mb-5 ring-4 ring-pink-100">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-pink-900 mb-2">{feature.title}</h3>
            <p className="text-slate-600">{feature.description}</p>
          </motion.div>
        );
      })}
    </div>
  </AnimatedSection>
);

const TestimonialsSection = () => {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);

    const fallbackTestimonials = [
        { name: "An Nhiên", location: "TP. Hồ Chí Minh", avatar: "https://i.pravatar.cc/80?u=an-nhien", feedback: "Thủ tục siêu nhanh, 5 phút là xong! Máy ảnh đẹp mê ly. Chắc chắn sẽ là khách quen." },
        { name: "Phương Linh", location: "Hà Nội", avatar: "https://i.pravatar.cc/80?u=phuong-linh", feedback: "Shop tư vấn siêu có tâm. Hướng dẫn mình từ A-Z. 10 điểm không có nhưng!" },
        { name: "Bảo Trân", location: "Đà Nẵng", avatar: "https://i.pravatar.cc/80?u=bao-tran", feedback: "Giá thuê quá hợp lý cho một em máy xịn thế này. Ảnh chụp ra màu vintage xinh xỉu." },
    ];

    useEffect(() => {
        // Giả lập API call để tránh lỗi khi không có API endpoint
        setTimeout(() => {
            setTestimonials(fallbackTestimonials);
            setLoading(false);
        }, 1000);

        /*
        // Code gốc gọi API thật
        fetch('/api/google-reviews')
            .then(res => {
                if (!res.ok) throw new Error('API call failed');
                return res.json();
            })
            .then(data => {
                setTestimonials(data.length > 0 ? data : fallbackTestimonials);
                setLoading(false);
            })
            .catch(error => {
                console.error("Failed to load Google testimonials, using fallback:", error);
                setTestimonials(fallbackTestimonials);
                setLoading(false);
            });
        */
    }, []);

    if (loading) {
        return (
            <AnimatedSection id="testimonials" className="bg-white text-center">
                <p className="text-slate-600">Đang tải feedback từ khách hàng...</p>
            </AnimatedSection>
        );
    }
    
    return (
        <AnimatedSection id="testimonials" className="bg-white">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-900">Khách Hàng Xinh Nói Gì?</h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto">Những chia sẻ chân thực từ Google Reviews là động lực để tụi mình phát triển.</p>
          </div>
          <Swiper
            modules={[Pagination, Autoplay]} spaceBetween={30} slidesPerView={1} loop={true}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 30 } }}
            className="!pb-12"
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={index} className="h-auto">
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="bg-rose-50 border border-pink-100 rounded-2xl p-8 h-full flex flex-col text-center"
                >
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-4 ring-white shadow-md"/>
                  <p className="text-slate-600 italic flex-grow">"{testimonial.feedback}"</p>
                  <div className="mt-4">
                    <p className="font-bold text-pink-800">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.location}</p>
                  </div>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        </AnimatedSection>
      );
};

const CategoriesSection = () => (
  <AnimatedSection id="categories">
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-900">Tìm "Chân Ái" Của Bạn</h2>
      <p className="mt-4 text-slate-600 max-w-xl mx-auto">Mỗi dòng máy mang một cá tính riêng. Khám phá phong cách phù hợp nhất với bạn.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {categories.map((cat) => (
        <Link to={cat.link} key={cat.name} className="group block">
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-96"
            whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 150 }}
          >
            <img src={cat.image} alt={cat.name} className="absolute h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform transition-transform duration-500 group-hover:translate-y-[-8px]">
              <h3 className="text-2xl font-bold tracking-tight">{cat.name}</h3>
              <p className="text-sm text-pink-200 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{cat.description}</p>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  </AnimatedSection>
);

const CallToActionSection = () => (
  <AnimatedSection className="bg-pink-50">
     <div className="bg-gradient-to-tr from-pink-500 to-rose-400 flex flex-col md:flex-row items-center gap-8 md:gap-12 rounded-3xl overflow-hidden p-8 md:p-12 text-white">
        <div className="w-full md:w-2/5 md:order-2">
           <motion.img 
              src="/take-photo.avif"
              alt="Girl taking photo"
              className="w-full h-full object-cover rounded-2xl shadow-2xl"
              initial={{ scale: 1.2, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
           />
        </div>
        <div className="w-full md:w-3/5 text-center md:text-left md:order-1">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Mới tập chụp? Đừng lo!</h2>
          <p className="mt-4 text-pink-100 text-lg">
            Tụi mình sẽ hướng dẫn bạn cách sử dụng máy cơ bản nhất để có những tấm ảnh thật lung linh. Bạn chỉ việc sáng tạo, mọi thứ cứ để Fao lo.
          </p>
          <Link to="/booking" className="mt-8 inline-block bg-white text-pink-600 font-bold px-8 py-3 rounded-full text-lg hover:bg-rose-50 transition-all duration-300 shadow-xl transform hover:scale-105">
            Chọn máy ngay
          </Link>
        </div>
     </div>
  </AnimatedSection>
);

const Footer = () => (
  <footer className="bg-slate-800 text-slate-400">
     <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
          <CameraIcon className="h-8 w-8 text-pink-400" />
          <span className="text-xl font-bold text-white tracking-tight">Fao Sài Gòn</span>
        </Link>
        <p className="text-sm">Mang đến những trải nghiệm chụp ảnh tuyệt vời nhất.</p>
        <div className="flex justify-center gap-6 mt-6">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-pink-400 transition-colors"><i className="fab fa-instagram text-2xl"></i></a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-pink-400 transition-colors"><i className="fab fa-facebook text-2xl"></i></a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-pink-400 transition-colors"><i className="fab fa-tiktok text-2xl"></i></a>
        </div>
        <p className="mt-8 text-xs text-slate-500">© {new Date().getFullYear()} Fao Sài Gòn. All Rights Reserved.</p>
     </div>
  </footer>
);


// ==== Component Gốc: HomePage ====
export default function HomePage() {
  return (
    <div className="bg-white text-slate-800">
      <style>{swiperStyles}</style>
      <Header />
      <main className="pt-20">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CategoriesSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
}