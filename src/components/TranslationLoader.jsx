'use client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TranslationLoader() {
  const { isTranslating, targetLang } = useLanguage();

  if (!isTranslating) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-2xl border border-green-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <p className="text-green-800 font-medium animate-pulse">
          Translating AfriCart to {targetLang}...
        </p>
      </div>
    </div>
  );
}