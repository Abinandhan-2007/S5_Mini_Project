export type SupportedLanguage = 'en' | 'ta' | 'ml' | 'hi';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  bcp47: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    bcp47: 'en-US',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    bcp47: 'ta-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    bcp47: 'ml-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    bcp47: 'hi-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
];
