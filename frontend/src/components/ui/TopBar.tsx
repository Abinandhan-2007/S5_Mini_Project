import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { isUserProfileIncomplete } from '../../features/auth/CompleteProfileScreen';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showAvatar?: boolean;
  variant?: 'default' | 'cyan';
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  variant = 'default',
}) => {
  const navigate = useNavigate();
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
    return `Hello ${displayName} 👋`;
  };

  const displayTitle = title || displayName;
  const displaySubtitle = subtitle !== undefined ? subtitle : getGreeting();

  const isCyan = variant === 'cyan';

  return (
    <header
      className={
        isCyan
          ? 'sticky top-0 z-30 bg-[#1FA2AC] px-4 pt-4 pb-3 w-full flex items-center justify-between transition-all duration-200 shadow-2xs'
          : 'sticky top-0 z-30 bg-[#EEF1F6]/95 backdrop-blur-md px-4 py-3 w-full flex items-center justify-between border-b border-[#E4E7EC]/50 transition-all duration-200'
      }
    >
      {/* Left Side: Back Arrow + Dynamic Greeting & Title */}
      <div className="flex items-center gap-2.5">
        {showBack && (
          <button
            onClick={handleBack}
            className={
              isCyan
                ? 'w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer'
                : 'w-8 h-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all active:scale-95 shadow-2xs cursor-pointer'
            }
            aria-label="Go Back"
          >
            <ArrowLeft className={isCyan ? 'w-4 h-4 text-white' : 'w-4 h-4 text-[#111827]'} />
          </button>
        )}

        <div className="space-y-0.5 text-left">
          {isCyan ? (
            <>
              <p className="text-[11px] font-bold text-teal-100/90 tracking-wide uppercase">
                {subtitle !== undefined ? subtitle : 'WELCOME BACK'}
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-white font-heading leading-tight tracking-tight">
                {title || getGreeting()}
              </h1>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-[#6B7280]">
                {displaySubtitle}
              </p>
              <h1 className="text-lg font-bold text-[#111827] font-heading leading-tight tracking-tight">
                {displayTitle}
              </h1>
            </>
          )}
        </div>
      </div>

      {/* Right Side: Bell Icon Button */}
      <button
        onClick={() => navigate('/notifications')}
        className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-[#111827]" />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        )}
      </button>
    </header>
  );
};

export default TopBar;
