// ✅ FILE: src/pages/LandingPage.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import onboardingSlides from '../data/onboardingSlides';
import { useTranslation } from '../hooks/useTranslation';

const LandingPage = () => {
  const { t } = useTranslation();
  const query = new URLSearchParams(window.location.search);
  const slideIndex = parseInt(query.get('slide')) || 0;
  const slide = onboardingSlides[slideIndex];
  const navigate = useNavigate();

  const handleNext = () => {
    if (slideIndex < onboardingSlides.length - 1) {
      navigate(`/?slide=${slideIndex + 1}`);
    } else {
      navigate('/login');
    }
  };

  const handleBack = () => {
    if (slideIndex > 0) {
      navigate(`/?slide=${slideIndex - 1}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center text-center px-4 py-8 bg-gradient-to-br from-indigo-800 via-blue-900 to-purple-900 text-white relative overflow-hidden">
      {/* Animated background for aurora and stars */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-700 via-indigo-800 to-transparent opacity-30 animate-pulse" />
        <div className="absolute w-full h-full bg-[radial-gradient(#ffffff33_1px,_transparent_1px)] bg-[length:20px_20px] opacity-10" />
      </div>

      <div className="flex flex-col items-center z-10">
        <img
          src={slide.image}
          alt="Slide Illustration"
          className="w-full max-w-md h-auto object-contain mb-6 rounded-xl shadow"
        />
        <h2 className="text-3xl font-bold mb-4 drop-shadow-md">
          {t(slide.title)}
        </h2>
        <p className="text-md max-w-md mb-4 leading-relaxed text-gray-100">
          {t(slide.description)}
        </p>
        {slideIndex === onboardingSlides.length - 1 && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {t('login')}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-blue-600 px-4 py-2 rounded border border-blue-600 hover:bg-gray-200"
            >
              {t('signup')}
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs mx-auto mt-8 z-10">
        <div className="flex justify-between">
          {slideIndex > 0 ? (
            <button
              onClick={handleBack}
              className="text-blue-200 hover:underline"
            >
              ← {t('back')}
            </button>
          ) : <span />}

          <button
            onClick={handleNext}
            className="text-blue-200 hover:underline"
          >
            {slideIndex < onboardingSlides.length - 1 ? t('next') + ' →' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
