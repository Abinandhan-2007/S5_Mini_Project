export type SupportedLanguage = 'en' | 'ta' | 'ml' | 'hi';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  label: string;
  nativeLabel: string;
  subtitle: string;
  bcp47: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    label: 'English',
    nativeLabel: 'English',
    subtitle: 'Default International (English)',
    bcp47: 'en-US',
    flag: '🇬🇧',
    direction: 'ltr',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    subtitle: 'தமிழ் மொழியில் செயலியைப் பயன்படுத்துங்கள்',
    bcp47: 'ta-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    subtitle: 'हिंदी भाषा में ऐप का उपयोग करें',
    bcp47: 'hi-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    subtitle: 'മലയാളത്തിൽ ആപ്പ് ഉപയോഗിക്കുക',
    bcp47: 'ml-IN',
    flag: '🇮🇳',
    direction: 'ltr',
  },
];
