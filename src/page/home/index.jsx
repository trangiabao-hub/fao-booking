// src/HomePage.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CameraIcon, 
  ShieldCheckIcon, 
  StarIcon, 
  SparklesIcon, 
  ChevronRightIcon, 
  Bars3Icon, 
  XMarkIcon 
} from '@heroicons/react/24/solid';

// --- Data (Unchanged) ---
const categories = [
    { name: 'Fujifilm', description: 'Chất ảnh film, hoài cổ và đầy nghệ thuật.', image: 'https://images.unsplash.com/photo-1590059535317-aab6a84f3f21?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', link: '/booking?category=fuji' },
    { name: 'Canon', description: 'Màu sắc chân thực, lựa chọn an toàn.', image: 'https://images.unsplash.com/photo-1512756290469-ec264b7fbf87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', link: '/booking?category=canon' },
    { name: 'Sony', description: 'Công nghệ đỉnh cao cho quay video và vlog.', image: 'https://images.unsplash.com/photo-1597952443533-f5c78b7b2053?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', link: '/booking?category=sony' },
    { name: 'Action Cam & Pocket', description: 'Nhỏ gọn, đa năng, bắt trọn khoảnh khắc.', image: 'https://images.unsplash.com/photo-1617013329245-56f45a6c3f87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', link: '/booking?category=pocket' },
];

const features = [
    { icon: StarIcon, title: 'Máy xịn, giá xinh', description: 'Luôn cập nhật các dòng máy hot nhất với chi phí thuê hợp lý.' },
    { icon: SparklesIcon, title: 'Vệ sinh kỹ lưỡng', description: 'Mỗi thiết bị đều được làm sạch và kiểm tra cẩn thận trước khi giao.' },
    { icon: ShieldCheckIcon, title: 'Thủ tục đơn giản', description: 'Chỉ cần CCCD/Hộ chiếu. Đặt lịch online nhanh chóng, tiện lợi.' },
];

// --- Reusable Animated Section Component (Improved Naming) ---
const AnimatedSection = ({ children, className = '', id }) => (
  <motion.section
    id={id}
    className={`py-20 sm:py-24 ${className}`}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </motion.section>
);


// --- SVG Background Pattern for a subtle, elegant touch ---
const BackgroundPattern = () => (
    <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e879f9_1px,transparent_1px)] [background-size:32px_32px] opacity-20"></div>
);

// --- Header Component (with Mobile Menu) ---
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // IMPROVEMENT: Smooth scroll for anchor links
  const handleScroll = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false); // Close menu on click
  };
  
  const navLinks = [
    { name: 'Tính năng', id: 'features' },
    { name: 'Dòng máy', id: 'categories' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <CameraIcon className="h-8 w-8 text-pink-500" />
            <span className="text-xl font-bold text-pink-800 tracking-tight">XinhRentals</span>
          </Link>

          {/* Desktop Nav */}
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
            {/* Mobile Menu Button */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden z-50 text-pink-800">
              {isMenuOpen ? <XMarkIcon className="h-7 w-7"/> : <Bars3Icon className="h-7 w-7"/>}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-lg border-t border-pink-100 shadow-lg"
          >
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


// --- Hero Section Component ---
const HeroSection = () => (
  <div className="relative bg-gradient-to-b from-rose-50 to-pink-100 pt-28 pb-36 text-center overflow-hidden">
    <BackgroundPattern />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <motion.h1 
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-pink-900 tracking-tight"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Lưu giữ khoảnh khắc, <span className="text-pink-500">trọn vẹn cảm xúc</span>
      </motion.h1>
      <motion.p 
        className="mt-6 max-w-2xl mx-auto text-lg text-slate-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Dịch vụ cho thuê máy ảnh và phụ kiện xịn sò dành cho các bạn nữ.
        Chỉ cần vài cú click để có ngay một 'em' máy ảnh xinh xắn cho chuyến đi sắp tới!
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
      >
        <Link 
          to="/booking" 
          className="mt-10 inline-flex items-center gap-3 bg-pink-500 text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-pink-600 transition-all duration-300 shadow-xl shadow-pink-500/40 transform hover:scale-105"
        >
          Chọn máy & bắt đầu sáng tạo <ChevronRightIcon className="h-5 w-5"/>
        </Link>
      </motion.div>

      {/* IMPROVEMENT: Add a "social proof" element for more personality */}
      <motion.div
        className="hidden lg:block absolute top-1/4 -left-8 bg-white p-4 rounded-2xl shadow-lg border border-pink-100"
        initial={{ opacity: 0, x: -50, rotate: -15 }}
        animate={{ opacity: 1, x: 0, rotate: -5 }}
        transition={{ type: "spring", stiffness: 80, delay: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/40?u=a" alt="User" className="h-10 w-10 rounded-full"/>
          <div>
            <p className="font-semibold text-sm text-slate-800">"Máy xịn, ảnh xinh lắm!"</p>
            <p className="text-xs text-slate-500">- Mai Anh, Hà Nội</p>
          </div>
        </div>
      </motion.div>
       <motion.div
        className="hidden lg:block absolute bottom-1/4 -right-12 bg-white p-4 rounded-2xl shadow-lg border border-pink-100"
        initial={{ opacity: 0, x: 50, rotate: 15 }}
        animate={{ opacity: 1, x: 0, rotate: 5 }}
        transition={{ type: "spring", stiffness: 80, delay: 1 }}
      >
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/40?u=b" alt="User" className="h-10 w-10 rounded-full"/>
          <div>
            <p className="font-semibold text-sm text-slate-800">"Thủ tục siêu nhanh gọn."</p>
            <p className="text-xs text-slate-500">- Thuỳ Linh, TP.HCM</p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

// --- Features Section Component (Redesigned) ---
const FeaturesSection = () => (
  <AnimatedSection id="features" className="bg-rose-50">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={index} className="bg-white p-8 rounded-2xl shadow-md border border-pink-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
            <div className="inline-block bg-pink-500 p-4 rounded-full mb-5 ring-4 ring-pink-100">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-pink-900 mb-2">{feature.title}</h3>
            <p className="text-slate-600">{feature.description}</p>
          </div>
        );
      })}
    </div>
  </AnimatedSection>
);

// --- Categories Section Component (with refined interactions) ---
const CategoriesSection = () => (
  <AnimatedSection id="categories">
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-900">Tìm "Chân Ái" Của Bạn</h2>
      <p className="mt-4 text-slate-600 max-w-xl mx-auto">Mỗi dòng máy mang một cá tính riêng. Khám phá phong cách phù hợp nhất với bạn.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {categories.map((cat, index) => (
        <Link to={cat.link} key={index} className="group block">
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-96"
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 150 }}
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

// --- Call To Action Section Component ---
const CallToActionSection = () => (
  <AnimatedSection className="bg-pink-50">
     <div className="bg-gradient-to-tr from-pink-500 to-rose-400 flex flex-col md:flex-row items-center gap-8 md:gap-12 rounded-3xl overflow-hidden p-8 md:p-12 text-white">
        <div className="w-full md:w-1/2 md:order-2">
           <img 
              src="https://images.unsplash.com/photo-1520342890533-405a0d15b17a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80"
              alt="Girl taking photo"
              className="w-full h-auto object-cover rounded-2xl shadow-2xl"
           />
        </div>
        <div className="w-full md:w-1/2 text-center md:text-left md:order-1">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Mới tập chụp? Đừng lo!</h2>
          <p className="mt-4 text-pink-100 text-lg">
            Tụi mình sẽ hướng dẫn bạn cách sử dụng máy cơ bản nhất để có những tấm ảnh thật lung linh.
            Bạn chỉ việc sáng tạo, mọi thứ cứ để Xinh lo.
          </p>
          <Link to="/booking" className="mt-8 inline-block bg-white text-pink-600 font-bold px-8 py-3 rounded-full text-lg hover:bg-rose-50 transition-all duration-300 shadow-xl transform hover:scale-105">
            Chọn máy ngay
          </Link>
        </div>
     </div>
  </AnimatedSection>
);

// --- Footer Component (with social links) ---
const Footer = () => (
  <footer className="bg-slate-800 text-slate-400">
     <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
          <CameraIcon className="h-8 w-8 text-pink-400" />
          <span className="text-xl font-bold text-white tracking-tight">XinhRentals</span>
        </Link>
        <p className="text-sm">Mang đến những trải nghiệm chụp ảnh tuyệt vời nhất.</p>
        
        {/* Social Links */}
        <div className="flex justify-center gap-6 mt-6">
            <a href="#" className="hover:text-pink-400 transition-colors"><i className="fab fa-instagram text-2xl"></i> Instagram</a>
            <a href="#" className="hover:text-pink-400 transition-colors"><i className="fab fa-facebook text-2xl"></i> Facebook</a>
            <a href="#" className="hover:text-pink-400 transition-colors"><i className="fab fa-tiktok text-2xl"></i> TikTok</a>
        </div>

        <p className="mt-8 text-xs text-slate-500">© {new Date().getFullYear()} XinhRentals. All Rights Reserved.</p>
     </div>
  </footer>
);


// ==== Main HomePage Component ====
export default function HomePage() {
  return (
    <div className="bg-white text-slate-800">
      <Header />
      <main className="pt-20">
        <HeroSection />
        <FeaturesSection />
        <CategoriesSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
}