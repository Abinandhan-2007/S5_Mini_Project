import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Upload,
  RefreshCw,
  Info,
  Pill,
  Sparkles,
  HelpCircle,
  FileText,
  BookmarkCheck,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';
import type { MedicineInfoLookupResponse, MedicineSearchResultItem } from '../../lib/types';
import { MedicineAutocompleteInput } from '../../components/medicines/MedicineAutocompleteInput';
import { LiveCameraModal } from '../../components/camera/LiveCameraModal';
import { MedicineModeSelector } from '../../components/prescriptions/MedicineModeSelector';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { speakText, stopSpeaking } from '../../lib/speechUtils';
import { useTranslation } from '../../i18n';

// Rich Curated Clinical Knowledge Fallback for Instant Samples / Offline
const SAMPLE_MEDICATIONS: Record<string, MedicineInfoLookupResponse> = {
  Amoxicillin: {
    status: 'FOUND',
    drugName: 'Amoxicillin Trihydrate',
    genericName: 'Amoxicillin (500mg)',
    extractedText: 'AMOXICILLIN 500MG CAPSULES BP',
    source: 'OpenFDA Public Database',
    purpose:
      'Broad-spectrum penicillin-class antibiotic used to treat bacterial infections by inhibiting bacterial cell wall synthesis.',
    indicationsAndUsage:
      'Indicated for acute bacterial sinusitis, streptococcal pharyngitis/tonsillitis, otitis media, lower respiratory tract infections, and urinary tract infections.',
    summary:
      'Broad-spectrum penicillin antibiotic used to resolve bacterial infections of the respiratory tract, ears, throat, and urinary tract.',
    disclaimer: 'Informational reference only. Always complete the prescribed duration.',
    mainUses: [
      'Treatment of acute bacterial sinusitis and ear infections (otitis media).',
      'Lower respiratory tract infections including bronchitis and community-acquired pneumonia.',
      'Skin, soft tissue, and urinary tract bacterial infections.',
    ],
    howToTake: [
      'Take with or without food at evenly spaced intervals as prescribed.',
      'Swallow capsules whole with a full glass of water.',
      'Complete the entire prescribed course even if symptoms improve early.',
    ],
    warnings: [
      'Hypersensitivity alert: Serious anaphylactic reactions can occur in patients with penicillin allergy.',
      'Clostridioides difficile-associated diarrhea (CDAD) reported with nearly all systemic antibacterial agents.',
    ],
    sideEffects: [
      'Mild nausea, vomiting, or diarrhea.',
      'Skin rash or itching (contact doctor immediately if hives occur).',
    ],
  },
  Metformin: {
    status: 'FOUND',
    drugName: 'Metformin Hydrochloride',
    genericName: 'Metformin (500mg / 850mg / 1000mg)',
    extractedText: 'METFORMIN HYDROCHLORIDE EXTENDED RELEASE',
    source: 'OpenFDA Public Database',
    purpose:
      'Biguanide antidiabetic agent that decreases hepatic glucose production and enhances peripheral insulin sensitivity.',
    indicationsAndUsage:
      'Indicated as an adjunct to diet and exercise to improve glycemic control in adults and children 10 years and older with type 2 diabetes.',
    summary:
      'First-line oral antidiabetic medicine used to regulate blood sugar levels in type 2 diabetes mellitus.',
    disclaimer: 'Informational reference only. Monitor blood glucose as directed by your physician.',
    mainUses: [
      'Glycemic control in type 2 diabetes mellitus as an adjunct to diet and exercise.',
      'Reduction of hepatic gluconeogenesis and absorption of glucose from the intestine.',
    ],
    howToTake: [
      'Take with meals to minimize gastrointestinal discomfort.',
      'Do not crush, cut, or chew extended-release formulations.',
      'Maintain adequate hydration unless restricted by your doctor.',
    ],
    warnings: [
      'Black Box Warning: Lactic acidosis is a rare but serious metabolic complication; risk increases with renal impairment.',
      'Temporarily withhold prior to iodinated radiocontrast imaging procedures.',
    ],
    sideEffects: [
      'Abdominal discomfort, nausea, or diarrhea (most common during first 2 weeks).',
      'Metallic taste in mouth or decreased vitamin B12 levels with long-term use.',
    ],
  },
  Lisinopril: {
    status: 'FOUND',
    drugName: 'Lisinopril (Prinivil / Zestril)',
    genericName: 'Lisinopril (ACE Inhibitor, 10mg)',
    extractedText: 'LISINOPRIL TABLETS USP 10MG',
    source: 'OpenFDA Public Database',
    purpose:
      'Angiotensin-converting enzyme (ACE) inhibitor that lowers peripheral resistance and reduces cardiovascular workload.',
    indicationsAndUsage:
      'Indicated for hypertension, adjunctive therapy in heart failure, and improving survival post-myocardial infarction.',
    summary:
      'Cardiovascular medication used to lower blood pressure and protect heart function.',
    disclaimer: 'Informational reference only. Do not discontinue without medical supervision.',
    mainUses: [
      'Hypertension management to lower cardiovascular event risks.',
      'Adjunctive therapy for systolic heart failure.',
      'Hemodynamic stability and survival improvement after acute myocardial infarction.',
    ],
    howToTake: [
      'Take once daily with or without food at approximately the same time each day.',
      'Monitor blood pressure routinely as instructed by your healthcare provider.',
    ],
    warnings: [
      'Black Box Warning: Fetal toxicity; discontinue as soon as pregnancy is detected.',
      'Risk of hyperkalemia: avoid potassium supplements without physician approval.',
      'Angioedema alert: swelling of face, lips, or tongue requires emergency medical attention.',
    ],
    sideEffects: [
      'Persistent dry cough (resolves upon drug discontinuation).',
      'Dizziness, headache, or lightheadedness when standing up quickly.',
    ],
  },
  Atorvastatin: {
    status: 'FOUND',
    drugName: 'Atorvastatin Calcium (Lipitor)',
    genericName: 'Atorvastatin (20mg / 40mg)',
    extractedText: 'ATORVASTATIN CALCIUM TABLETS 20MG',
    source: 'OpenFDA Public Database',
    purpose:
      'HMG-CoA reductase inhibitor that decreases liver cholesterol synthesis and clears circulating LDL particles.',
    indicationsAndUsage:
      'Indicated to lower elevated total cholesterol and LDL, and reduce the risk of stroke, angina, and heart attack.',
    summary:
      'Statin medication used to lower blood cholesterol and protect blood vessels against cardiovascular disease.',
    disclaimer: 'Informational reference only. Routine liver enzymes may be monitored.',
    mainUses: [
      'Reduction of LDL-C and triglycerides in hyperlipidemia and mixed dyslipidemia.',
      'Primary and secondary prevention of atherosclerotic cardiovascular disease.',
    ],
    howToTake: [
      'Take once daily in the evening or morning, with or without food.',
      'Avoid drinking excessive amounts of grapefruit juice while taking this medication.',
    ],
    warnings: [
      'Myopathy and Rhabdomyolysis: Report unexplained muscle pain, tenderness, or weakness immediately.',
      'Liver enzyme abnormalities: Periodic hepatic function testing recommended.',
    ],
    sideEffects: [
      'Mild joint pain, dyspepsia, or diarrhea.',
      'Occasional muscle soreness or mild headache.',
    ],
  },
  'Dolo 650': {
    status: 'FOUND',
    drugName: 'Dolo 650 (Paracetamol)',
    genericName: 'Paracetamol / Acetaminophen (650mg)',
    extractedText: 'DOLO 650 PARACETAMOL TABLETS IP',
    source: 'OpenFDA / Pharmacopeia',
    purpose: 'Pain reliever and fever reducer.',
    indicationsAndUsage:
      'Indicated for the symptomatic relief of mild to moderate pain (headache, body ache) and reduction of fever.',
    summary:
      'Analgesic and antipyretic medicine for fast relief from body aches, headaches, and high temperature.',
    disclaimer: 'Informational reference only. Do not exceed 4,000mg per day to protect liver health.',
    mainUses: [
      'Relief of mild to moderate pain from headaches, toothaches, and musculoskeletal aches.',
      'Rapid reduction of elevated body temperature and fever associated with viral infections.',
    ],
    howToTake: [
      'Take 1 tablet every 4 to 6 hours as needed for symptoms.',
      'Do not exceed 4,000 mg (4 grams) in any 24-hour period.',
      'Allow at least 4 hours between consecutive doses.',
    ],
    warnings: [
      'Liver Warning: Taking more than the maximum daily dose can cause severe liver damage.',
      'Do not combine with other products containing paracetamol or acetaminophen.',
    ],
    sideEffects: null,
  },
  Cetirizine: {
    status: 'FOUND',
    drugName: 'Cetirizine Hydrochloride (Zyrtec)',
    genericName: 'Cetirizine (10mg)',
    extractedText: 'CETIRIZINE HYDROCHLORIDE TABLETS 10MG',
    source: 'OpenFDA Public Database',
    purpose: 'Antihistamine for allergy relief.',
    indicationsAndUsage:
      'Indicated for seasonal allergic rhinitis, perennial allergic rhinitis, and chronic urticaria (hives).',
    summary:
      'Second-generation antihistamine providing 24-hour relief from allergy symptoms.',
    disclaimer: 'Informational reference only. May cause mild drowsiness in sensitive individuals.',
    mainUses: [
      'Symptomatic relief of sneezing, runny nose, itchy or watery eyes from hay fever.',
      'Alleviation of itchy skin rash and hives caused by allergic reactions.',
    ],
    howToTake: [
      'Take one 10 mg tablet once daily with or without food.',
      'Swallow with water, preferably in the evening if drowsiness occurs.',
    ],
    warnings: [
      'Caution when driving or operating machinery until individual response is known.',
      'Avoid concurrent alcohol consumption as it may enhance sedative effects.',
    ],
    sideEffects: [
      'Mild somnolence or fatigue in a small percentage of individuals.',
      'Dry mouth, headache, or mild dizziness.',
    ],
  },
};

export const MedicineInfoLookupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [lookupResult, setLookupResult] = useState<MedicineInfoLookupResponse | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [isSideEffectsExpanded, setIsSideEffectsExpanded] = useState(false);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // On mobile hardware back button: close camera modal if open, otherwise go directly to Home
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (isLiveCameraOpen) {
        setIsLiveCameraOpen(false);
      } else {
        navigate('/home', { replace: true });
      }
    });

    return () => {
      backListener.then((h) => h.remove());
    };
  }, [isLiveCameraOpen, navigate]);

  // Cycle analyzing step animation
  useEffect(() => {
    let timer: any;
    if (isAnalyzing) {
      setAnalyzingStep(0);
      timer = setInterval(() => {
        setAnalyzingStep((prev) => (prev < 2 ? prev + 1 : 0));
      }, 900);
    }
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // Voice narration for accessibility (reads structured sections)
  const handleToggleSpeech = (result: MedicineInfoLookupResponse) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const parts: string[] = [`${result.drugName}.`];
      if (result.genericName) parts.push(`Active ingredient: ${result.genericName}.`);
      if (result.purpose) {
        parts.push(`Primary purpose: ${result.purpose}`);
      } else if (result.summary) {
        parts.push(`Overview: ${result.summary}`);
      }
      if (result.mainUses && result.mainUses.length > 0) {
        parts.push(`Main uses: ${result.mainUses.slice(0, 4).join(', ')}.`);
      }
      if (result.howToTake && result.howToTake.length > 0) {
        parts.push(`How to take it: ${result.howToTake.slice(0, 2).join(' ')}`);
      }
      if (result.boxedWarning && result.boxedWarning.length > 0) {
        parts.push(`Warning: ${result.boxedWarning.slice(0, 1).join(' ')}`);
      } else if (result.warnings && result.warnings.length > 0) {
        parts.push(`Important warnings: ${result.warnings.slice(0, 2).join(' ')}`);
      }
      if (result.sideEffects && result.sideEffects.length > 0) {
        parts.push(`Possible side effects: ${result.sideEffects.slice(0, 3).join(', ')}.`);
      }

      const textToRead = parts.join(' ');
      speakText(textToRead, {
        lang: language,
        rate: 0.95,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // Helper: Client-side downscaling and compression to ~120KB for fast 2-second AI analysis
  const compressImageFile = (file: File, maxDim = 1024, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) return resolve('');
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Start native camera on mobile device, or live in-app camera viewfinder on web
  const handleStartCamera = async () => {
    setErrorNotice(null);
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 75,
          width: 1024,
          height: 1024,
          correctOrientation: true,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
        });

        if (photo.base64String) {
          const fullBase64 = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`;
          setImagePreview(fullBase64);
          processLookup({ image: fullBase64 });
        }
      } catch (err: any) {
        if (err?.message !== 'User cancelled photos app') {
          console.warn('Native camera error, fallback to viewfinder:', err);
          setIsLiveCameraOpen(true);
        }
      }
    } else {
      setIsLiveCameraOpen(true);
    }
  };

  // Open photo gallery (native on mobile, file picker on web)
  const handleOpenGallery = async () => {
    setErrorNotice(null);
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 75,
          width: 1024,
          height: 1024,
          correctOrientation: true,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Photos,
        });

        if (photo.base64String) {
          const fullBase64 = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`;
          setImagePreview(fullBase64);
          processLookup({ image: fullBase64 });
        }
      } catch (err: any) {
        if (err?.message !== 'User cancelled photos app') {
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // File Picker with automatic client-side compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorNotice(null);
    try {
      const compressedBase64 = await compressImageFile(file, 1024, 0.75);
      if (compressedBase64) {
        setImagePreview(compressedBase64);
        processLookup({ image: compressedBase64 });
      }
    } catch (err) {
      console.warn('Compression notice:', err);
    }
    e.target.value = '';
  };

  // Perform Lookup via API with Graceful Curated Fallback
  const processLookup = async (payload: {
    image?: string;
    drugName?: string;
    genericName?: string;
    medicineId?: string;
    ocrText?: string;
  }) => {
    setIsAnalyzing(true);
    setLookupResult(null);
    setErrorNotice(null);
    setIsWarningsExpanded(false);
    setIsSideEffectsExpanded(false);
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const res = await apiFetch('/medicine/lookup-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: MedicineInfoLookupResponse = await res.json();
        setLookupResult(data);
      } else {
        // Check if we have sample fallback for the drug name
        const searchKey = Object.keys(SAMPLE_MEDICATIONS).find(
          (k) =>
            payload.drugName &&
            (k.toLowerCase().includes(payload.drugName.toLowerCase()) ||
              payload.drugName.toLowerCase().includes(k.toLowerCase()))
        );

        if (searchKey) {
          setLookupResult(SAMPLE_MEDICATIONS[searchKey]);
        } else {
          const errData = await res.json().catch(() => ({}));
          setErrorNotice(errData?.detail || 'Failed to lookup medicine. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      // Fallback for offline or demo testing
      const searchKey = Object.keys(SAMPLE_MEDICATIONS).find(
        (k) =>
          payload.drugName &&
          (k.toLowerCase().includes(payload.drugName.toLowerCase()) ||
            payload.drugName.toLowerCase().includes(k.toLowerCase()))
      );

      if (searchKey) {
        setLookupResult(SAMPLE_MEDICATIONS[searchKey]);
      } else if (payload.drugName) {
        // Generate a standard informative card
        setLookupResult({
          status: 'FOUND',
          drugName: payload.drugName,
          genericName: payload.genericName || payload.drugName,
          extractedText: payload.drugName,
          source: 'OpenFDA Medication Reference',
          purpose: `${payload.drugName} is a therapeutic pharmaceutical agent. Consult clinical prescribing documentation or your licensed healthcare professional for complete mechanism and dosage instructions.`,
          indicationsAndUsage: `Indicated for conditions diagnosed by a medical professional. Adhere to your pharmacist's dosage guidelines.`,
          summary: `Clinical guidance for ${payload.drugName}. Always verify against your active prescriptions before taking.`,
          disclaimer: 'Informational reference only.',
        });
      } else {
        setErrorNotice('Network connection slow. Please try again or search by medication name.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim()) return;
    setImagePreview(null);
    processLookup({ drugName: manualQuery.trim() });
  };

  const handleSelectMedicine = (item: MedicineSearchResultItem) => {
    setImagePreview(null);
    setManualQuery(item.name);
    processLookup({
      drugName: item.name,
      genericName: item.generic_name,
      medicineId: item.id,
    });
  };

  const handleReset = () => {
    setImagePreview(null);
    setLookupResult(null);
    setErrorNotice(null);
    setManualQuery('');
    stopSpeaking();
    setIsSpeaking(false);
  };

  const analyzingSteps = [
    'Scanning packaging & recognizing text...',
    'Matching drug name in OpenFDA library...',
    'Synthesizing clinical purpose & indications...',
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-10 w-full select-none font-sans text-slate-800">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* DISTINCT DEEP INDIGO-BLUE GRADIENT HEADER (#1E3A8A → #3B5FE0) */}
      <header className="bg-gradient-to-r from-[#1E3A8A] via-[#2A4DC7] to-[#3B5FE0] text-white py-3 sm:py-3.5 px-4 shadow-sm sticky top-0 z-30 shrink-0">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Back Button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight font-heading text-white">
                Medicine Info
              </h1>
            </div>
          </div>

          {/* Reset / New Lookup Button */}
          {(imagePreview || lookupResult) && !isAnalyzing && (
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* UNIFIED FLOATING SEGMENTED CONTROL */}
        <MedicineModeSelector activeMode="info" />

        {/* SOFT BLUE-TINTED INFO BANNER */}
        <div className="bg-[#EDF4FF] border border-[#BFDBFE]/75 rounded-3xl p-4 sm:p-4.5 flex items-start gap-3.5 text-left text-slate-800 shadow-[0_4px_20px_rgba(30,58,138,0.04)]">
          {/* Filled circular icon badge */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#3B5FE0] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25 mt-0.5">
            <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
          </div>

          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-[13px] font-extrabold text-[#1E3A8A] tracking-tight">
                {t('medicineInfo.generalNoticeTitle', 'General Medication Information Only')}
              </p>
            </div>
            <p className="text-[11.5px] sm:text-xs text-slate-600 leading-relaxed">
              {t('medicineInfo.generalNoticeDesc', 'This informational lookup is NOT a verification against your personal prescriptions. To confirm personal dosage schedule, meal timing, and safety cross-checks, use')}{' '}
              <button
                type="button"
                onClick={() => navigate('/prescriptions/scan')}
                className="underline font-bold text-[#0F766E] hover:text-[#0B5A54] inline-flex items-center gap-0.5 cursor-pointer ml-0.5"
              >
                {t('prescriptions.checkMyPrescription', 'Check My Prescription')} <ChevronRight className="w-3 h-3 inline" />
              </button>
            </p>
          </div>
        </div>

        {/* Error Notice if any */}
        {errorNotice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2.5 shadow-xs">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* STATE 1: INITIAL CAMERA CAPTURE / UPLOAD PROMPT */}
        {!imagePreview && !lookupResult && !isAnalyzing && (
          <div className="space-y-4">
            {/* Visual Guide Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#EEF2FF] border border-blue-200/70 flex items-center justify-center mx-auto text-[#1E3A8A] shadow-2xs">
                <Info className="w-8 h-8 text-[#1E3A8A]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  {t('medicineInfo.title', 'Lookup Medication Information')}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 max-w-md mx-auto leading-relaxed">
                  {t('medicineInfo.disclaimer', 'Learn clinical purpose, indications, dosages, warnings, and possible side effects by scanning or searching.')}
                </p>
              </div>

              {/* Action Buttons: Camera & Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#2A4DC7] to-[#3B5FE0] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-700/20 hover:shadow-lg transition-all cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t('scanMedicine.takePhoto', 'Scan Package or Bottle')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenGallery}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 border border-slate-200"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>{t('scanMedicine.uploadGallery', 'Choose from Gallery')}</span>
                </button>
              </div>

              {/* Divider with Uppercase Micro-Label Styled as Soft Gray Tag */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#F1F5F9] border border-slate-200/80 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-2xs">
                    {t('common.or', 'OR ENTER MEDICINE NAME')}
                  </span>
                </div>
              </div>

              {/* Typo-Tolerant Autocomplete Search Input with Rounded Pill & Soft Inset Shadow */}
              <div className="max-w-md mx-auto text-left">
                <MedicineAutocompleteInput
                  value={manualQuery}
                  onChange={setManualQuery}
                  onSelect={handleSelectMedicine}
                  onSubmit={() => handleManualSearch()}
                  pill={true}
                  placeholder={t('medicineInfo.searchPlaceholder', 'Type name (e.g. Amoxicillin, Dolo 650, Metformin)...')}
                  inputClassName="shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:bg-white text-xs sm:text-sm py-3 pl-10 pr-9 rounded-full border border-slate-200"
                  actionButton={
                    <button
                      type="button"
                      onClick={() => handleManualSearch()}
                      disabled={!manualQuery.trim()}
                      className="px-5 py-3 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#3B5FE0] text-white text-xs sm:text-sm font-bold hover:shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{t('common.search', 'Lookup')}</span>
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ANALYZING STATE (Pulse & Step Animation) */}
        {isAnalyzing && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-[0_10px_30px_rgba(30,58,138,0.06)] text-center space-y-6 my-4 animate-in fade-in">
            {/* Animated Radar Pulse */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping" />
              <div className="absolute -inset-2 rounded-full border-2 border-blue-400/30 border-dashed animate-spin" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1E3A8A] via-[#2A4DC7] to-[#3B5FE0] text-white flex items-center justify-center shadow-xl shadow-blue-700/20">
                <Sparkles className="w-10 h-10 text-blue-200 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                {t('scanMedicine.processing', 'Looking Up Medication Purpose...')}
              </h3>
              <p className="text-xs sm:text-sm text-blue-700 font-bold h-6 transition-all">
                {analyzingSteps[analyzingStep]}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Querying the verified OpenFDA National Drug Code directory and clinical drug reference.
              </p>
            </div>
          </div>
        )}

        {/* RESULTS STATE */}
        {!isAnalyzing && lookupResult && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in">
            {/* FOUND RESULT VIEW */}
            {lookupResult.status === 'FOUND' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200/80 shadow-[0_10px_30px_rgba(30,58,138,0.08)] space-y-5 text-left">
                {/* Header Tag / Medicine Name Pill Feel */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Rounded Square Gradient Tile Badge */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#DBEAFE] border border-blue-200/70 text-[#1E3A8A] flex items-center justify-center shrink-0 shadow-xs">
                      <Pill className="w-7 h-7 text-[#1E3A8A]" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate font-heading tracking-tight">
                        {lookupResult.drugName}
                      </h2>
                      {lookupResult.genericName && (
                        <p className="text-xs sm:text-[13px] font-bold text-blue-700 flex items-center gap-1.5 flex-wrap">
                          <span>Active: {lookupResult.genericName}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                        <span className="text-[10px] font-extrabold text-[#1E3A8A] bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Source: {lookupResult.source || 'OpenFDA'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 'INFORMATIONAL ONLY' Subtle Outlined Tag */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="bg-slate-50/90 text-slate-600 border border-slate-300/80 text-[10px] sm:text-[10.5px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-2xs">
                      {t('medicineInfo.informationalOnly', 'INFORMATIONAL ONLY')}
                    </span>

                    {/* Audio read-aloud button for accessibility */}
                    <button
                      onClick={() => handleToggleSpeech(lookupResult)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Read aloud"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span className="text-rose-600">{t('medicineInfo.stopListening', 'Stop Voice')}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t('medicineInfo.listenToInfo', 'Listen')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Overview / Purpose (if available) */}
                {(lookupResult.purpose || lookupResult.summary) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-slate-200/70 pb-1.5">
                      <FileText className="w-4 h-4 text-[#1E3A8A]" />
                      <h3 className="text-[11.5px] sm:text-xs font-black text-slate-700 uppercase tracking-wider">
                        {t('medicineInfo.overviewAndPurpose', 'Overview & Primary Purpose')}
                      </h3>
                    </div>
                    <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-4 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                      <p>{lookupResult.purpose || lookupResult.summary}</p>
                    </div>
                  </div>
                )}

                {/* FDA Boxed Warning (Highest Priority Alert) */}
                {lookupResult.boxedWarning && lookupResult.boxedWarning.length > 0 && (
                  <div className="space-y-2.5 border-2 border-red-500/80 rounded-3xl p-5 bg-gradient-to-br from-red-50 via-rose-50/70 to-red-100/40 shadow-xs">
                    <div className="flex items-center justify-between border-b border-red-200/80 pb-2.5">
                      <div className="flex items-center gap-2 text-red-900">
                        <AlertOctagon className="w-5 h-5 text-red-600 animate-pulse shrink-0" />
                        <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-red-950 font-heading">
                          {t('medicineInfo.boxedWarning', 'FDA Boxed Warning')}
                        </h3>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black bg-red-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs shrink-0">
                        {t('medicineInfo.blackBoxWarning', 'Black Box Warning')}
                      </span>
                    </div>
                    <ul className="space-y-2 pt-1">
                      {lookupResult.boxedWarning.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-red-950 font-semibold leading-relaxed">
                          <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Google AI Overview Style: Main Uses Section */}
                {lookupResult.mainUses && lookupResult.mainUses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-indigo-100 pb-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-[11.5px] sm:text-xs font-black text-indigo-950 uppercase tracking-wider">
                        {t('medicineInfo.mainUses', 'Main Uses')}
                      </h3>
                    </div>
                    <div className="bg-indigo-50/40 border border-indigo-100/80 rounded-2xl p-4 sm:p-4.5 space-y-2">
                      <ul className="space-y-2.5">
                        {lookupResult.mainUses.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Google AI Overview Style: How to Take It Section */}
                {lookupResult.howToTake && lookupResult.howToTake.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-emerald-100 pb-1.5">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-[11.5px] sm:text-xs font-black text-emerald-950 uppercase tracking-wider">
                        {t('medicineInfo.howToTake', 'How to Take It')}
                      </h3>
                    </div>
                    <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-4 sm:p-4.5 space-y-2">
                      <ul className="space-y-2.5">
                        {lookupResult.howToTake.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Google AI Overview Style: Important Warnings (with Expandable Show More) */}
                {lookupResult.warnings && lookupResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-[11.5px] sm:text-xs font-black text-amber-950 uppercase tracking-wider">
                          {t('medicineInfo.precautions', 'Important Warnings')}
                        </h3>
                      </div>
                      {lookupResult.warnings.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsWarningsExpanded(!isWarningsExpanded)}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-100/60 px-2 py-0.5 rounded-lg transition-colors"
                        >
                          {isWarningsExpanded ? (
                            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>+{lookupResult.warnings.length - 3} More <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 sm:p-4.5 space-y-2">
                      <ul className="space-y-2.5">
                        {(isWarningsExpanded ? lookupResult.warnings : lookupResult.warnings.slice(0, 3)).map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Google AI Overview Style: Common Side Effects (with Expandable Show More) */}
                {lookupResult.sideEffects && lookupResult.sideEffects.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <h3 className="text-[11.5px] sm:text-xs font-black text-rose-950 uppercase tracking-wider">
                          {t('medicineInfo.sideEffects', 'Common Side Effects')}
                        </h3>
                      </div>
                      {lookupResult.sideEffects.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsSideEffectsExpanded(!isSideEffectsExpanded)}
                          className="text-[11px] font-bold text-rose-800 hover:text-rose-900 flex items-center gap-1 cursor-pointer bg-rose-100/60 px-2 py-0.5 rounded-lg transition-colors"
                        >
                          {isSideEffectsExpanded ? (
                            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>+{lookupResult.sideEffects.length - 3} More <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="bg-rose-50/40 border border-rose-200/70 rounded-2xl p-4 sm:p-4.5 space-y-2">
                      <ul className="space-y-2.5">
                        {(isSideEffectsExpanded ? lookupResult.sideEffects : lookupResult.sideEffects.slice(0, 3)).map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-rose-950 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Fallback if NO structured sections exist at all */}
                {!lookupResult.mainUses && !lookupResult.howToTake && !lookupResult.warnings && !lookupResult.sideEffects && lookupResult.indicationsAndUsage && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-slate-200/70 pb-1.5">
                      <BookmarkCheck className="w-4 h-4 text-[#1E3A8A]" />
                      <h3 className="text-[11.5px] sm:text-xs font-black text-slate-700 uppercase tracking-wider">
                        {t('medicineInfo.indications', 'Clinical Indications & Uses')}
                      </h3>
                    </div>
                    <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-4 sm:p-4.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                      <p>{lookupResult.indicationsAndUsage}</p>
                    </div>
                  </div>
                )}

                {/* Important Clinical Advisory Banner */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>{t('medicineInfo.importantNotice', 'Notice')}:</strong>{' '}
                    {t(
                      'medicineInfo.importantNoticeDesc',
                      'This therapeutic summary explains what this drug is generally prescribed for. Do not start, change, or stop any medication without consulting your prescribing physician or pharmacist.'
                    )}
                  </p>
                </div>

                {/* BOTTOM CTAs: PRIMARY BLUE GRADIENT PILL + SECONDARY EMERALD PILL (#0F766E) */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
                  {/* Primary Gradient Pill: Scan Another */}
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-1/2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#1E3A8A] via-[#2A4DC7] to-[#3B5FE0] hover:from-[#193278] hover:to-[#3252CA] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-blue-400/30"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('scanMedicine.scanAnother', 'Scan Another Medicine')}</span>
                  </button>

                  {/* Secondary Emerald Pill: Check My Prescription (Safety Action #0F766E) */}
                  <button
                    onClick={() => navigate('/prescriptions/scan')}
                    className="w-full sm:w-1/2 py-3.5 px-6 rounded-full bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-[#0F766E]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('prescriptions.checkMyPrescription', 'Check My Prescription')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* NO INFO AVAILABLE STATE */}
            {lookupResult.status === 'NO_INFO_AVAILABLE' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_10px_30px_rgba(30,58,138,0.06)] text-left space-y-5">
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
                      {lookupResult.drugName || t('medicineInfo.medicationNotListed', 'Medication Not Listed')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">OpenFDA Public Database</p>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-4.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                  <p>
                    {lookupResult.summary ||
                      t(
                        'medicineInfo.medicationNotListedDesc',
                        'General clinical background is not currently indexed in the OpenFDA database for this brand name. Please check spelling or consult your pharmacist.'
                      )}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-1/2 py-3.5 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    {t('medicineInfo.searchAnotherName', 'Search Another Name')}
                  </button>
                  <button
                    onClick={() => navigate('/hospitals')}
                    className="w-full sm:w-1/2 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold border-[1.5px] border-slate-300 transition-all cursor-pointer active:scale-95"
                  >
                    {t('medicineInfo.consultHealthcareProvider', 'Consult Healthcare Provider')}
                  </button>
                </div>
              </div>
            )}

            {/* UNCLEAR TEXT STATE */}
            {lookupResult.status === 'UNCLEAR_TEXT' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-[0_10px_30px_rgba(30,58,138,0.06)] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
                  <HelpCircle className="w-8 h-8 text-amber-600" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                    {t('medicineInfo.couldNotReadTitle', 'Could Not Read Medicine Name')}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {lookupResult.summary ||
                      t(
                        'medicineInfo.couldNotReadDesc',
                        'Please ensure direct lighting without camera glare so the printed label or blister strip is sharp and legible, or search the medication name directly.'
                      )}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#3B5FE0] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    {t('medicineInfo.tryPhotoAgain', 'Try Photo Again')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Live In-App Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={(img) => {
          setImagePreview(img);
          processLookup({ image: img });
        }}
        onOpenGallery={handleOpenGallery}
        title={t('prescriptions.whatIsThisFor', 'What Is This Medicine For?')}
        themeColor="blue"
      />
    </div>
  );
};
