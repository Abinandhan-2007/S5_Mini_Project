import React from 'react';
import { MapPin, Shield, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';

export interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllowWhileUsing: () => void;
  onAllowOnlyThisTime: () => void;
  onDeny: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onAllowWhileUsing,
  onAllowOnlyThisTime,
  onDeny,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 space-y-4 shadow-2xl text-center relative border border-[#E4E7EC] animate-in zoom-in-95">
        {/* Top Close Icon */}
        <button
          onClick={onDeny}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-[#6B7280]"
          title="Close prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Location Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#E3F3F1] flex items-center justify-center mx-auto text-[#0B5A54] relative">
          <MapPin className="w-7 h-7 text-[#0B5A54]" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#14B8A6] ring-2 ring-white animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5 px-1">
          <h3 className="text-base font-extrabold font-heading text-[#111827] leading-snug">
            Allow CarePulse to access this device's location?
          </h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            CarePulse needs location access to find nearest hospitals, verified clinics, and estimate emergency arrival times.
          </p>
        </div>

        {/* Permission Options List */}
        <div className="space-y-2 pt-1">
          <Button
            fullWidth
            variant="primary"
            size="md"
            className="rounded-xl py-2.5 text-xs font-bold justify-start px-4 gap-2.5 shadow-xs"
            onClick={onAllowWhileUsing}
          >
            <CheckCircle2 className="w-4 h-4 text-teal-200" />
            <span>While using the app</span>
          </Button>

          <Button
            fullWidth
            variant="outline"
            size="md"
            className="rounded-xl py-2.5 text-xs font-bold justify-start px-4 gap-2.5 text-[#0B5A54]"
            onClick={onAllowOnlyThisTime}
          >
            <Shield className="w-4 h-4 text-[#0B5A54]" />
            <span>Only this time</span>
          </Button>

          <button
            type="button"
            onClick={onDeny}
            className="w-full py-2 text-xs font-bold text-[#6B7280] hover:text-[#DC2626] transition-colors"
          >
            Don't allow
          </button>
        </div>
      </div>
    </div>
  );
};
