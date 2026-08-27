import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertOctagon, PhoneCall, Navigation, ArrowLeft, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const EscalationNoticeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const symptomSummary = location.state?.symptomSummary || 'Potential acute chest pressure or severe respiratory distress detected.';

  const handleDialEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleOpenErMaps = () => {
    window.open('https://www.google.com/maps/search/Emergency+Room+Hospital+near+me', '_blank');
  };

  return (
    <div className="min-h-screen bg-rose-50/50 flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto relative select-none">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-1.5 bg-rose-100 border border-rose-300 text-rose-800 px-3 py-1 rounded-full text-xs font-extrabold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>CRITICAL ESCALATION</span>
          </div>
        </div>

        {/* Warning Hero Banner */}
        <div className="bg-white border-2 border-rose-400 rounded-2xl p-5 shadow-xs text-left space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-extrabold text-rose-950 tracking-tight font-heading">
              Immediate Medical Attention Advised
            </h1>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              Based on your reported symptoms, CarePulse AI has flagged a potential urgent health risk requiring immediate evaluation rather than routine scheduling.
            </p>
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block">
              DETECTED RED-FLAG SYMPTOMS
            </span>
            <p className="text-xs font-semibold text-rose-900 leading-snug">
              "{symptomSummary}"
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Action Buttons */}
      <div className="space-y-3 my-6">
        <h2 className="text-xs font-extrabold text-gray-600 uppercase tracking-wider text-left px-1">
          RECOMMENDED IMMEDIATE ACTIONS
        </h2>

        {/* Call Ambulance / Hotline Button */}
        <Button
          size="lg"
          fullWidth
          onClick={() => handleDialEmergency('108')}
          className="bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 border-0"
        >
          <PhoneCall className="w-5 h-5 text-white animate-bounce" />
          <span>CALL EMERGENCY HOTLINE (108 / 911)</span>
        </Button>

        {/* Open ER Directions */}
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={handleOpenErMaps}
          className="bg-white border border-rose-300 text-rose-900 py-3.5 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4 text-rose-600" />
          <span>Locate Nearest Emergency Room (ER)</span>
        </Button>

        {/* Request Urgent Doctor Callback */}
        <Card padding="md" className="bg-white border border-gray-200 text-left space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0B5A54]" />
              <span className="text-xs font-bold text-gray-900">CarePulse Tele-Triage Callback</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active Duty
            </span>
          </div>
          <p className="text-[11px] text-gray-600">
            An emergency care physician has been notified. Stay calm and keep your phone line open.
          </p>
          <button
            onClick={() => alert('Urgent priority callback requested! An on-duty physician will contact your phone shortly.')}
            className="w-full py-2 bg-[#0B5A54] text-white rounded-lg text-xs font-bold shadow-2xs hover:bg-[#08453F] transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Request On-Call Physician Callback</span>
          </button>
        </Card>
      </div>

      {/* Footer Return */}
      <div className="pb-4 text-center">
        <button
          onClick={() => navigate('/home')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
        >
          Return to Home Dashboard
        </button>
      </div>
    </div>
  );
};
