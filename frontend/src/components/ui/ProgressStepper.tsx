import React from 'react';

export interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
}) => {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
        <span>Step {currentStep} of {totalSteps}: <strong className="text-[#0B5A54]">{stepTitle}</strong></span>
        <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
      </div>
      <div className="flex gap-2 w-full h-2">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`h-full flex-1 rounded-pill transition-colors duration-300 ${
              idx + 1 <= currentStep ? 'bg-[#0B5A54]' : 'bg-[#E4E7EC]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
