import { create } from 'zustand';

export type AppLanguage = 'en' | 'ta';

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
    'profile.languageSubtext': 'English • தமிழ்',
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
    'profile.languageSubtext': 'தமிழ் • English',
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

    'profile.vitalStats': 'முக்கிய மருத்துவ புள்ளிவிவரங்கள்',
    'profile.patientIdDesc': 'வரவேற்பு, மருத்துவர் ஆலோசனை மற்றும் அவசர சிகிச்சையின் போது இந்த ஐடியைக் காட்டவும்',
    'profile.contactSet': 'தொடர்பு அமைக்கப்பட்டது',
    'profile.primary': 'முதன்மை',
    'profile.incompleteTitle': 'மருத்துவ சுயவிவரம் முழுமையடையவில்லை',
    'profile.incompleteDesc': 'முன்பதிவு செய்ய உங்கள் தொடர்பு மற்றும் அவசர விவரங்களைச் சேர்க்கவும்.',
    'profile.completeNow': 'இப்போதே முடிக்க →',
    'profile.medicalHealthId': 'மருத்துவ அடையாள அட்டை',
    'profile.qrCheckinDesc': 'கேர்பல்ஸ் உடனடி உதவி & OPD செக்-இன்',
    'profile.closeQr': 'QR குறியீட்டை மூடு',
    'profile.copiedToast': 'நோயாளி ஐடி நகலெடுக்கப்பட்டது!',

    // Common
    'common.on': 'இயக்கத்தில்',
    'common.off': 'முடக்கப்பட்டது',
    'common.copy': 'நகலெடு',
    'common.notSet': 'அமைக்கப்படவில்லை',
    'common.yrs': 'வயது',

    // Settings
    'settings.featuresTitle': 'பயன்பாட்டு அம்சங்கள் & அமைப்புகள்',
    'settings.badge': 'அமைப்புகள்',
    'settings.medAlerts': 'மாத்திரை உட்கொள்ளும் விழிப்பூட்டல்கள்',
    'settings.medAlertsSubtext': 'ஆம்/இல்லை 30 நிமிட நினைவூட்டலுடன் எச்சரிக்கைகள்',
    'settings.biometricLock': 'பயோமெட்ரிக் ஆப் லாக்',
    'settings.biometricLockSubtextActive': 'விரல்ரேகை மற்றும் Face ID பாதுகாப்பு செயலில் உள்ளது',
    'settings.biometricLockSubtextDisabled': 'முடக்கப்பட்டுள்ளது — கடவுச்சொல் தேவை',
    'settings.pushAlerts': 'ஆரோக்கியம் & வரிசை அறிவிப்புகள்',
    'settings.pushAlertsSubtext': 'நேரலை OPD டோக்கன் அழைப்புகள் & மருத்துவர் அறிவிப்புகள்',
    'settings.autoUpdate': 'தானியங்கி புதுப்பிப்பு சோதனைகள்',
    'settings.autoUpdateSubtext': 'துவக்கத்தில் புதிய அம்சங்களைச் சரிபார்க்கிறது',
    'settings.audioChimes': 'ஒலி மற்றும் மணிகள்',
    'settings.audioChimesSubtext': 'விழிப்பூட்டல்கள் மற்றும் நினைவூட்டல்களில் ஒலி',
    'settings.encryptionTitle': 'முழுமையான மறைகுறியாக்கப்பட்ட அமைப்புகள்',
    'settings.encryptionDesc': 'அனைத்து விருப்பத்தேர்வுகள் மற்றும் பாதுகாப்பு அமைப்புகள் உங்கள் சாதனத்தில் பாதுகாப்பாக சேமிக்கப்படுகின்றன.',

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
    if (saved === 'en' || saved === 'ta') {
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('carepulse:language_changed', { detail: { language: lang } }));
      }
    } catch {}
    set({ language: lang });
  },
  t: (key: string, fallback?: string) => {
    const lang = get().language;
    const table = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return table[key] || TRANSLATIONS.en[key] || fallback || key;
  },
}));

// Cross-instance and cross-window sync
if (typeof window !== 'undefined') {
  const syncLanguage = (e: Event) => {
    const custom = e as CustomEvent<{ language: AppLanguage }>;
    const newLang = custom.detail?.language;
    if (newLang && (newLang === 'en' || newLang === 'ta')) {
      if (useLanguageStore.getState().language !== newLang) {
        useLanguageStore.setState({ language: newLang });
      }
    }
  };
  const syncStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const newLang = e.newValue as AppLanguage;
      if (newLang === 'en' || newLang === 'ta') {
        if (useLanguageStore.getState().language !== newLang) {
          useLanguageStore.setState({ language: newLang });
        }
      }
    }
  };
  window.addEventListener('carepulse:language_changed', syncLanguage);
  window.addEventListener('storage', syncStorage);
}

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
