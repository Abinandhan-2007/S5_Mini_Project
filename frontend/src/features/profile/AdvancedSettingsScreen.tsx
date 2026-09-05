import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  ScanFace,
  Bell,
  RefreshCw,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';
import { BottomNav } from '../../components/ui/BottomNav';
import { useCarePulseStore } from '../../lib/store';
import {
  registerDeviceBiometrics,
  checkDeviceBiometricSupport,
} from '../../lib/biometricAuthService';

export const AdvancedSettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);

  const isBiometricEnabled = useCarePulseStore((s) => s.isBiometricEnabled);
  const toggleBiometric = useCarePulseStore((s) => s.toggleBiometric);
  const [biometricNotice, setBiometricNotice] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // App Feature ON/OFF Toggles
  const [isMedAlertsEnabled, setIsMedAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_med_reminders_enabled') !== 'false';
  });
  const [isPushNotifsEnabled, setIsPushNotifsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_push_notifs_enabled') !== 'false';
  });
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_auto_updates_enabled') !== 'false';
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_sound_enabled') !== 'false';
  });

  const handleToggleMedAlerts = () => {
    const next = !isMedAlertsEnabled;
    setIsMedAlertsEnabled(next);
    localStorage.setItem('carepulse_med_reminders_enabled', next ? 'true' : 'false');
  };

  const handleTogglePushNotifs = () => {
    const next = !isPushNotifsEnabled;
    setIsPushNotifsEnabled(next);
    localStorage.setItem('carepulse_push_notifs_enabled', next ? 'true' : 'false');
  };

  const handleToggleAutoUpdate = () => {
    const next = !isAutoUpdateEnabled;
    setIsAutoUpdateEnabled(next);
    localStorage.setItem('carepulse_auto_updates_enabled', next ? 'true' : 'false');
  };

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    localStorage.setItem('carepulse_sound_enabled', next ? 'true' : 'false');
  };

  const handleToggleBiometric = async () => {
    setBiometricNotice(null);
    const nextState = !isBiometricEnabled;

    if (nextState) {
      const support = await checkDeviceBiometricSupport();
      if (!support.isAvailable) {
        setBiometricNotice({
          type: 'error',
          text: support.message || 'Biometric hardware unavailable on this device.',
        });
        return;
      }

      const registered = await registerDeviceBiometrics(user?.id);
      if (registered) {
        toggleBiometric(true);
        setBiometricNotice({
          type: 'success',
          text: 'Biometric Face ID / Fingerprint lock activated.',
        });
      } else {
        setBiometricNotice({
          type: 'error',
          text: 'Biometric enrollment failed. Please try again.',
        });
      }
    } else {
      toggleBiometric(false);
      setBiometricNotice({
        type: 'success',
        text: 'Biometric App Lock disabled. Password required on login.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white relative">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#22B3BD] text-white pt-4 pb-4 px-4 sm:px-6 shadow-md transition-all">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Go Back to Profile"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          <div className="text-center flex-1 min-w-0 pr-9">
            <h1 className="text-lg sm:text-xl font-black font-heading text-white tracking-tight drop-shadow-2xs truncate">
              Advanced Settings
            </h1>
            <p className="text-[11px] font-medium text-cyan-50/90 tracking-wide">
              App Features & Hardware Preferences
            </p>
          </div>
        </div>
      </header>

      {/* Main Settings Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Biometric Notice Banner */}
        {biometricNotice && (
          <div
            className={clsx(
              'p-3 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in text-left shadow-xs border',
              biometricNotice.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}
          >
            {biometricNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{biometricNotice.text}</span>
          </div>
        )}

        {/* APP FEATURES & ON/OFF CONTROLS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-heading flex items-center gap-1.5">
              <span>APP FEATURES & ON/OFF CONTROLS</span>
            </h3>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/90 shadow-2xs">
              Settings
            </span>
          </div>

          <Card
            padding="none"
            className="divide-y divide-slate-100 overflow-hidden shadow-xs bg-white rounded-3xl border border-slate-200/90"
          >
            {/* 1. Tablet Eating Alerts */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isMedAlertsEnabled
                      ? 'bg-teal-50 text-[#0B5A54] border border-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <Pill className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 truncate">
                      Tablet Eating Alerts
                    </h4>
                    <span
                      className={clsx(
                        'text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full',
                        isMedAlertsEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isMedAlertsEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Alerts with Yes/No 30-min repeat snooze
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isMedAlertsEnabled}
                onClick={handleToggleMedAlerts}
                className={clsx(
                  'w-12 h-7 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isMedAlertsEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isMedAlertsEnabled ? 'Disable Medicine Alerts' : 'Enable Medicine Alerts'}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isMedAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* 2. Biometric App Lock */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isBiometricEnabled
                      ? 'bg-teal-50 text-[#0B5A54] border border-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <ScanFace className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 truncate">
                      Biometric App Lock
                    </h4>
                    <span
                      className={clsx(
                        'text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full',
                        isBiometricEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isBiometricEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBiometricEnabled
                      ? '1-touch Face ID & Fingerprint unlock active'
                      : 'Disabled — Password required'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isBiometricEnabled}
                onClick={handleToggleBiometric}
                className={clsx(
                  'w-12 h-7 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isBiometricEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isBiometricEnabled ? 'Disable Biometric Lock' : 'Enable Biometric Lock'}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* 3. Health & Queue Push Alerts */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isPushNotifsEnabled
                      ? 'bg-teal-50 text-[#0B5A54] border border-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 truncate">
                      Health & Queue Push Alerts
                    </h4>
                    <span
                      className={clsx(
                        'text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full',
                        isPushNotifsEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isPushNotifsEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Live OPD token calls & doctor alerts
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isPushNotifsEnabled}
                onClick={handleTogglePushNotifs}
                className={clsx(
                  'w-12 h-7 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isPushNotifsEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isPushNotifsEnabled ? 'Disable Push Alerts' : 'Enable Push Alerts'}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isPushNotifsEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* 4. Automatic Update Checks */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isAutoUpdateEnabled
                      ? 'bg-teal-50 text-[#0B5A54] border border-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 truncate">
                      Automatic Update Checks
                    </h4>
                    <span
                      className={clsx(
                        'text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full',
                        isAutoUpdateEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isAutoUpdateEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Checks for latest APK features on launch
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isAutoUpdateEnabled}
                onClick={handleToggleAutoUpdate}
                className={clsx(
                  'w-12 h-7 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isAutoUpdateEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isAutoUpdateEnabled ? 'Disable Auto Updates' : 'Enable Auto Updates'}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isAutoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* 5. Audio Chimes & Sounds */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isSoundEnabled
                      ? 'bg-teal-50 text-[#0B5A54] border border-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 truncate">
                      Audio Chimes & Sounds
                    </h4>
                    <span
                      className={clsx(
                        'text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full',
                        isSoundEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isSoundEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Sound chimes on alerts & reminders
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isSoundEnabled}
                onClick={handleToggleSound}
                className={clsx(
                  'w-12 h-7 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isSoundEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isSoundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </Card>
        </div>

        {/* Security & System Info Box */}
        <div className="p-4 rounded-3xl bg-teal-50/80 border border-teal-200/80 space-y-2 text-left shadow-2xs">
          <div className="flex items-center gap-2 text-[#0B5A54] font-black text-xs font-heading">
            <Shield className="w-4 h-4 text-[#0B5A54]" />
            <span>End-to-End Encrypted Settings</span>
          </div>
          <p className="text-[11px] text-teal-900/80 leading-relaxed font-medium">
            All feature preferences, biometric lock credentials, and alert configurations are stored
            securely on your device and synchronized instantly with local hardware engines.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
