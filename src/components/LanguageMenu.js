// FILE: src/components/LanguageMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
 
];

const LanguageMenu = () => {
  const { language, changeLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-2 rounded hover:bg-blue-100"
        aria-label="Select Language"
      >
        <Globe size={20} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white text-black rounded shadow z-50">
          {languages.map(({ code, name, flag }) => (
            <button
              key={code}
              onClick={() => {
                changeLanguage(code);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-blue-100 ${
                language === code ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              <span>{flag}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageMenu;
