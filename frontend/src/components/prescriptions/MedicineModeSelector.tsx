import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Info } from 'lucide-react';

interface MedicineModeSelectorProps {
  activeMode: 'prescription' | 'info';
}

export const MedicineModeSelector: React.FC<MedicineModeSelectorProps> = ({ activeMode }) => {
  const navigate = useNavigate();

  return (
    <div className="relative p-1.5 bg-slate-200/70 backdrop-blur-sm rounded-2xl sm:rounded-full border border-slate-200/90 shadow-inner grid grid-cols-2 gap-1.5 w-full select-none">
      {/* Tab 1: Check My Prescription */}
      <button
        type="button"
        onClick={() => {
          if (activeMode !== 'prescription') {
            navigate('/prescriptions/scan');
          }
        }}
        className={`py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-full text-[11.5px] sm:text-[13px] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${activeMode === 'prescription'
          ? 'bg-white text-[#0F766E] shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-slate-100 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-bold'
          }`}
      >
        <Shield
          className={`w-4 h-4 shrink-0 ${activeMode === 'prescription' ? 'text-[#0F766E]' : 'text-[#0F766E]/80'
            }`}
        />
        <span>Check My Prescription</span>
      </button>

      {/* Tab 2: What Is This For? */}
      <button
        type="button"
        onClick={() => {
          if (activeMode !== 'info') {
            navigate('/medicine/info-lookup');
          }
        }}
        className={`py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-full text-[11.5px] sm:text-[13px] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${activeMode === 'info'
          ? 'bg-white text-[#1E3A8A] shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-slate-100 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-bold'
          }`}
      >
        <Info
          className={`w-4 h-4 shrink-0 ${activeMode === 'info' ? 'text-[#1E3A8A]' : 'text-blue-600'
            }`}
        />
        <span>What Is This For?</span>
      </button>
    </div>
  );
};
