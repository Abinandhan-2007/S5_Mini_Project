import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, CheckCircle2, Clock, X, BellRing } from 'lucide-react';
import {
  type DosePromptItem,
  markDoseAsAte,
  snoozeDoseFor30Minutes,
  isDoseAlreadyTaken,
} from '../../services/medicationNotificationService';

export const MedicineIntakePromptModal: React.FC = () => {
  const [activeItem, setActiveItem] = useState<DosePromptItem | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleShowModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ item: DosePromptItem }>;
      if (customEvent.detail && customEvent.detail.item) {
        const item = customEvent.detail.item;
        // Only show if not already marked as taken today
        if (!isDoseAlreadyTaken(item.medId, item.slotId)) {
          setActiveItem(item);
          setIsSuccess(false);
        }
      }
    };

    window.addEventListener('carepulse:show_intake_modal', handleShowModal);
    return () => {
      window.removeEventListener('carepulse:show_intake_modal', handleShowModal);
    };
  }, []);

  const handleYesAte = () => {
    if (!activeItem) return;

    const res = markDoseAsAte(activeItem.medId, activeItem.slotId, activeItem.drugName);
    setIsSuccess(true);
    setToastFeedback(`Marked as taken at ${res.timeStr}!`);

    setTimeout(() => {
      setActiveItem(null);
      setIsSuccess(false);
      setToastFeedback(null);
    }, 1400);
  };

  const handleNoSnooze = async (minutes = 30) => {
    if (!activeItem) return;

    await snoozeDoseFor30Minutes(activeItem, minutes);
    setActiveItem(null);
    setToastFeedback(`Reminder set! We will alert you again in ${minutes} minutes.`);
    setTimeout(() => setToastFeedback(null), 4000);
  };

  if (!activeItem && !toastFeedback) return null;

  return (
    <>
      {/* Toast Feedback for Snooze or Success */}
      <AnimatePresence>
        {toastFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 inset-x-4 max-w-sm mx-auto z-[9999] p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-white/15 flex items-center gap-3 text-xs select-none"
          >
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <p className="font-semibold leading-snug flex-1">{toastFeedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Intake Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 overflow-hidden relative"
            >
              {/* Background gradient orb */}
              <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

              {/* Close Button (defaults to snooze) */}
              <button
                onClick={() => handleNoSnooze(30)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                title="Snooze 30 mins"
              >
                <X className="w-4 h-4" />
              </button>

              {/* SUCCESS CONFIRMATION STATE */}
              {isSuccess ? (
                <div className="py-6 flex flex-col items-center text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-9 h-9" />
                  </motion.div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 font-heading">
                      Great Job!
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Marked <strong className="text-slate-800">{activeItem.drugName}</strong> as taken in your app.
                    </p>
                  </div>
                </div>
              ) : (
                /* INTAKE PROMPT STATE */
                <div className="space-y-5">
                  {/* Badge */}
                  <div className="flex items-center gap-2">
                    {activeItem.isSnoozed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        ⏰ 30-Minute Follow-Up
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[11px] font-extrabold">
                        <Pill className="w-3.5 h-3.5 text-[#0B5A54]" />
                        💊 Tablet Eating Time
                      </span>
                    )}
                  </div>

                  {/* Header & Medicine Details */}
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-900/20">
                      <Pill className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight">
                        {activeItem.drugName}
                      </h2>
                      <p className="text-xs font-bold text-[#0B5A54] mt-0.5">
                        {activeItem.dosage} • {activeItem.timingCategory}
                      </p>
                      {activeItem.instructions && (
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {activeItem.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prompt Question */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                    <p className="text-xs font-bold text-slate-700">
                      Have you taken this tablet now?
                    </p>
                  </div>

                  {/* Action Buttons: YES / NO */}
                  <div className="space-y-2 pt-1">
                    {/* YES BUTTON */}
                    <button
                      onClick={handleYesAte}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Yes, I Ate It</span>
                    </button>

                    {/* NO BUTTON (30 Min Snooze) */}
                    <button
                      onClick={() => handleNoSnooze(30)}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>No, Remind Me in 30 Min</span>
                    </button>

                    {/* Quick Demo Option for Immediate Testing */}
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => handleNoSnooze(0.16)} // 10 seconds demo snooze
                        className="text-[10px] text-slate-400 hover:text-slate-600 underline font-medium"
                      >
                        (Test Demo: Repeat in 10 seconds)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
export default MedicineIntakePromptModal;
