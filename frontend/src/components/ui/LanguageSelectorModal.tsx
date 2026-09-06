import React from 'react';
import { Check, Globe, X, Volume2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation, type SupportedLanguage, type LanguageInfo } from '../../i18n';
import { checkTtsVoiceAvailability } from '../../lib/speechUtils';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, languages, t } = useTranslation();

  if (!isOpen) return null;

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setTimeout(() => {
      onClose();
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 to-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {t('profile.appLanguage', 'App Language')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t('profile.appLanguageDesc', 'Choose your preferred language')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Options List */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {languages.map((lang: LanguageInfo) => {
            const isSelected = language === lang.code;
            const voiceReport = checkTtsVoiceAvailability(lang.code);

            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={clsx(
                  'w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group',
                  isSelected
                    ? 'border-teal-600 bg-teal-50/60 shadow-sm ring-2 ring-teal-500/20'
                    : 'border-slate-200/80 hover:border-teal-300 hover:bg-slate-50/80'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl select-none" role="img" aria-label={lang.name}>
                    {lang.flag}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'text-base font-bold transition-colors',
                          isSelected ? 'text-teal-900' : 'text-slate-800 group-hover:text-teal-800'
                        )}
                      >
                        {lang.nativeName}
                      </span>
                      {lang.nativeName !== lang.name && (
                        <span className="text-xs font-semibold text-slate-400">
                          ({lang.name})
                        </span>
                      )}
                    </div>
                    {/* TTS Availability Indicator */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Volume2
                        className={clsx(
                          'w-3 h-3',
                          voiceReport.isAvailable ? 'text-emerald-600' : 'text-amber-500'
                        )}
                      />
                      <span
                        className={clsx(
                          'text-[10px] font-medium',
                          voiceReport.isAvailable ? 'text-emerald-700' : 'text-amber-600'
                        )}
                      >
                        {voiceReport.isAvailable ? 'Voice Available' : 'Audio Stream Fallback'}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105'
                      : 'border border-slate-300 group-hover:border-teal-400'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Language applies to all patient app screens (Home, Appointments, Medicine Info, Prescriptions). Staff & hospital portals remain in English.
          </p>
        </div>
      </div>
    </div>
  );
};
