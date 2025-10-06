// ✅ FILE: src/components/Landing/SlideCard.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
];

const translations = {
  en: {
    login: 'Login',
    signup: 'Sign Up'
  },
  ja: {
    login: 'ログイン',
    signup: '新規登録'
  },
  zh: {
    login: '登录',
    signup: '注册'
  },
  ko: {
    login: '로그인',
    signup: '회원가입'
  },
  vi: {
    login: 'Đăng nhập',
    signup: 'Đăng ký'
  }
};

const SlideCard = ({ title, description, image, totalSlides, currentSlide }) => {
  const [selectedLang, setSelectedLang] = useState(localStorage.getItem('appLang') || 'ja');

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLang(newLang);
    localStorage.setItem('appLang', newLang);
  };

  const t = translations[selectedLang] || translations.ja;

  useEffect(() => {
    const canvas = document.getElementById('sparkle-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let stars = Array(100).fill().map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const animate = () => {
      draw();
      stars.forEach(s => {
        s.y -= 0.3;
        if (s.y < 0) s.y = h;
      });
      requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 relative">
      <canvas id="sparkle-bg" className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"></canvas>

      <motion.img
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        src={image}
        alt={title}
        className="w-full max-w-xl h-auto object-contain mb-6 drop-shadow-xl rounded-xl z-10"
      />

      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl md:text-6xl font-bold text-[#f0f4ff] text-center mb-4 font-sans z-10"
      >
        {title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-lg md:text-xl text-gray-200 text-center mb-8 max-w-2xl font-light z-10"
      >
        {description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4 z-10"
      >
        <Link
          to="/login"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base rounded-full shadow-lg w-48 text-center"
        >
          {t.login}
        </Link>
        <Link
          to="/signup"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base rounded-full shadow-lg w-48 text-center"
        >
          {t.signup}
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-white mt-4 z-10"
      >
        <select
          value={selectedLang}
          onChange={handleLanguageChange}
          className="bg-white text-black px-4 py-2 rounded shadow focus:outline-none text-sm"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </motion.div>

      {totalSlides && (
        <div className="flex mt-6 gap-2 z-10">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <span
              key={idx}
              className={`w-3 h-3 rounded-full ${
                idx === currentSlide ? 'bg-white' : 'bg-white/40'
              }`}
            ></span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideCard;
