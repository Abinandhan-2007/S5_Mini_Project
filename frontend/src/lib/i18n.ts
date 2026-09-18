import { create } from 'zustand';

export type AppLanguage = 'en' | 'ta' | 'hi' | 'ml';

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
  {
    code: 'ml',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    flag: '🇮🇳',
    subtitle: 'മലയാളത്തിൽ ആപ്പ് ഉപയോഗിക്കുക',
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
    'profile.languageSubtext': 'தமிழ் • English • हिंदी • മലയാളം',
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
    'profile.languageSubtext': 'हिंदी • English • தமிழ் • മലയാളം',
    'profile.advancedSettings': 'उन्नत सेटिंग्स',
    'profile.advancedSettingsSubtext': 'ऐप सुविधाएं, बायोमेट्रिक लॉक, अलर्ट और ध्वनि',
    'profile.medicalHistory': 'चिकित्सा इतिहास और रिपोर्ट',
    'profile.medicalHistorySubtext': 'परामर्श रिकॉर्ड और दवा के नुस्खे',
    'profile.notificationSettings': 'अधिसूचना सेटिंग्स',
    'profile.notificationSettingsSubtext': 'अपॉइंटमेंट अलर्ट और रिमाइंडर',
    'profile.security': 'सुरक्षा और बायोमेट्रिक्स',
    'profile.securitySubtext': 'पासवर्ड, FaceID और 2FA प्रमाणीकरण',
    'profile.help': 'सहायता केंद्र और 24/7 सहायता',
    'profile.helpSubtext': 'देखभाल टीम से संपर्क करें',
    'profile.signOut': 'साइन आउट',
    'profile.editProfile': 'पूरी मेडिकल प्रोफाइल संपादित करें',
    'profile.editSubtitle': 'व्यक्तिगत जानकारी, संपर्क और स्वास्थ्य विवरण अपडेट करें।',
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

  ml: {
    // Navigation
    'nav.home': 'ഹോം',
    'nav.hospitals': 'ആശുപത്രികൾ',
    'nav.history': 'ചരിത്രം',
    'nav.profile': 'പ്രൊഫൈൽ',
    'nav.healthAi': 'ഹെൽത്ത് AI',

    // Profile & Account Preferences
    'profile.title': 'രോഗി പ്രൊഫൈലും ആരോഗ്യ വിവരങ്ങളും',
    'profile.patientId': 'ഔദ്യോഗിക പേഷ്യന്റ് ഐഡി',
    'profile.dob': 'ജനനത്തീയതി',
    'profile.gender': 'ലിംഗഭേദം',
    'profile.bloodGroup': 'രക്തഗ്രൂപ്പ്',
    'profile.emergency': 'അടിയന്തര കോൺടാക്റ്റ്',
    'profile.accountPreferences': 'അക്കൗണ്ട് മുൻഗണനകൾ',
    'profile.language': 'ഭാഷ മുൻഗണന',
    'profile.languageSubtext': 'മലയാളം • English • தமிழ் • हिंदी',
    'profile.advancedSettings': 'വിപുലമായ ക്രമീകരണങ്ങൾ',
    'profile.advancedSettingsSubtext': 'ആപ്പ് ഫീച്ചറുകൾ, ബയോമെട്രിക് ലോക്ക്, അലേർട്ടുകൾ',
    'profile.medicalHistory': 'മെഡിക്കൽ ചരിത്രവും റിപ്പോർട്ടുകളും',
    'profile.medicalHistorySubtext': 'കൺസൾട്ടേഷൻ രേഖകളും കുറിപ്പടികളും',
    'profile.notificationSettings': 'അറിയിപ്പ് ക്രമീകരണങ്ങൾ',
    'profile.notificationSettingsSubtext': 'അപ്പോയിന്റ്മെന്റ് അലേർട്ടുകളും ഓർമ്മപ്പെടുത്തലുകളും',
    'profile.security': 'സുരക്ഷയും ബയോമെട്രിക്സും',
    'profile.securitySubtext': 'പാസ്‌വേഡ്, FaceID & 2FA പ്രാമാണീകരണം',
    'profile.help': 'സഹായ കേന്ദ്രവും 24/7 പിന്തുണയും',
    'profile.helpSubtext': 'പരിചരണ ടീമുമായി ബന്ധപ്പെടുക',
    'profile.signOut': 'സൈൻ ഔട്ട്',
    'profile.editProfile': 'മെഡിക്കൽ പ്രൊഫൈൽ എഡിറ്റ് ചെയ്യുക',
    'profile.editSubtitle': 'വ്യക്തിഗത വിവരങ്ങൾ, കോൺടാക്റ്റ്, ആരോഗ്യ വിവരങ്ങൾ പുതുക്കുക.',
    'profile.save': 'മാറ്റങ്ങൾ സംരക്ഷിക്കുക',
    'profile.saving': 'സംരക്ഷിക്കുന്നു...',
    'profile.cancel': 'റദ്ദാക്കുക',
    'profile.fullName': 'മുഴുവൻ പേര്',
    'profile.email': 'ഇമെയിൽ വിലാസം',
    'profile.phone': 'ഫോൺ നമ്പർ',
    'profile.address': 'വാസസ്ഥല വിലാസം',
    'profile.activeStatus': 'സജീവം',

    'profile.vitalStats': 'പ്രധാന മെഡിക്കൽ സ്ഥിതിവിവരക്കണക്കുകൾ',
    'profile.patientIdDesc': 'റിസപ്ഷനിലും ഡോക്ടറുടെ കൺസൾട്ടേഷനിലും എമർജൻസിയിലും ഈ ഐഡി കാണിക്കുക',
    'profile.contactSet': 'കോൺടാക്റ്റ് നൽകി',
    'profile.primary': 'പ്രാഥമികം',
    'profile.incompleteTitle': 'മെഡിക്കൽ പ്രൊഫൈൽ അപൂർണ്ണമാണ്',
    'profile.incompleteDesc': 'അപ്പോയിന്റ്മെന്റുകൾ ബുക്ക് ചെയ്യുന്നതിന് നിങ്ങളുടെ കോൺടാക്റ്റ്, എമർജൻസി വിവരങ്ങൾ നൽകുക.',
    'profile.completeNow': 'ഇപ്പോൾ പൂർത്തിയാക്കുക →',
    'profile.medicalHealthId': 'മെഡിക്കൽ ഹെൽത്ത് ഐഡി',
    'profile.qrCheckinDesc': 'കെയർപൾസ് ക്വിക്ക് ഡെസ്ക് & ഒപിഡി ചെക്ക്-ഇൻ',
    'profile.closeQr': 'QR കോഡ് അടയ്ക്കുക',
    'profile.copiedToast': 'പേഷ്യന്റ് ഐഡി ക്ലിപ്പ്ബോർഡിലേക്ക് പകർത്തി!',

    // Common
    'common.on': 'ഓൺ',
    'common.off': 'ഓഫ്',
    'common.copy': 'പകർത്തുക',
    'common.notSet': 'നൽകിയിട്ടില്ല',
    'common.yrs': 'വയസ്സ്',

    // Settings
    'settings.featuresTitle': 'ആപ്പ് ഫീച്ചറുകളും നിയന്ത്രണങ്ങളും',
    'settings.badge': 'ക്രമീകരണങ്ങൾ',
    'settings.medAlerts': 'മരുന്ന് കഴിക്കാനുള്ള അലേർട്ടുകൾ',
    'settings.medAlertsSubtext': 'അതെ/അല്ല 30 മിനിറ്റ് സ്നൂസ് ഉള്ള അലേർട്ടുകൾ',
    'settings.biometricLock': 'ബയോമെട്രിക് ആപ്പ് ലോക്ക്',
    'settings.biometricLockSubtextActive': '1-ടച്ച് ഫെയ്സ് ഐഡിയും ഫിംഗർപ്രിന്റും സജീവം',
    'settings.biometricLockSubtextDisabled': 'നിഷ്ക്രിയമാക്കി — പാസ്‌വേഡ് ആവശ്യമാണ്',
    'settings.pushAlerts': 'ആരോഗ്യ & ക്യൂ അലേർട്ടുകൾ',
    'settings.pushAlertsSubtext': 'തത്സമയ ഒപിഡി ടോക്കൺ കോളുകളും ഡോക്ടർ അലേർട്ടുകളും',
    'settings.autoUpdate': 'ഓട്ടോമാറ്റിക് അപ്ഡേറ്റ് പരിശോധന',
    'settings.autoUpdateSubtext': 'തുടങ്ങുമ്പോൾ ഏറ്റവും പുതിയ ഫീച്ചറുകൾ പരിശോധിക്കുന്നു',
    'settings.audioChimes': 'ഓഡിയോ അലേർട്ടുകളും ശബ്ദങ്ങളും',
    'settings.audioChimesSubtext': 'അലേർട്ടുകളിലും റിമൈൻഡറുകളിലും ശബ്ദം',
    'settings.encryptionTitle': 'എൻഡ്-ടു-എൻഡ് എൻക്രിപ്റ്റ് ചെയ്ത ക്രമീകരണങ്ങൾ',
    'settings.encryptionDesc': 'എല്ലാ ഫീച്ചറുകളും ബയോമെട്രിക് വിവരങ്ങളും നിങ്ങളുടെ ഉപകരണത്തിൽ സുരക്ഷിതമായി സൂക്ഷിച്ചിരിക്കുന്നു.',

    // Home & Dashboard
    'home.greeting': 'നമസ്കാരം',
    'home.activePrescriptions': 'സജീവ കുറിപ്പടികൾ',
    'home.viewAll': 'എല്ലാം കാണുക',
    'home.queueStatus': 'ക്യൂ നില',
    'home.findHospitals': 'ആശുപത്രികൾ കണ്ടെത്തുക',
    'home.bookAppointment': 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക',
    'home.opdOpen': 'ഇന്ന് ഒപിഡി പ്രവർത്തിക്കുന്നുണ്ട്',
    'home.todaySchedule': 'ഇന്നത്തെ ഡോസ് ഷെഡ്യൂൾ:',
    'home.dayOfCourse': 'നിർദ്ദേശിച്ച ദിവസങ്ങൾ',
    'home.noActiveMeds': 'സജീവ മരുന്നുകൾ ലഭ്യമല്ല',

    // Hospitals
    'hospitals.title': 'ആശുപത്രികൾ കണ്ടെത്തുക',
    'hospitals.searchPlaceholder': 'ആശുപത്രികൾ, ഡോക്ടർമാർ, നഗരം തിരയുക...',
    'hospitals.viewDetails': 'വിശദാംശങ്ങൾ കാണുക',
    'hospitals.topRated': 'ഉയർന്ന റേറ്റിംഗ്',
    'hospitals.nearestFirst': 'ഏറ്റവും അടുത്തത് ആദ്യം',
    'hospitals.mostReviewed': 'കൂടുതൽ അവലോകനങ്ങൾ',
    'hospitals.nameAZ': 'പേര് (A മുതൽ Z വരെ)',

    // Appointment Booking
    'booking.title': 'ഡോക്ടർ കൺസൾട്ടേഷൻ ബുക്ക് ചെയ്യുക',
    'booking.selectDate': 'അപ്പോയിന്റ്മെന്റ് തീയതി തിരഞ്ഞെടുക്കുക',
    'booking.availableDates': 'ലഭ്യമായ തീയതികൾ',
    'booking.timeSlots': 'ഡോക്ടർ കൺസൾട്ടേഷൻ സമയ സ്ലോട്ടുകൾ',
    'booking.confirm': 'കൺസൾട്ടേഷൻ ബുക്കിംഗ് സ്ഥിരീകരിക്കുക',
    'booking.processing': 'സ്ഥിരീകരിക്കുന്നു...',
    'booking.selected': 'തിരഞ്ഞെടുത്തു',
    'booking.closed': 'അടച്ചു',
    'booking.full': 'പൂർണ്ണമായി',
    'booking.completed': 'പൂർത്തിയായി',
    'booking.available': 'ലഭ്യമാണ്',

    // Language Modal
    'language.modalTitle': 'ആപ്പ് ഭാഷ തിരഞ്ഞെടുക്കുക',
    'language.modalSubtitle': 'കെയർപൾസിനായി നിങ്ങളുടെ ഇഷ്ട ഭാഷ തിരഞ്ഞെടുക്കുക. ആപ്പ് ഉടനടി മാറും.',
    'language.current': 'സജീവ ഭാഷ',
    'language.apply': 'ഭാഷ പ്രയോഗിക്കുക',
    'language.updatedToast': 'ഭാഷ വിജയകരമായി മാറ്റി!',
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
    if (saved === 'en' || saved === 'ta' || saved === 'hi' || saved === 'ml') {
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
    if (newLang && (newLang === 'en' || newLang === 'ta' || newLang === 'hi' || newLang === 'ml')) {
      if (useLanguageStore.getState().language !== newLang) {
        useLanguageStore.setState({ language: newLang });
      }
    }
  };
  const syncStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const newLang = e.newValue as AppLanguage;
      if (newLang === 'en' || newLang === 'ta' || newLang === 'hi' || newLang === 'ml') {
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
