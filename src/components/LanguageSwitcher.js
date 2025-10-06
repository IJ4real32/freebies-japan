import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <select
      value={language}
      onChange={handleChange}
      className="p-2 border rounded text-sm bg-white shadow"
    >
      <option value="en">English</option>
      <option value="ja">日本語</option>
      
    </select>
  );
};

export default LanguageSwitcher;
