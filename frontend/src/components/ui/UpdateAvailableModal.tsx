import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  X,
  ArrowUpCircle,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { type AppVersionInfo, downloadAndInstallApk } from '../../lib/versionChecker';

interface UpdateAvailableModalProps {
  updateInfo: AppVersionInfo;
  onDismiss: () => void;
}

type UpdateStatus = 'idle' | 'downloading' | 'installing' | 'permission_notice' | 'error';

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  updateInfo,
  onDismiss,
}) => {
  // Hard guard: Update modal is strictly for native mobile APK installations, NEVER web/browsers
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'web') {
    return null;
  }

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleStartUpdate = async () => {
    setStatus('downloading');
    setProgress(0);
    setErrorMessage('');

    const result = await downloadAndInstallApk(updateInfo.downloadUrl, (p) => {
      setProgress(p);
      if (p >= 98) {
        setStatus('installing');
      }
    });

    if (result.success) {
      // Keep modal open on the installing state so the Android system dialog can complete
      // without prematurely triggering the background biometric lock / login screen
      setStatus('installing');
    } else {
      const errStr = (result.error || '').toLowerCase();
      if (
        errStr.includes('permission') ||
        errStr.includes('unknown') ||
        errStr.includes('install_packages') ||
        errStr.includes('cancelled')
      ) {
        setStatus('permission_notice');
        setErrorMessage(
          result.error ||
            'Android requires one-time permission to install unknown apps. Please allow CarePulse in Settings.'
        );
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Download failed — check your connection and try again.');
      }
    }
  };

  const handleLater = () => {
    try {
      sessionStorage.setItem('update_prompt_dismissed', 'true');
    } catch (_) {}
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-teal-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
      >
        {/* TOP BRAND GRADIENT HEADER */}
        <div className="relative bg-gradient-to-r from-[#0B5A54] via-[#12776F] to-[#1FA2AC] p-5 text-white">
          {/* Close button (disabled during active download) */}
          {status !== 'downloading' && (
            <button
              onClick={handleLater}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ArrowUpCircle className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider text-teal-100 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Update Available
              </div>
              <h2 id="update-modal-title" className="text-lg font-black tracking-tight leading-tight">
                CarePulse v{updateInfo.version}
              </h2>
            </div>
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="p-5 space-y-4">
          {/* Version badge comparison */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/60 border border-teal-100/80 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Installed: </span>
              <span className="font-bold text-slate-700">v{updateInfo.installedVersion}</span>
            </div>
            <div className="text-teal-600 font-black">→</div>
            <div>
              <span className="text-slate-500 font-medium">New Version: </span>
              <span className="font-extrabold text-[#0B5A54]">v{updateInfo.version}</span>
            </div>
          </div>

          {/* STATE 1: IDLE - Show release notes */}
          {status === 'idle' && (
            <>
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  What's New in this Update:
                </h3>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto">
                  <p className="whitespace-pre-line">{updateInfo.releaseNotes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>In-app download & native system installer</span>
              </div>

              {/* ACTIONS */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStartUpdate}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#1FA2AC] hover:from-[#094843] hover:to-[#17858D] text-white font-bold text-sm shadow-lg shadow-teal-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download & Install
                </button>

                <button
                  onClick={handleLater}
                  className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Later
                </button>
              </div>
            </>
          )}

          {/* STATE 2: DOWNLOADING - Progress Bar */}
          {status === 'downloading' && (
            <div className="py-4 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-teal-50 flex items-center justify-center border border-teal-200">
                <Loader2 className="w-7 h-7 text-[#0B5A54] animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Downloading Update...</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fetching package directly within app</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#0B5A54] to-[#1FA2AC] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Downloading APK</span>
                  <span className="text-[#0B5A54] font-bold">{progress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: INSTALLING - Waiting for Android Package Installer */}
          {status === 'installing' && (
            <div className="py-4 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Ready to Install</h3>
                <p className="text-xs text-slate-600 leading-relaxed px-2">
                  The Android installer is open. Tap <strong>Update</strong> on the system screen to complete installation.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 text-[11px] text-teal-800 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>The app will automatically restart once installed</span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStartUpdate}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#1FA2AC] hover:from-[#094843] hover:to-[#17858D] text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Re-open Installer Dialog
                </button>

                <button
                  onClick={handleLater}
                  className="w-full py-2 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Skip & Continue to App
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: PERMISSION NOTICE - One-time Android permission */}
          {status === 'permission_notice' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold">Android Permission Required</p>
                  <p className="leading-relaxed text-[11px]">
                    To install updates, Android requires permission to <strong>Install unknown apps</strong>.
                    Please allow CarePulse in Settings, then tap Install again.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStartUpdate}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#1FA2AC] hover:from-[#094843] hover:to-[#17858D] text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Try Install Again
                </button>

                <button
                  onClick={handleLater}
                  className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: ERROR - Clear recovery CTA */}
          {status === 'error' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 space-y-1">
                  <p className="font-bold">Download Failed</p>
                  <p className="leading-relaxed text-[11px]">{errorMessage}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStartUpdate}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#1FA2AC] hover:from-[#094843] hover:to-[#17858D] text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Retry Download
                </button>

                <button
                  onClick={handleLater}
                  className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
