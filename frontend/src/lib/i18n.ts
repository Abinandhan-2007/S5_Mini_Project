import { create } from 'zustand';

export type AppLanguage = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  subtitle: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇬🇧',
    subtitle: 'Default International (English)',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    flag: '🇮🇳',
    subtitle: 'தமிழ் மொழியில் செயலியைப் பயன்படுத்துங்கள்',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    flag: '🇮🇳',
    subtitle: 'हिंदी भाषा में ऐप का उपयोग करें',
  },
];

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.hospitals': 'Hospitals',
    'nav.history': 'History',
    'nav.profile': 'Profile',
    'nav.healthAi': 'Health AI',

    // Profile & Account Preferences
    'profile.title': 'Patient Profile & Vitals',
    'profile.patientId': 'OFFICIAL CAREPULSE PATIENT ID',
    'profile.dob': 'DATE OF BIRTH',
    'profile.gender': 'GENDER',
    'profile.bloodGroup': 'BLOOD GROUP',
    'profile.emergency': 'EMERGENCY',
    'profile.accountPreferences': 'ACCOUNT PREFERENCES',
    'profile.language': 'Language Preference',
    'profile.languageSubtext': 'English • தமிழ் • हिंदी',
    'profile.advancedSettings': 'Advanced Settings',
    'profile.advancedSettingsSubtext': 'App features, biometric lock, alerts & audio',
    'profile.medicalHistory': 'Medical History & Reports',
    'profile.medicalHistorySubtext': 'Consultation logs & prescriptions',
    'profile.notificationSettings': 'Notification Settings',
    'profile.notificationSettingsSubtext': 'Appointment alerts & reminders',
    'profile.security': 'Security & Biometrics',
    'profile.securitySubtext': 'Password, FaceID & 2FA Auth',
    'profile.help': 'Help Center & 24/7 Support',
    'profile.helpSubtext': 'Contact empathetic care team',
    'profile.signOut': 'Sign Out',
    'profile.editProfile': 'Edit Complete Medical Profile',
    'profile.editSubtitle': 'Update personal information, contact info, emergency contacts & health vitals.',
    'profile.save': 'Save Changes',
    'profile.saving': 'Saving Profile...',
    'profile.cancel': 'Cancel',
    'profile.fullName': 'Full Name',
    'profile.email': 'Email Address',
    'profile.phone': 'Phone Number',
    'profile.address': 'Residential Address',
    'profile.activeStatus': 'Active',

    // Home & Dashboard
    'home.greeting': 'Hello',
    'home.activePrescriptions': 'Active Prescriptions',
    'home.viewAll': 'View All',
    'home.queueStatus': 'Queue Status',
    'home.findHospitals': 'Find Hospitals',
    'home.bookAppointment': 'Book Appointment',
    'home.opdOpen': 'OPD Open Today',
    'home.todaySchedule': "Today's Dosage Schedule:",
    'home.dayOfCourse': 'Days Prescribed',
    'home.noActiveMeds': 'No Active Medications',

    // Hospitals
    'hospitals.title': 'Find Hospitals',
    'hospitals.searchPlaceholder': 'Search hospitals, doctors, specialties, city...',
    'hospitals.viewDetails': 'View Details',
    'hospitals.topRated': 'Top Rated',
    'hospitals.nearestFirst': 'Nearest First',
    'hospitals.mostReviewed': 'Most Reviewed',
    'hospitals.nameAZ': 'Name (A to Z)',

    // Appointment Booking
    'booking.title': 'Book Doctor Consultation',
    'booking.selectDate': 'Select Appointment Date',
    'booking.availableDates': 'Available Dates',
    'booking.timeSlots': 'Doctor Consultation Time Slots',
    'booking.confirm': 'Confirm Consultation Booking',
    'booking.processing': 'Confirming Appointment...',
    'booking.selected': 'Selected',
    'booking.closed': 'Closed',
    'booking.full': 'Full',
    'booking.completed': 'Completed',
    'booking.available': 'Available',

    // Language Modal
    'language.modalTitle': 'Select App Language',
    'language.modalSubtitle': 'Choose your preferred language for CarePulse. The entire app will switch instantly.',
    'language.current': 'Active Language',
    'language.apply': 'Apply Language',
    'language.updatedToast': 'Language updated successfully!',
  },

  ta: {
    // Navigation
    'nav.home': 'முகப்பு',
    'nav.hospitals': 'மருத்துவமனைகள்',
    'nav.history': 'வரலாறு',
    'nav.profile': 'சுயவிவரம்',
    'nav.healthAi': 'ஹெல்த் AI',

    // Profile & Account Preferences
    'profile.title': 'நோயாளி சுயவிவரம் மற்றும் ஆரோக்கிய விவரங்கள்',
    'profile.patientId': 'அதிகாரப்பூர்வ நோயாளி ஐடி',
    'profile.dob': 'பிறந்த தேதி',
    'profile.gender': 'பாலினம்',
    'profile.bloodGroup': 'இரத்த வகை',
    'profile.emergency': 'அவசர தொடர்பு',
    'profile.accountPreferences': 'கணக்கு அமைப்புகள்',
    'profile.language': 'மொழி விருப்பம்',
    'profile.languageSubtext': 'தமிழ் • English • हिंदी',
    'profile.advancedSettings': 'மேம்பட்ட அமைப்புகள்',
    'profile.advancedSettingsSubtext': 'பயன்பாட்டு அம்சங்கள், பயோமெட்ரிக் லாக், விழிப்பூட்டல்கள்',
    'profile.medicalHistory': 'மருத்துவ வரலாறு & அறிக்கைகள்',
    'profile.medicalHistorySubtext': 'ஆலோசனை பதிவுகள் மற்றும் மருந்துச் சீட்டுகள்',
    'profile.notificationSettings': 'அறிவிப்பு அமைப்புகள்',
    'profile.notificationSettingsSubtext': 'சந்திப்பு விழிப்பூட்டல்கள் மற்றும் நினைவூட்டல்கள்',
    'profile.security': 'பாதுகாப்பு & பயோமெட்ரிக்ஸ்',
    'profile.securitySubtext': 'கடவுச்சொல், FaceID & 2FA அங்கீகரிப்பு',
    'profile.help': 'உதவி மையம் & 24/7 ஆதரவு',
    'profile.helpSubtext': 'பராமரிப்பு குழுவைத் தொடர்பு கொள்க',
    'profile.signOut': 'வெளியேறு',
    'profile.editProfile': 'முழு மருத்துவ சுயவிவரத்தைத் திருத்து',
    'profile.editSubtitle': 'தனிப்பட்ட தகவல்கள், தொடர்பு விவரங்கள் மற்றும் ஆரோக்கிய விபரங்களைப் புதுப்பிக்கவும்.',
    'profile.save': 'மாற்றங்களைச் சேமி',
    'profile.saving': 'சேமிக்கப்படுகிறது...',
    'profile.cancel': 'ரத்துசெய்',
    'profile.fullName': 'முழு பெயர்',
    'profile.email': 'மின்னஞ்சல் முகவரி',
    'profile.phone': 'தொலைபேசி எண்',
    'profile.address': 'வீட்டு முகவரி',
    'profile.activeStatus': 'செயலில் உள்ளது',

    // Home & Dashboard
    'home.greeting': 'வணக்கம்',
    'home.activePrescriptions': 'செயலில் உள்ள மருந்துகள்',
    'home.viewAll': 'அனைத்தும்',
    'home.queueStatus': 'வரிசை நிலை',
    'home.findHospitals': 'மருத்துவமனைகளைத் தேடு',
    'home.bookAppointment': 'முன்பதிவு செய்க',
    'home.opdOpen': 'இன்று OPD திறக்கப்பட்டுள்ளது',
    'home.todaySchedule': 'இன்றைய மருந்து அட்டவணை:',
    'home.dayOfCourse': 'நாட்கள் பரிந்துரைக்கப்பட்டது',
    'home.noActiveMeds': 'செயலில் உள்ள மருந்துகள் இல்லை',

    // Hospitals
    'hospitals.title': 'மருத்துவமனைகளைக் கண்டறியவும்',
    'hospitals.searchPlaceholder': 'மருத்துவமனைகள், மருத்துவர்கள், நகரம் தேடு...',
    'hospitals.viewDetails': 'விவரங்களைப் பார்',
    'hospitals.topRated': 'சிறந்த மதிப்பீடு',
    'hospitals.nearestFirst': 'அருகிலுள்ளவை முதலில்',
    'hospitals.mostReviewed': 'அதிக மதிப்புரைகள்',
    'hospitals.nameAZ': 'பெயர் (A to Z)',

    // Appointment Booking
    'booking.title': 'மருத்துவர் ஆலோசனையை முன்பதிவு செய்க',
    'booking.selectDate': 'சந்திப்பு தேதியைத் தேர்ந்தெடுக்கவும்',
    'booking.availableDates': 'கிடைக்கும் தேதிகள்',
    'booking.timeSlots': 'மருத்துவர் ஆலோசனை நேரங்கள்',
    'booking.confirm': 'முன்பதிவை உறுதிசெய்க',
    'booking.processing': 'உறுதிப்படுத்தப்படுகிறது...',
    'booking.selected': 'தேர்ந்தெடுக்கப்பட்டது',
    'booking.closed': 'மூடப்பட்டது',
    'booking.full': 'நிரம்பியது',
    'booking.completed': 'முடிந்தது',
    'booking.available': 'கிடைக்கிறது',

    // Language Modal
    'language.modalTitle': 'பயன்பாட்டு மொழியைத் தேர்வுசெய்க',
    'language.modalSubtitle': 'கேர்பல்ஸ் பயன்பாட்டிற்கான உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும். ஆப் முழுவதும் உடனடியாக மாறும்.',
    'language.current': 'தற்போதைய மொழி',
    'language.apply': 'மொழியைப் பயன்படுத்து',
    'language.updatedToast': 'மொழி வெற்றிகரமாக மாற்றப்பட்டது!',
  },

  hi: {
    // Navigation
    'nav.home': 'होम',
    'nav.hospitals': 'अस्पताल',
    'nav.history': 'इतिहास',
    'nav.profile': 'प्रोफाइल',
    'nav.healthAi': 'हेल्थ AI',

    // Profile & Account Preferences
    'profile.title': 'मरीज प्रोफाइल और स्वास्थ्य विवरण',
    'profile.patientId': 'आधिकारिक केयरपल्स मरीज आईडी',
    'profile.dob': 'जन्म तिथि',
    'profile.gender': 'लिंग',
    'profile.bloodGroup': 'रक्त समूह',
    'profile.emergency': 'आपातकालीन संपर्क',
    'profile.accountPreferences': 'खाता प्राथमिकताएं',
    'profile.language': 'भाषा प्राथमिकता',
    'profile.languageSubtext': 'हिंदी • English • தமிழ்',
    'profile.advancedSettings': 'उन्नत सेटिंग्स',
    'profile.advancedSettingsSubtext': 'ऐप सुविधाएं, बायोमेट्रिक लॉक, अलर्ट और ध्वनि',
    'profile.medicalHistory': 'चिकित्सा इतिहास और रिपोर्ट',
    'profile.medicalHistorySubtext': 'परामर्श रिकॉर्ड और दवा के नुस्खे',
    'profile.notificationSettings': 'अधिसूचना सेटिंग्स',
    'profile.notificationSettingsSubtext': 'अपॉइंटमेंट अलर्ट और रिमाइंडर',
    'profile.security': 'सुरक्षा और बायोमेट्रिक्स',
    'profile.securitySubtext': 'पासवर्ड, फेस आईडी और 2FA प्रमाणीकरण',
    'profile.help': 'सहायता केंद्र और 24/7 सहायता',
    'profile.helpSubtext': 'देखभाल टीम से संपर्क करें',
    'profile.signOut': 'साइन आउट',
    'profile.editProfile': 'पूरी मेडिकल प्रोफाइल संपादित करें',
    'profile.editSubtitle': 'व्यक्तिगत जानकारी, संपर्क विवरण और स्वास्थ्य विटल्स अपडेट करें।',
    'profile.save': 'बदलाव सहेजें',
    'profile.saving': 'सहेजा जा रहा है...',
    'profile.cancel': 'रद्द करें',
    'profile.fullName': 'पूरा नाम',
    'profile.email': 'ईमेल पता',
    'profile.phone': 'फ़ोन नंबर',
    'profile.address': 'आवासीय पता',
    'profile.activeStatus': 'सक्रिय',

    // Home & Dashboard
    'home.greeting': 'नमस्ते',
    'home.activePrescriptions': 'सक्रिय नुस्खे',
    'home.viewAll': 'सभी देखें',
    'home.queueStatus': 'कतार स्थिति',
    'home.findHospitals': 'अस्पताल खोजें',
    'home.bookAppointment': 'अपॉइंटमेंट बुक करें',
    'home.opdOpen': 'आज ओपीडी खुली है',
    'home.todaySchedule': 'आज का खुराक कार्यक्रम:',
    'home.dayOfCourse': 'दिन निर्धारित',
    'home.noActiveMeds': 'कोई सक्रिय दवाएं नहीं',

    // Hospitals
    'hospitals.title': 'अस्पताल खोजें',
    'hospitals.searchPlaceholder': 'अस्पताल, डॉक्टर, विशेषता, शहर खोजें...',
    'hospitals.viewDetails': 'विवरण देखें',
    'hospitals.topRated': 'शीर्ष रेटेड',
    'hospitals.nearestFirst': 'निकटतम पहले',
    'hospitals.mostReviewed': 'सर्वाधिक समीक्षाएं',
    'hospitals.nameAZ': 'नाम (A से Z)',

    // Appointment Booking
    'booking.title': 'डॉक्टर परामर्श बुक करें',
    'booking.selectDate': 'अपॉइंटमेंट तिथि चुनें',
    'booking.availableDates': 'उपलब्ध तिथियां',
    'booking.timeSlots': 'डॉक्टर परामर्श समय स्लॉट',
    'booking.confirm': 'परामर्श बुकिंग की पुष्टि करें',
    'booking.processing': 'पुष्टि हो रही है...',
    'booking.selected': 'चयनित',
    'booking.closed': 'बंद',
    'booking.full': 'फुल',
    'booking.completed': 'पूर्ण',
    'booking.available': 'उपलब्ध',

    // Language Modal
    'language.modalTitle': 'ऐप भाषा चुनें',
    'language.modalSubtitle': 'केयरपल्स के लिए अपनी पसंदीदा भाषा चुनें। पूरा ऐप तुरंत बदल जाएगा।',
    'language.current': 'सक्रिय भाषा',
    'language.apply': 'भाषा लागू करें',
    'language.updatedToast': 'भाषा सफलतापूर्वक बदल दी गई!',
  },
};

const STORAGE_KEY = 'carepulse_app_language';

interface LanguageStoreState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const getInitialLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ta' || saved === 'hi') {
      return saved;
    }
  } catch {}
  return 'en';
};

export const useLanguageStore = create<LanguageStoreState>((set, get) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: AppLanguage) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    set({ language: lang });
  },
  t: (key: string, fallback?: string) => {
    const lang = get().language;
    const table = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return table[key] || TRANSLATIONS.en[key] || fallback || key;
  },
}));

/**
 * Convenient React Hook for UI components
 */
export const useTranslation = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  return {
    language,
    setLanguage,
    t: (key: string, fallback?: string) => {
      const table = TRANSLATIONS[language] || TRANSLATIONS.en;
      return table[key] || TRANSLATIONS.en[key] || fallback || key;
    },
    currentOption,
    options: LANGUAGE_OPTIONS,
  };
};
