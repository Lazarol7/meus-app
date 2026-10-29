import React from 'react';
import { Language, LANGUAGES } from '../constants';
import { cn } from '../lib/utils';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="flex gap-2 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-black/5">
      {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            currentLanguage === lang
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          )}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
