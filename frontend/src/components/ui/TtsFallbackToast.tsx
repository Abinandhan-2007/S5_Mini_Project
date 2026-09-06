import React, { useEffect, useState } from 'react';
import { VolumeX, X } from 'lucide-react';

export const TtsFallbackToast: React.FC = () => {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleFallback = (e: any) => {
      const msg = e?.detail?.message || "Voice narration isn't available in this language, using English.";
      setNotice(msg);
    };

    window.addEventListener('carepulse:tts_fallback', handleFallback);
    return () => window.removeEventListener('carepulse:tts_fallback', handleFallback);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/60 flex items-center justify-between gap-3 animate-slide-down">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <VolumeX className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-slate-200 leading-snug">{notice}</p>
      </div>
      <button
        onClick={() => setNotice(null)}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
