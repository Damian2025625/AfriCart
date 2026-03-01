'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [targetLang, setTargetLang] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved) {
      console.log('📖 Restoring saved language:', saved);
      setTargetLang(saved);
    }
  }, []);

  const switchLanguage = (langName) => {
    console.log('🔄 Switching language to:', langName);
    setTargetLang(langName);
    localStorage.setItem('preferredLanguage', langName); // ✅ Save it
  };

  return (
    <LanguageContext.Provider value={{ targetLang, switchLanguage, isTranslating, setIsTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
