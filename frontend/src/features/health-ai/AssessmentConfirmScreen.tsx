import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardCheck, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfidenceBadge } from '../../components/ui/ConfidenceBadge';

export const AssessmentConfirmScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const assessment = location.state?.assessment || {
    subjective: 'Patient reports mild seasonal allergy symptoms including sneezing, nasal congestion, and mild eye fatigue.',
    objective: 'Normal vitals reported. Clear breath sounds, no fever.',
    assessmentDiagnosis: 'Allergic Rhinitis / Seasonal Hypersensitivity',
    plan: 'Recommend consulting an ENT Specialist or General Physician for antihistamine prescription.',
    confidence: 92,
    riskLevel: 'low'
  };

  const handleProceedToBooking = () => {
    navigate('/hospitals', { state: { initialSearch: 'ENT & Allergy Specialist' } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto relative select-none">
      {/* Top Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-[#F8FAFC] border border-gray-200 px-3 py-1.5 rounded-full shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
          <span className="text-xs font-extrabold text-[#0B5A54] bg-[#0B5A54]/10 px-3 py-1 rounded-full">
            CLINICAL SUMMARY
          </span>
        </div>

        {/* Title */}
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#0B5A54]" />
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 font-heading">
              Triage Assessment Review
            </h1>
          </div>
          <p className="text-xs text-gray-600">
            Please review the generated SOAP clinical summary before selecting a specialist.
          </p>
        </div>

        {/* Confidence Badge */}
        <div className="text-left">
          <ConfidenceBadge confidence={assessment.confidence} riskLevel={assessment.riskLevel} />
        </div>

        {/* SOAP Notes Card */}
        <Card padding="lg" className="bg-[#F8FAFC] border border-[#E4E7EC] shadow-xs text-left space-y-3.5">
          {/* Subjective */}
          <div className="space-y-1 pb-2 border-b border-gray-200">
            <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider block">
              1. SUBJECTIVE SYMPTOMS
            </span>
            <p className="text-xs text-gray-800 font-medium leading-relaxed">
              "{assessment.subjective}"
            </p>
          </div>

          {/* Objective */}
          <div className="space-y-1 pb-2 border-b border-gray-200">
            <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider block">
              2. OBJECTIVE FINDINGS
            </span>
            <p className="text-xs text-gray-800 font-medium leading-relaxed">
              {assessment.objective}
            </p>
          </div>

          {/* Assessment */}
          <div className="space-y-1 pb-2 border-b border-gray-200">
            <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider block">
              3. AI CLINICAL ASSESSMENT
            </span>
            <p className="text-xs font-bold text-gray-900 leading-relaxed flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span>{assessment.assessmentDiagnosis}</span>
            </p>
          </div>

          {/* Plan */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider block">
              4. RECOMMENDED CARE PLAN
            </span>
            <p className="text-xs text-gray-800 font-medium leading-relaxed">
              {assessment.plan}
            </p>
          </div>
        </Card>
      </div>

      {/* Footer Action */}
      <div className="space-y-3 my-6">
        <Button
          size="lg"
          fullWidth
          onClick={handleProceedToBooking}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="py-3.5 rounded-xl font-bold text-xs shadow-xs"
        >
          Proceed to Specialist Booking
        </Button>
        <p className="text-[10px] text-gray-500 text-center italic">
          Disclaimer: This AI assessment is for guidance only and does not replace formal physician evaluation.
        </p>
      </div>
    </div>
  );
};
