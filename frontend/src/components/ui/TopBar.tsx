import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Globe } from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { isUserProfileIncomplete } from '../../features/auth/CompleteProfileScreen';
import { useTranslation } from '../../i18n';
import { LanguageSelectorModal } from './LanguageSelectorModal';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showAvatar?: boolean;
  variant?: 'default' | 'cyan';
  showLanguageToggle?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  variant = 'default',
  showLanguageToggle = true,
}) => {
  const navigate = useNavigate();
  const { t, currentLanguageInfo } = useTranslation();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const user = useCarePulseStore((s) => s.user);
  const appointments = useCarePulseStore((s) => s.appointments);
  const prescriptions = useCarePulseStore((s) => s.prescriptions);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Determine if there are actual unread alerts for this user
  const hasUnread = useMemo(() => {
    if (!user) return false;
    let readIds: string[] = [];
    let clearedIds: string[] = [];
    try {
      readIds = JSON.parse(localStorage.getItem(`carepulse_read_notifs_${user.id}`) || '[]');
      clearedIds = JSON.parse(localStorage.getItem(`carepulse_cleared_notifs_${user.id}`) || '[]');
    } catch {}

    const notifIds: string[] = [];

    // Profile incomplete
    if (isUserProfileIncomplete(user)) {
      notifIds.push(`notif-profile-setup-${user.id}`);
    }

    // Active/Upcoming Appointments
    appointments
      .filter((a) => a.status === 'Upcoming')
      .forEach((a) => notifIds.push(`notif-apt-${a.id}`));

    // Active Prescriptions
    prescriptions.forEach((p) => notifIds.push(`notif-rx-${p.id}`));

    const activeUnread = notifIds.filter((id) => !clearedIds.includes(id) && !readIds.includes(id));
    return activeUnread.length > 0;
  }, [user, appointments, prescriptions]);

  const displayName = user?.fullName ? user.fullName.split(' ')[0] : 'User';

  const getGreeting = () => {
    const hr = new Date().getHours();
    const timeGreeting =
      hr < 12
        ? t('home.greetingMorning', 'Good morning')
        : hr < 17
        ? t('home.greetingAfternoon', 'Good afternoon')
        : t('home.greetingEvening', 'Good evening');
    return `${timeGreeting}, ${displayName} 👋`;
  };

  const displayTitle = title || displayName;
  const displaySubtitle = subtitle !== undefined ? subtitle : getGreeting();

  const isCyan = variant === 'cyan';

  return (
    <>
      <header
        className={
          isCyan
            ? 'sticky top-0 z-30 bg-[#1FA2AC] px-4 pt-4 pb-3 w-full flex items-center justify-between transition-all duration-200 shadow-2xs'
            : 'sticky top-0 z-30 bg-[#EEF1F6]/95 backdrop-blur-md px-4 py-3 w-full flex items-center justify-between border-b border-[#E4E7EC]/50 transition-all duration-200'
        }
      >
        {/* Left Side: Back Arrow + Dynamic Greeting & Title */}
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {showBack && (
            <button
              onClick={handleBack}
              className={
                isCyan
                  ? 'w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0'
                  : 'w-8 h-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0'
              }
              aria-label="Go Back"
            >
              <ArrowLeft className={isCyan ? 'w-4 h-4 text-white' : 'w-4 h-4 text-[#111827]'} />
            </button>
          )}

          <div className="space-y-0.5 text-left min-w-0">
            {isCyan ? (
              <>
                <p className="text-[11px] font-bold text-teal-100/90 tracking-wide uppercase truncate">
                  {subtitle !== undefined ? subtitle : t('auth.loginTitle', 'WELCOME BACK')}
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-white font-heading leading-tight tracking-tight truncate">
                  {title || getGreeting()}
                </h1>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-[#6B7280] truncate">
                  {displaySubtitle}
                </p>
                <h1 className="text-lg font-bold text-[#111827] font-heading leading-tight tracking-tight truncate">
                  {displayTitle}
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Quick Language Switcher & Bell Icon Button */}
        <div className="flex items-center gap-2 shrink-0">
          {showLanguageToggle && (
            <button
              onClick={() => setIsLangModalOpen(true)}
              className={
                isCyan
                  ? 'h-8 px-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center gap-1.5 text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer'
                  : 'h-8 px-2.5 rounded-full bg-white border border-[#E4E7EC] flex items-center gap-1.5 text-slate-800 hover:bg-gray-50 transition-all active:scale-95 shadow-2xs cursor-pointer'
              }
              aria-label="Change Language"
              title="Change Language"
            >
              <Globe className={isCyan ? 'w-3.5 h-3.5 text-teal-100' : 'w-3.5 h-3.5 text-teal-600'} />
              <span className="text-[11px] font-extrabold tracking-tight">
                {currentLanguageInfo.nativeName}
              </span>
            </button>
          )}

          <button
            onClick={() => navigate('/notifications')}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm cursor-pointer shrink-0"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#111827]" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Reusable Quick Language Switcher Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />
    </>
  );
};

export default TopBar;
