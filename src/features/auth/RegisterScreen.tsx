import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, User, Calendar, Droplet, Phone, Mail, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressStepper } from '../../components/ui/ProgressStepper';
import { useCarePulseStore } from '../../lib/store';

const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Please select gender'),
  bloodGroup: z.string().min(1, 'Please select blood group'),
});

const step2Schema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  emergencyName: z.string().min(2, 'Emergency contact name required'),
  emergencyPhone: z.string().min(10, 'Emergency phone required'),
  allergies: z.string().optional(),
  preExistingConditions: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();
  const registerUser = useCarePulseStore((s) => s.registerUser);

  const [step, setStep] = useState<1 | 2>(1);
  const [formDataStep1, setFormDataStep1] = useState<Step1Data | null>(null);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: '',
      dob: '',
      gender: 'Female',
      bloodGroup: 'O+',
    },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      phone: '',
      email: '',
      emergencyName: '',
      emergencyPhone: '',
      allergies: '',
      preExistingConditions: '',
    },
  });

  const onStep1Submit = (data: Step1Data) => {
    setFormDataStep1(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    if (!formDataStep1) return;

    registerUser({
      fullName: formDataStep1.fullName,
      dob: formDataStep1.dob,
      gender: formDataStep1.gender,
      bloodGroup: formDataStep1.bloodGroup,
      phone: data.phone,
      email: data.email,
      emergencyContact: {
        name: data.emergencyName,
        phone: data.emergencyPhone,
        relationship: 'Primary Contact',
      },
      allergies: data.allergies,
      preExistingConditions: data.preExistingConditions,
    });

    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:px-6 w-full">
      <div className="w-full max-w-sm sm:max-w-md space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/login')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-teal flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-extrabold font-heading text-[#0B5A54] tracking-tight">CarePulse</span>
          </div>
          <Badge variant="tint" size="sm">REGISTRATION</Badge>
        </div>

        {/* Hero Heading */}
        <div className="text-left space-y-0.5 px-0.5">
          <h1 className="text-lg sm:text-xl font-extrabold font-heading text-[#111827]">Tell us more about yourself</h1>
          <p className="text-xs text-[#6B7280]">We use this information to customize your medical records and care.</p>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper
          currentStep={step}
          totalSteps={2}
          stepTitle={step === 1 ? 'Basic Information' : 'Contact & Medical Details'}
        />

        {/* STEP 1 FORM */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4 text-left">
            <Card padding="lg" className="bg-[#F8FAFC]/90 border border-[#E4E7EC] shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E4E7EC]/60">
                <User className="w-4 h-4 text-[#0B5A54]" />
                <h2 className="text-xs sm:text-sm font-bold font-heading text-[#111827]">Personal Details</h2>
              </div>

              <div className="space-y-3">
                <Input
                  label="FULL NAME"
                  leftIcon={<User className="w-4 h-4 text-[#0B5A54]" />}
                  placeholder="Enter full name"
                  error={form1.formState.errors.fullName?.message}
                  {...form1.register('fullName')}
                />

                <Input
                  label="DATE OF BIRTH"
                  type="date"
                  leftIcon={<Calendar className="w-4 h-4 text-[#0B5A54]" />}
                  error={form1.formState.errors.dob?.message}
                  {...form1.register('dob')}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <Select
                    label="GENDER"
                    leftIcon={<User className="w-4 h-4 text-[#0B5A54]" />}
                    options={[
                      { value: 'Female', label: 'Female' },
                      { value: 'Male', label: 'Male' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    error={form1.formState.errors.gender?.message}
                    {...form1.register('gender')}
                  />

                  <Select
                    label="BLOOD GROUP"
                    leftIcon={<Droplet className="w-4 h-4 text-rose-500" />}
                    options={[
                      { value: 'O+', label: 'O+' },
                      { value: 'O-', label: 'O-' },
                      { value: 'A+', label: 'A+' },
                      { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' },
                      { value: 'AB+', label: 'AB+' },
                    ]}
                    error={form1.formState.errors.bloodGroup?.message}
                    {...form1.register('bloodGroup')}
                  />
                </div>
              </div>
            </Card>

            <Button type="submit" size="lg" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />} className="py-3 rounded-xl text-xs font-bold shadow-2xs">
              Next Step →
            </Button>
          </form>
        )}

        {/* STEP 2 FORM */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4 text-left">
            <Card padding="lg" className="bg-[#F8FAFC]/90 border border-[#E4E7EC] shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E4E7EC]/60">
                <Phone className="w-4 h-4 text-[#0B5A54]" />
                <h2 className="text-xs sm:text-sm font-bold font-heading text-[#111827]">Contact & Emergency</h2>
              </div>

              <div className="space-y-3">
                <Input
                  label="PHONE NUMBER"
                  leftIcon={<Phone className="w-4 h-4 text-[#0B5A54]" />}
                  placeholder="Enter phone number"
                  error={form2.formState.errors.phone?.message}
                  {...form2.register('phone')}
                />

                <Input
                  label="EMAIL ADDRESS"
                  type="email"
                  leftIcon={<Mail className="w-4 h-4 text-[#0B5A54]" />}
                  placeholder="Enter email address"
                  error={form2.formState.errors.email?.message}
                  {...form2.register('email')}
                />

                <div className="space-y-2 pt-2 border-t border-[#E4E7EC]/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5A54]">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>EMERGENCY CONTACT</span>
                  </div>
                  <Input
                    label="CONTACT NAME"
                    leftIcon={<User className="w-4 h-4 text-[#0B5A54]" />}
                    placeholder="Enter relative or spouse name"
                    error={form2.formState.errors.emergencyName?.message}
                    {...form2.register('emergencyName')}
                  />
                  <Input
                    label="CONTACT PHONE"
                    leftIcon={<Phone className="w-4 h-4 text-[#0B5A54]" />}
                    placeholder="Enter phone number"
                    error={form2.formState.errors.emergencyPhone?.message}
                    {...form2.register('emergencyPhone')}
                  />
                  <p className="text-[10px] text-[#6B7280] italic leading-tight">
                    Relationship and contact info required for emergency response.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E4E7EC]/60">
                  <Input
                    label="KNOWN ALLERGIES (OPTIONAL)"
                    placeholder="e.g. Penicillin, Peanuts"
                    {...form2.register('allergies')}
                  />
                  <Input
                    label="PRE-EXISTING CONDITIONS (OPTIONAL)"
                    placeholder="e.g. Asthma, Diabetes"
                    {...form2.register('preExistingConditions')}
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="w-1/3 text-xs font-bold py-3 rounded-xl bg-white border border-[#E4E7EC]"
              >
                Back
              </Button>
              <Button type="submit" size="lg" className="flex-1 text-xs font-bold py-3 rounded-xl" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Create Profile →
              </Button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-1">
          <p className="text-xs font-semibold text-[#6B7280]">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-bold text-[#0B5A54] hover:underline ml-0.5">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
