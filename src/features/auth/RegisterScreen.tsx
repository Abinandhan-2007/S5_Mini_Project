import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  User,
  Lock,
  Calendar,
  Droplet,
  Phone,
  Mail,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertCircle,
  LogIn,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressStepper } from '../../components/ui/ProgressStepper';
import { useCarePulseStore } from '../../lib/store';

const step1Schema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    dob: z.string().min(1, 'Date of birth is required'),
    gender: z.string().min(1, 'Please select gender'),
    bloodGroup: z.string().min(1, 'Please select blood group'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const step2Schema = z
  .object({
    // TODO: RE-ENABLE FOR PRODUCTION — strict phone validation
    // phone: z.string().min(10, 'Valid 10-digit phone number is required'),
    phone: z.string().min(1, 'Phone number is required'),
    // TODO: RE-ENABLE FOR PRODUCTION — strict email validation
    // email: z.string().email('Valid email address is required'),
    email: z.string().min(1, 'Email is required'),
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
    allergies: z.string().optional(),
    preExistingConditions: z.string().optional(),
  })
  .refine(
    (data) => {
      const primaryDigits = (data.phone || '').replace(/\D/g, '').slice(-10);
      const emergencyDigits = (data.emergencyPhone || '').replace(/\D/g, '').slice(-10);
      // TODO: RE-ENABLE FOR PRODUCTION — emergency phone conflict check
      // if (primaryDigits && emergencyDigits && primaryDigits.length >= 10 && emergencyDigits.length >= 10) {
      //   return primaryDigits !== emergencyDigits;
      // }
      if (primaryDigits && emergencyDigits && primaryDigits.length >= 10 && emergencyDigits.length >= 10) {
        return primaryDigits !== emergencyDigits;
      }
      return true;
    },
    {
      message: 'Emergency phone must be different from your primary phone number',
      path: ['emergencyPhone'],
    }
  );

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const registerUser = useCarePulseStore((s) => s.registerUser);
  const setUserAuth = useCarePulseStore((s) => s.setUserAuth);

  const initialPhone = (location.state as any)?.initialPhone || '';
  const initialEmail = (location.state as any)?.initialEmail || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [formDataStep1, setFormDataStep1] = useState<Step1Data | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Modal alert for already existing user
  const [showAlreadyExistsModal, setShowAlreadyExistsModal] = useState(false);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      password: '',
      confirmPassword: '',
      dob: '',
      gender: 'Female',
      bloodGroup: 'O+',
    },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onChange',
    defaultValues: {
      phone: initialPhone,
      email: initialEmail,
      emergencyName: '',
      emergencyPhone: '',
      allergies: '',
      preExistingConditions: '',
    },
  });

  const watchPassword = form1.watch('password') || '';
  const isMinLength = watchPassword.length >= 6;
  const hasLetter = /[A-Za-z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);

  const onStep1Submit = (data: Step1Data) => {
    setRegisterError(null);
    setFormDataStep1(data);
    setStep(2);
  };

  const onStep2Submit = async (data: Step2Data) => {
    if (!formDataStep1) return;

    setRegisterError(null);
    setIsSubmitting(true);

    const payload = {
      fullName: formDataStep1.fullName,
      password: formDataStep1.password,
      dob: formDataStep1.dob,
      gender: formDataStep1.gender,
      bloodGroup: formDataStep1.bloodGroup,
      phone: data.phone.trim(),
      email: data.email.trim(),
      emergencyContact: {
        name: data.emergencyName || 'Emergency Contact',
        phone: data.emergencyPhone || '+91 98765 00000',
        relationship: 'Primary Contact',
      },
      allergies: data.allergies || '',
      preExistingConditions: data.preExistingConditions || '',
    };

    const apiEnvUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const endpointsToTry: string[] = [];
    if (apiEnvUrl) {
      endpointsToTry.push(apiEnvUrl.endsWith('/api') ? `${apiEnvUrl}/auth/register` : `${apiEnvUrl}/api/auth/register`);
    }
    endpointsToTry.push('/api/auth/register');
    endpointsToTry.push('http://localhost:5000/api/auth/register');

    let res: Response | null = null;
    let resData: any = {};

    for (const ep of endpointsToTry) {
      try {
        res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res) break;
      } catch {
        // try next endpoint
      }
    }

    if (res) {
      resData = await res.json().catch(() => ({}));

      // 409 Conflict: user already exists in PostgreSQL database
      if (res.status === 409 || (resData.detail && resData.detail.toLowerCase().includes('already exists'))) {
        setRegisterError(resData.detail || 'An account with these details already exists.');
        setShowAlreadyExistsModal(true);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setRegisterError(resData.detail || resData.error || 'Registration failed. Please check your details.');
        setIsSubmitting(false);
        return;
      }

      if (resData.user) {
        await setUserAuth(resData.user, resData.token); // ← await added
        setIsSubmitting(false);
        navigate('/home');
        return;
      }

      // Backend returned OK but no user object — fall through to local registration
      console.warn('Backend OK but no user in response, using local fallback');
    } else {
      // Local fallback check against already registered users
      const storedUsersStr = localStorage.getItem('carepulse_registered_users');
      const existingList: any[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

      const inputName = formDataStep1.fullName.trim().toLowerCase();
      const inputDigits = data.phone.replace(/\D/g, '').slice(-10);
      const inputLowerEmail = data.email.trim().toLowerCase();

      // Check name conflict
      if (inputName && existingList.some((u) => (u.fullName || '').trim().toLowerCase() === inputName)) {
        setRegisterError(`An account with the name '${formDataStep1.fullName}' already exists. Please log in or use a different name.`);
        setShowAlreadyExistsModal(true);
        setIsSubmitting(false);
        return;
      }

      // Check email conflict
      if (inputLowerEmail && existingList.some((u) => (u.email || '').trim().toLowerCase() === inputLowerEmail)) {
        setRegisterError(`An account with email '${data.email}' already exists. Please log in instead.`);
        setShowAlreadyExistsModal(true);
        setIsSubmitting(false);
        return;
      }

      // Check phone conflict
      if (inputDigits && existingList.some((u) => (u.phone || '').replace(/\D/g, '').slice(-10) === inputDigits)) {
        setRegisterError(`An account with phone number '${data.phone}' already exists. Please log in instead.`);
        setShowAlreadyExistsModal(true);
        setIsSubmitting(false);
        return;
      }

      existingList.push({ ...payload, id: `usr-${Date.now()}` });
      localStorage.setItem('carepulse_registered_users', JSON.stringify(existingList));
      registerUser(payload);
      setIsSubmitting(false);
      navigate('/home');
      return;
    }

    setIsSubmitting(false);
  };

  const handleGoToLogin = () => {
    setShowAlreadyExistsModal(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:px-6 w-full relative">
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

        {/* Error / Conflict Alert Banner */}
        {registerError && (
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-amber-50 text-amber-950 text-xs border border-amber-300 shadow-2xs animate-fade-in text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug font-semibold">{registerError}</span>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full text-center text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#094843] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl shadow-2xs cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In With Existing Account →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 FORM */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4 text-left">
            <Card padding="lg" className="bg-[#F8FAFC]/90 border border-[#E4E7EC] shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E4E7EC]/60">
                <User className="w-4 h-4 text-[#0B5A54]" />
                <h2 className="text-xs sm:text-sm font-bold font-heading text-[#111827]">Personal Details</h2>
              </div>

              <div className="space-y-3">
                {/* Full Name / Username */}
                <Input
                  label="FULL NAME"
                  leftIcon={<User className="w-4 h-4 text-[#0B5A54]" />}
                  placeholder="Enter full name"
                  error={form1.formState.errors.fullName?.message}
                  {...form1.register('fullName')}
                />

                {/* Password below username */}
                <div className="space-y-1.5">
                  <Input
                    label="PASSWORD"
                    isPassword
                    leftIcon={<Lock className="w-4 h-4 text-[#0B5A54]" />}
                    placeholder="Create password (min. 6 characters)"
                    error={form1.formState.errors.password?.message}
                    {...form1.register('password')}
                  />

                  {/* Password Validation Requirements Check */}
                  {watchPassword.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-white border border-[#E4E7EC] shadow-2xs space-y-1 text-[11px]">
                      <span className="font-bold text-[#4B5563] block text-[10px] uppercase tracking-wider">
                        Password Requirements:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isMinLength ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        )}
                        <span className={isMinLength ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                          At least 6 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasLetter ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        )}
                        <span className={hasLetter ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                          At least one letter (a-z, A-Z)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasNumber ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        )}
                        <span className={hasNumber ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                          At least one number (0-9)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <Input
                  label="CONFIRM PASSWORD"
                  isPassword
                  leftIcon={<Lock className="w-4 h-4 text-[#0B5A54]" />}
                  placeholder="Re-enter your password"
                  error={form1.formState.errors.confirmPassword?.message}
                  {...form1.register('confirmPassword')}
                />

                {/* Date of Birth */}
                <Input
                  label="DATE OF BIRTH"
                  type="date"
                  leftIcon={<Calendar className="w-4 h-4 text-[#0B5A54]" />}
                  error={form1.formState.errors.dob?.message}
                  {...form1.register('dob')}
                />

                {/* Gender & Blood Group */}
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
                onClick={() => {
                  setRegisterError(null);
                  setStep(1);
                }}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="w-1/3 text-xs font-bold py-3 rounded-xl bg-white border border-[#E4E7EC]"
              >
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="flex-1 text-xs font-bold py-3 rounded-xl"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Profile →
              </Button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-1">
          <p className="text-xs font-semibold text-[#6B7280]">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-bold text-[#0B5A54] hover:underline ml-0.5 cursor-pointer">
              Log in
            </button>
          </p>
        </div>
      </div>

      {/* Interactive Account Already Exists Modal Dialog */}
      {showAlreadyExistsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-[#E4E7EC] relative animate-scale-up">
            <button
              onClick={() => setShowAlreadyExistsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <LogIn className="w-8 h-8 text-amber-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold font-heading text-[#111827]">Account Already Exists</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed font-medium">
                {registerError || 'An account with these details is already registered. Please log in to access your profile.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                size="lg"
                fullWidth
                onClick={handleGoToLogin}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="py-3.5 rounded-xl text-xs font-bold shadow-xs"
              >
                Go to Login Screen
              </Button>

              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setShowAlreadyExistsModal(false)}
                className="py-2.5 rounded-xl text-xs font-bold text-[#6B7280] border-[#E4E7EC] hover:bg-gray-50"
              >
                Change Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
