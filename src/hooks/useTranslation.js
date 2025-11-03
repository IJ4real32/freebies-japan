// src/hooks/useTranslation.js
import { useLanguage } from '../contexts/LanguageContext';
import translations from '../i18n/translations';

export const useTranslation = () => {
  // ✅ Unconditional hook call (no conditional/typeof checks)
  const ctx = useLanguage();

  // Safe fallbacks if provider isn't mounted (e.g., in tests)
  const language =
    ctx?.language ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) ||
    'en';

  const t = (key) => translations?.[language]?.[key] ?? key;

  const setLang =
    ctx?.setLanguage ||
    ((lng) => {
      try { localStorage.setItem('lang', lng); } catch {}
    });

  return { t, lang: language, setLang };
};
