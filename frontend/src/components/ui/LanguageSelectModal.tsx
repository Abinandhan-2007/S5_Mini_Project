import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation, LANGUAGE_OPTIONS, type AppLanguage } from '../../lib/i18n';

export interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [selected, setSelected] = React.useState<AppLanguage>(language);
  const [showToast, setShowToast] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelected(language);
      setShowToast(false);
    }
  }, [isOpen, language]);

  const handleSelect = (code: AppLanguage) => {
    setSelected(code);
    setLanguage(code);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-5 flex flex-col relative space-y-3"
      >
        {/* Top close button */}
        <div className="flex justify-end -mt-0.5 -mr-0.5">
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.code;

            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                className={clsx(
                  'w-full p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 border text-left cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? 'bg-[#E3F3F1] border-2 border-[#0B5A54] shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-2xl sm:text-3xl shrink-0 select-none">
                    {opt.flag}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'text-base font-black font-heading leading-tight truncate',
                          isSelected ? 'text-[#0B5A54]' : 'text-slate-900'
                        )}
                      >
                        {opt.nativeLabel}
                      </span>
                      {opt.code !== 'en' && (
                        <span className="text-xs font-bold text-slate-400">
                          ({opt.label})
                        </span>
                      )}
                      {isSelected && (
                        <span className="bg-[#0B5A54] text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                          {t('language.current', 'Active')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {opt.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all',
                    isSelected
                      ? 'bg-[#0B5A54] border-[#0B5A54] text-white shadow-2xs'
                      : 'border-slate-300 bg-white text-transparent'
                  )}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Toast confirmation */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="mx-5 mb-4 p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('language.updatedToast', 'Language updated successfully!')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
