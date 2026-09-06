import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Pill,
  Sparkles,
  Utensils,
  Clock,
  UserCheck,
  Info,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
} from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { apiFetch } from '../../lib/apiFetch';
import type { ScanMatchResponse, ScanMatchResult, DrugInfoData, MedicineSearchResultItem } from '../../lib/types';
import { MedicineAutocompleteInput } from '../../components/medicines/MedicineAutocompleteInput';
import { LiveCameraModal } from '../../components/camera/LiveCameraModal';
import { MedicineModeSelector } from '../../components/prescriptions/MedicineModeSelector';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useTranslation } from '../../i18n';

export const ScanMedicineScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCarePulseStore((s) => s.user);
  const prescriptions = useCarePulseStore((s) => s.prescriptions);
  const syncPrescriptions = useCarePulseStore((s) => s.syncPrescriptions);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanMatchResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<ScanMatchResult | null>(null);
  const [candidateDrugInfo, setCandidateDrugInfo] = useState<DrugInfoData | null>(null);
  const [isLoadingDrugInfo, setIsLoadingDrugInfo] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [editableQuery, setEditableQuery] = useState('');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  // Sync prescriptions on mount
  React.useEffect(() => {
    if (user?.id) {
      syncPrescriptions(user.id);
    }
  }, [user?.id, syncPrescriptions]);

  // On mobile hardware back button: close camera modal if open, otherwise go directly to Home
  React.useEffect(() => {
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

  // Open native camera on mobile device, or live in-app camera viewfinder on web
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
          processScan(fullBase64);
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
          processScan(fullBase64);
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

  // Gallery / File Input Picker with automatic client-side compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorNotice(null);
    try {
      const compressedBase64 = await compressImageFile(file, 1024, 0.75);
      if (compressedBase64) {
        setImagePreview(compressedBase64);
        processScan(compressedBase64);
      }
    } catch (err) {
      console.warn('Compression notice:', err);
    }
    e.target.value = '';
  };

  // Send image to backend OCR and fuzzy match endpoint
  const processScan = async (base64Image: string) => {
    setIsAnalyzing(true);
    setScanResult(null);
    setSelectedCandidate(null);
    setCandidateDrugInfo(null);
    setErrorNotice(null);

    try {
      const patientId = user?.id || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      const res = await apiFetch('/prescriptions/scan-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          patientId: patientId,
        }),
      });

      if (res.ok) {
        const data: ScanMatchResponse = await res.json();
        setScanResult(data);
        const prefill = data.match?.drugName || data.extractedText || '';
        setEditableQuery(prefill);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorNotice(errData?.detail || 'Failed to process image. Please try again.');
        setScanResult({
          status: 'NO_MATCH',
          matchType: 'NO_MATCH',
          confidence: 0,
          message: 'Could not connect to verification service. Please try again.',
          extractedText: '',
        });
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorNotice('Network error while processing scan. Please ensure you are connected.');
      setScanResult({
        status: 'NO_MATCH',
        matchType: 'NO_MATCH',
        confidence: 0,
        message: 'Could not complete scan verification. Please check your connection.',
        extractedText: '',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // When patient selects a candidate from AMBIGUOUS results
  const handleSelectCandidate = async (candidate: ScanMatchResult) => {
    setSelectedCandidate(candidate);
    setIsLoadingDrugInfo(true);
    try {
      const res = await apiFetch(
        `/prescriptions/drug-info?drug_name=${encodeURIComponent(candidate.drugName)}`,
        { method: 'GET' }
      );
      if (res.ok) {
        const info: DrugInfoData = await res.json();
        setCandidateDrugInfo(info);
      }
    } catch (e) {
      console.warn('Drug info fetch note:', e);
      setCandidateDrugInfo({
        drug_name: candidate.drugName,
        found: false,
        purpose: 'General information not available for this medication — please consult your doctor or pharmacist.',
        summary: 'General information not available for this medication — please consult your doctor or pharmacist.',
        source: 'Fallback',
      });
    } finally {
      setIsLoadingDrugInfo(false);
    }
  };

  // When user refines or confirms a near-miss medication from autocomplete
  const handleSelectFromAutocomplete = (item: MedicineSearchResultItem) => {
    setEditableQuery(item.name);

    // Cross-reference against active prescriptions
    const matchedPrescription = prescriptions.find((p) => {
      const pName = (p.drugName || '').toLowerCase();
      const sName = item.name.toLowerCase();
      const sGen = (item.generic_name || '').toLowerCase();
      return (
        pName.includes(sName) ||
        sName.includes(pName) ||
        pName.includes(sGen) ||
        sGen.includes(pName)
      );
    });

    if (matchedPrescription) {
      const confirmedCandidate: ScanMatchResult = {
        id: matchedPrescription.id,
        drugName: matchedPrescription.drugName,
        dosage: matchedPrescription.dosage,
        frequency: matchedPrescription.frequency,
        mealTiming: matchedPrescription.mealTiming ?? undefined,
        prescriber: matchedPrescription.prescriber,
        confidence: 0.95,
      };

      setScanResult({
        status: 'SUCCESS',
        matchType: 'HIGH_CONFIDENCE',
        confidence: 0.95,
        message: 'Verified from your active prescriptions.',
        extractedText: item.name,
        match: confirmedCandidate,
      });

      handleSelectCandidate(confirmedCandidate);
    } else {
      setSelectedCandidate(null);
      setScanResult({
        status: 'NO_MATCH',
        matchType: 'NO_MATCH',
        confidence: 0.0,
        message: `"${item.name}" was selected, but it does not match any of your active prescriptions.`,
        extractedText: item.name,
      });
    }
  };

  const handleResetScan = () => {
    setImagePreview(null);
    setScanResult(null);
    setSelectedCandidate(null);
    setCandidateDrugInfo(null);
    setErrorNotice(null);
    setEditableQuery('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-10 w-full select-none font-sans text-slate-800">
      {/* Hidden File Input Fallback */}
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
                {t('scanMedicine.title', 'Medicine Info')}
              </h1>
            </div>
          </div>

          {imagePreview && !isAnalyzing && (
            <button
              onClick={handleResetScan}
              className="px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('common.retry', 'Reset')}</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* UNIFIED FLOATING SEGMENTED CONTROL */}
        <MedicineModeSelector activeMode="prescription" />

        {/* Error Notice if any */}
        {errorNotice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2.5 shadow-xs">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* STATE 1: INITIAL CAMERA CAPTURE / UPLOAD PROMPT */}
        {!imagePreview && !isAnalyzing && (
          <div className="space-y-4">
            {/* Visual Guide Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-2xs">
                <Camera className="w-8 h-8 text-[#0B5A54]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  {t('scanMedicine.title', 'Identify Your Tablet Strip or Box')}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 max-w-md mx-auto leading-relaxed">
                  {t('scanMedicine.subtitle', "Lost your medicine packaging or unsure whether to take your pill before or after food? Take a photo of the tablet foil or box to safely match with your doctor's prescriptions.")}
                </p>
              </div>

              {/* Step instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-left">
                <div className="bg-[#F8FAFC] border border-slate-100 p-3 rounded-2xl space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#0B5A54] text-xs font-black flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800">{t('scanMedicine.tip1', 'Clear Lighting')}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Ensure packaging text is well-lit without blinding foil reflections.
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-100 p-3 rounded-2xl space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#0B5A54] text-xs font-black flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800">{t('scanMedicine.tip2', 'Show Drug Name')}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Position the printed brand or generic medicine name in focus.
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-100 p-3 rounded-2xl space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#0B5A54] text-xs font-black flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800">{t('scanMedicine.tip3', 'Safety Check')}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Cross-references strictly against your own active prescriptions.
                  </p>
                </div>
              </div>

              {/* Zero Active Prescription Banner */}
              {prescriptions.length === 0 && (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 text-center">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black text-slate-900 font-heading">
                      No Active Prescriptions on File
                    </h3>
                    <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-normal">
                      You currently have no active doctor prescriptions to safety-check against. To find out what an unfamiliar medicine is used for, please use <strong>"What Is This For?"</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/medicine/info-lookup')}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-100" />
                    <span>Switch to "What Is This For?"</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleStartCamera}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#0D655E] hover:to-[#0F9488] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-teal-400/20"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>{t('scanMedicine.capturePhoto', 'Take Photo with Camera')}</span>
                </button>

                <button
                  onClick={handleOpenGallery}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold border-[1.5px] border-slate-300 hover:border-slate-400 shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>{t('scanMedicine.uploadGallery', 'Choose from Gallery')}</span>
                </button>
              </div>
            </div>

            {/* Rebuilt Doctor-Verified Safety Banner */}
            <div className="bg-gradient-to-r from-emerald-50/90 via-[#F0FDF4] to-teal-50/90 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-black text-emerald-950 tracking-tight">
                  {t('scanMedicine.doctorVerifiedCheck', 'Doctor-Verified Safety Check')}
                </p>
                <p className="text-[11px] sm:text-xs text-emerald-800/90 leading-snug">
                  {t(
                    'scanMedicine.doctorVerifiedDesc',
                    'Matches strictly against your active prescriptions to confirm correct dosage and food timing.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: SCANNING / ANALYZING ANIMATION */}
        {isAnalyzing && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5 my-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-[#0B5A54]/10 animate-ping" />
              <div className="relative w-24 h-24 rounded-3xl bg-[#0B5A54] text-white flex items-center justify-center shadow-lg">
                <Sparkles className="w-10 h-10 animate-pulse text-teal-200" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900 font-heading">
                {t('scanMedicine.processing', 'Scanning Medicine Packaging...')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('scanMedicine.analyzingPill', 'Reading drug name, strength & dosage form...')}
              </p>
            </div>

            {imagePreview && (
              <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
                <img
                  src={imagePreview}
                  alt="Packaging preview"
                  className="w-full h-36 object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14B8A6]/20 to-transparent animate-bounce" />
              </div>
            )}
          </div>
        )}

        {/* STATE 3: SCAN RESULTS DISPLAY */}
        {!isAnalyzing && scanResult && (
          <div className="space-y-4">
            {/* 3A: HIGH CONFIDENCE MATCH VIEW */}
            {scanResult.matchType === 'HIGH_CONFIDENCE' && scanResult.match && (
              <div className="space-y-4">
                {/* Verified Header Badge */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black">Verified Prescription Match</h4>
                      <p className="text-[10.5px] text-emerald-700 font-medium">
                        Matched with your active prescriptions ({Math.round((scanResult.confidence || 0.95) * 100)}% confidence)
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0">
                    Active Rx
                  </span>
                </div>

                {/* Primary Medication Card */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#E3F3F1] border border-[#14B8A6]/20 text-[#0B5A54] flex items-center justify-center shrink-0 shadow-2xs">
                        <Pill className="w-6 h-6 text-[#0B5A54]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 truncate font-heading">
                          {scanResult.match.drugName}
                        </h2>
                        <p className="text-xs font-bold text-[#0B5A54]">
                          Prescribed: {scanResult.match.dosage}
                        </p>
                      </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-[10.5px] font-extrabold px-2.5 py-1 rounded-xl shrink-0">
                      {scanResult.match.prescriber || 'Treating Physician'}
                    </span>
                  </div>

                  {/* PROMINENT MEAL TIMING BANNER (CRITICAL SAFETY FOCUS) */}
                  <div className="bg-gradient-to-r from-[#E3F3F1] via-[#E8F8F6] to-[#E3F3F1] border-2 border-[#14B8A6]/40 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-[#0B5A54]">
                      <Utensils className="w-4 h-4 text-[#0B5A54]" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Meal Timing & Food Instructions
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Take {scanResult.match.mealTiming ? scanResult.match.mealTiming.toUpperCase() : 'AS DIRECTED'}
                    </p>
                  </div>

                  {/* Dosing Frequency & Schedule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3 space-y-1">
                      <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Frequency</span>
                      </p>
                      <p className="text-xs font-black text-slate-800">
                        {scanResult.match.frequency || 'Follow prescription label'}
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3 space-y-1">
                      <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Prescribing Doctor</span>
                      </p>
                      <p className="text-xs font-black text-slate-800 truncate">
                        {scanResult.match.prescriber || 'Treating Physician'}
                      </p>
                    </div>
                  </div>

                  {/* ABOUT THIS MEDICATION (OPENFDA GENERAL BACKGROUND SECTION) */}
                  {(() => {
                    const dInfo = scanResult.drugInfo || scanResult.match?.drugInfo;
                    const hasStructured = dInfo && (
                      (dInfo.boxedWarning && dInfo.boxedWarning.length > 0) ||
                      (dInfo.mainUses && dInfo.mainUses.length > 0) ||
                      (dInfo.howToTake && dInfo.howToTake.length > 0) ||
                      (dInfo.warnings && dInfo.warnings.length > 0) ||
                      (dInfo.sideEffects && dInfo.sideEffects.length > 0)
                    );

                    return (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Info className="w-4 h-4 text-[#14B8A6]" />
                            <h4 className="text-xs font-black tracking-tight">{t('scanMedicine.aboutThisMedication', 'About this medication')}</h4>
                          </div>
                          <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {dInfo?.source || 'OpenFDA'}
                          </span>
                        </div>

                        {hasStructured ? (
                          <div className="space-y-2 text-left">
                            {/* FDA Boxed Warning */}
                            {dInfo.boxedWarning && dInfo.boxedWarning.length > 0 && (
                              <div className="bg-red-50/70 border-2 border-red-500/80 rounded-2xl p-3 space-y-1.5">
                                <p className="text-[11px] font-black text-red-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <AlertOctagon className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                                  <span>FDA Boxed Warning</span>
                                </p>
                                <ul className="space-y-1">
                                  {dInfo.boxedWarning.slice(0, 3).map((bw, i) => (
                                    <li key={i} className="text-xs text-red-950 font-semibold flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                                      <span>{bw}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Main Uses */}
                            {dInfo.mainUses && dInfo.mainUses.length > 0 && (
                              <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-3 space-y-1.5">
                                <p className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Main Uses</span>
                                </p>
                                <ul className="space-y-1">
                                  {dInfo.mainUses.slice(0, 3).map((u, i) => (
                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                      <span>{u}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* How to Take */}
                            {dInfo.howToTake && dInfo.howToTake.length > 0 && (
                              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-3 space-y-1.5">
                                <p className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>How to Take It</span>
                                </p>
                                <ul className="space-y-1">
                                  {dInfo.howToTake.slice(0, 3).map((h, i) => (
                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                      <span>{h}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Important Warnings */}
                            {dInfo.warnings && dInfo.warnings.length > 0 && (
                              <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3 space-y-1.5">
                                <p className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Important Warnings</span>
                                </p>
                                <ul className="space-y-1">
                                  {dInfo.warnings.slice(0, 3).map((w, i) => (
                                    <li key={i} className="text-xs text-amber-950 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                      <span>{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Possible Side Effects */}
                            {dInfo.sideEffects && dInfo.sideEffects.length > 0 && (
                              <div className="bg-rose-50/50 border border-rose-200/70 rounded-2xl p-3 space-y-1.5">
                                <p className="text-[11px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Possible Side Effects</span>
                                </p>
                                <ul className="space-y-1">
                                  {dInfo.sideEffects.slice(0, 3).map((s, i) => (
                                    <li key={i} className="text-xs text-rose-950 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <p className="text-[10px] text-slate-400 font-medium italic pt-0.5">
                              * General clinical background provided for educational awareness. Always adhere strictly to your personal doctor instructions.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 text-left space-y-1.5">
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                              {dInfo?.summary ||
                                'General information not available for this medication — please consult your doctor or pharmacist.'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium italic">
                              * General clinical background provided for educational awareness. Always adhere strictly to your personal doctor instructions.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Image Verification Thumbnail */}
                  {imagePreview && (
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold">Scanned Packaging Photo</span>
                      <img
                        src={imagePreview}
                        alt="Scanned Packaging"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleResetScan}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('scanMedicine.scanAnotherPill', 'Scan Another Pill')}</span>
                  </button>
                  <button
                    onClick={() => navigate('/prescriptions')}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Pill className="w-4 h-4 text-[#0B5A54]" />
                    <span>{t('scanMedicine.viewAllPrescriptions', 'View All Prescriptions')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3B: AMBIGUOUS RESULT VIEW (MULTIPLE CANDIDATES) */}
            {scanResult.matchType === 'AMBIGUOUS' && (
              <div className="space-y-4">
                {/* Warning header */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-black">{t('scanMedicine.ambiguousMatch', 'Ambiguous Match — Please Confirm')}</h4>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    {scanResult.message ||
                      t(
                        'scanMedicine.ambiguousDesc',
                        'We found multiple possible prescription matches on your records. Tap the exact medicine shown on your blister pack.'
                      )}
                  </p>
                </div>

                {/* Typo-Tolerant Near-Miss Autocomplete Correction */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('scanMedicine.refineTabletName', 'Near-Miss OCR? Refine Tablet Name:')}</span>
                    </span>
                    {scanResult.extractedText && (
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        OCR: "{scanResult.extractedText.slice(0, 16)}"
                      </span>
                    )}
                  </div>
                  <MedicineAutocompleteInput
                    value={editableQuery}
                    onChange={setEditableQuery}
                    onSelect={handleSelectFromAutocomplete}
                    placeholder={t('medicineAutocomplete.searchPlaceholder', 'Type to search and confirm medicine...')}
                  />
                </div>

                {/* If user hasn't selected a candidate yet -> show candidate list */}
                {!selectedCandidate ? (
                  <div className="space-y-2.5 text-left">
                    <p className="text-xs font-extrabold text-slate-700 px-1">
                      {t('scanMedicine.selectMatching', 'Select Matching Prescription')} ({scanResult.matches?.length || 0}):
                    </p>

                    <div className="space-y-2">
                      {scanResult.matches?.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => handleSelectCandidate(candidate)}
                          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-[#14B8A6] hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-98"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#E3F3F1] text-[#0B5A54] flex items-center justify-center shrink-0">
                              <Pill className="w-5 h-5 text-[#0B5A54]" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {candidate.drugName}
                              </h5>
                              <p className="text-[11px] font-bold text-[#0B5A54]">
                                {candidate.dosage} • {candidate.frequency}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Meal timing: {candidate.mealTiming || 'As directed'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                              {Math.round((candidate.confidence || 0.6) * 100)}% match
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Expanded details for chosen candidate */
                  <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 text-left">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[#E3F3F1] text-[#0B5A54] flex items-center justify-center shrink-0">
                            <Pill className="w-6 h-6 text-[#0B5A54]" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 truncate font-heading">
                              {selectedCandidate.drugName}
                            </h2>
                            <p className="text-xs font-bold text-[#0B5A54]">
                              Prescribed: {selectedCandidate.dosage}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedCandidate(null)}
                          className="text-xs text-[#0B5A54] font-extrabold hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {/* Meal timing */}
                      <div className="bg-[#E3F3F1] border border-[#14B8A6]/40 rounded-2xl p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#0B5A54]">
                          <Utensils className="w-4 h-4 text-[#0B5A54]" />
                          <span className="text-xs font-black uppercase">Meal Timing</span>
                        </div>
                        <p className="text-sm sm:text-base font-black text-slate-900">
                          Take {selectedCandidate.mealTiming ? selectedCandidate.mealTiming.toUpperCase() : 'AS DIRECTED'}
                        </p>
                      </div>

                      {/* Dosage details */}
                      <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3 text-xs space-y-1">
                        <p className="text-slate-400 font-extrabold uppercase text-[10px]">Frequency</p>
                        <p className="text-slate-800 font-black">{selectedCandidate.frequency}</p>
                      </div>

                      {/* About this medication (OpenFDA) */}
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Info className="w-4 h-4 text-[#14B8A6]" />
                            <h4 className="text-xs font-black">About this medication</h4>
                          </div>
                          {isLoadingDrugInfo && (
                            <span className="text-[9.5px] font-bold text-slate-400 animate-pulse">
                              Fetching...
                            </span>
                          )}
                        </div>

                        <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 text-left space-y-1">
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                            {candidateDrugInfo?.summary ||
                              'General information not available for this medication — please consult your doctor or pharmacist.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleResetScan}
                        className="w-full py-3 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                      >
                        Scan Another Tablet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3B-EXTRA: NO ACTIVE PRESCRIPTION VIEW */}
            {(scanResult.status === 'NO_ACTIVE_PRESCRIPTION' || scanResult.matchType === 'NO_ACTIVE_PRESCRIPTION') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-md text-left space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-amber-900 font-heading">
                      No Active Prescriptions on Record
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                      {scanResult.message || "You currently do not have any active doctor prescriptions to safety-check against."}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  The "Check My Prescription" tool only verifies medicines against your active doctor prescriptions. To discover what this tablet or medicine is generally used for, switch to <strong>"What Is This For?"</strong>.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => navigate('/medicine/info-lookup')}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-blue-100" />
                    <span>Switch to "What Is This For?"</span>
                  </button>

                  <button
                    onClick={handleResetScan}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3C: NO MATCH / UNRECOGNIZED VIEW (SAFETY ALERT) */}
            {scanResult.status === 'NO_MATCH' && scanResult.matchType === 'NO_MATCH' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-rose-300 shadow-md text-left space-y-5">
                {/* Prominent Red Safety Banner */}
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-rose-900 font-heading">
                      ⚠️ No Prescription Match Found
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-800 font-bold leading-relaxed">
                      {scanResult.message ||
                        "This doesn't match any of your current prescriptions. Do NOT take this medication without confirming with your doctor or pharmacist."}
                    </p>
                  </div>
                </div>

                {/* Safety Explanation */}
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Why was no match found?</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>The medicine packaging might not be part of your current active prescriptions.</li>
                    <li>The photo may have had reflections, blurriness, or obscured text.</li>
                    <li>This tablet may belong to another family member or previous consultation.</li>
                  </ul>
                </div>

                {/* OCR text preview for transparency */}
                {scanResult.extractedText && (
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      OCR Extracted Text
                    </p>
                    <p className="text-xs text-slate-700 font-mono italic">
                      "{scanResult.extractedText.slice(0, 180)}..."
                    </p>
                  </div>
                )}

                {/* Search & Correct Medication Name */}
                <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Was the packaging text misread? Try typing its name:</span>
                    </span>
                  </div>
                  <MedicineAutocompleteInput
                    value={editableQuery}
                    onChange={setEditableQuery}
                    onSelect={handleSelectFromAutocomplete}
                    placeholder="Search by tablet name (e.g. Amoxicillin, Paracetamol)..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleResetScan}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Scanning Again</span>
                  </button>

                  <button
                    onClick={() => navigate('/hospitals')}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-600" />
                    <span>Consult a Doctor</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3D: UNREADABLE OCR IMAGE */}
            {scanResult.status === 'UNREADABLE' && (
              <div className="bg-white rounded-3xl p-6 border border-amber-300 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <HelpCircle className="w-7 h-7 text-amber-600" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-black text-slate-900">
                    Couldn't Read Medicine Label
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {scanResult.message ||
                      'Please ensure good lighting and hold the camera steady so the drug name is clearly visible.'}
                  </p>
                </div>
                <button
                  onClick={handleResetScan}
                  className="px-6 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Retake Photo
                </button>
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
          processScan(img);
        }}
        onOpenGallery={() => fileInputRef.current?.click()}
        title="Check My Prescription"
        themeColor="teal"
      />
    </div>
  );
};
