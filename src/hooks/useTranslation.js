import { useLanguage } from '../contexts/LanguageContext';
import translations from '../i18n/translations';


export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return { t };
};
