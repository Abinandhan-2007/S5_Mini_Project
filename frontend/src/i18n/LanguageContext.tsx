import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type LanguageInfo } from './types';
import { en, type TranslationSchema } from './translations/en';
import { ta } from './translations/ta';
import { ml } from './translations/ml';
import { hi } from './translations/hi';

const translations: Record<SupportedLanguage, TranslationSchema> = {
  en,
  ta,
  ml,
  hi,
};

const STORAGE_KEY = 'carepulse_app_language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
  t: (path: string, fallbackOrParams?: string | Record<string, any>, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getNestedTranslation(obj: any, path: string): string | null {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
}

function interpolate(text: string, params?: Record<string, any>): string {
  if (!text || !params) return text;
  let result = text;
  for (const [key, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
        if (saved && ['en', 'ta', 'ml', 'hi'].includes(saved)) {
          return saved;
        }
      } catch (_) {}
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent('carepulse:language_changed', { detail: { language: newLang } }));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as SupportedLanguage;
        if (['en', 'ta', 'ml', 'hi'].includes(newLang)) {
          setLanguageState(newLang);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const currentLanguageInfo = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const t = useCallback(
    (path: string, fallbackOrParams?: string | Record<string, any>, paramsObj?: Record<string, any>): string => {
      let fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
      let params = typeof fallbackOrParams === 'object' ? fallbackOrParams : paramsObj;

      // 1. Try active language
      const activeDict = translations[language];
      let val = getNestedTranslation(activeDict, path);

      // 2. Fallback to English if missing in target
      if (val === null && language !== 'en') {
        val = getNestedTranslation(translations.en, path);
      }

      // 3. Fallback to provided string or the key itself
      const resolved = val ?? fallback ?? path;
      return interpolate(resolved, params);
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo,
      t,
    }),
    [language, setLanguage, currentLanguageInfo, t]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export function useTranslation(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback if called outside provider (e.g. portals)
    return {
      language: 'en',
      setLanguage: () => {},
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo: SUPPORTED_LANGUAGES[0],
      t: (path, fallbackOrParams, params) => {
        let fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
        let p = typeof fallbackOrParams === 'object' ? fallbackOrParams : params;
        const val = getNestedTranslation(translations.en, path) ?? fallback ?? path;
        return interpolate(val, p);
      },
    };
  }
  return ctx;
}
