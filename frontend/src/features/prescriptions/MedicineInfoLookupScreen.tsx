import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Upload,
  RefreshCw,
  Info,
  Pill,
  Sparkles,
  Shield,
  HelpCircle,
  FileText,
  BookmarkCheck,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';
import type { MedicineInfoLookupResponse, MedicineSearchResultItem } from '../../lib/types';
import { MedicineAutocompleteInput } from '../../components/medicines/MedicineAutocompleteInput';
import { LiveCameraModal } from '../../components/camera/LiveCameraModal';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const MedicineInfoLookupScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lookupResult, setLookupResult] = useState<MedicineInfoLookupResponse | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  // Start native camera on mobile device, or live in-app camera viewfinder on web
  const handleStartCamera = async () => {
    setErrorNotice(null);
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 90,
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
          quality: 90,
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



  // File Picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorNotice(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setImagePreview(base64);
        processLookup({ image: base64 });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Perform Lookup via API
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
        const errData = await res.json().catch(() => ({}));
        setErrorNotice(errData?.detail || 'Failed to lookup medicine. Please try again.');
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setErrorNotice('Network error. Please check your connection.');
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
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 w-full select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* DISTINCT BLUE / INDIGO HEADER (INFORMATIONAL ONLY) */}
      <header className="bg-gradient-to-b from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight leading-tight">
                  What Is This Medicine For?
                </h1>
                <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  Open Info
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                General medication purpose via OpenFDA
              </p>
            </div>
          </div>

          {(imagePreview || lookupResult) && !isAnalyzing && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Lookup</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        {/* MODE SELECTOR */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-2xl">
          <button
            onClick={() => navigate('/prescriptions/scan')}
            className="py-2.5 px-3 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#0B5A54]" />
            <span>Check My Prescription</span>
          </button>

          <button
            className="py-2.5 px-3 rounded-xl bg-white text-blue-700 text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>What Is This For?</span>
          </button>
        </div>

        {/* MANDATORY PROMINENT DISCLAIMER BANNER */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-left text-blue-900 shadow-2xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-extrabold text-blue-950">General Information Only</p>
            <p className="text-[11px] text-blue-800 leading-snug">
              This informational lookup is <strong>NOT</strong> a verification against your prescriptions.
              To verify personal dosage and food instructions, use{' '}
              <button
                onClick={() => navigate('/prescriptions/scan')}
                className="underline font-bold text-blue-900 hover:text-blue-950 inline cursor-pointer"
              >
                Check My Prescription
              </button>{' '}
              instead.
            </p>
          </div>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* INITIAL CAPTURE / SEARCH STATE */}
        {!imagePreview && !lookupResult && !isAnalyzing && (
          <div className="space-y-4">
            {/* Guide Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200/60 flex items-center justify-center mx-auto text-blue-600 shadow-2xs">
                <Info className="w-8 h-8 text-blue-600" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  Scan or Search Any Medicine
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Curious what an unfamiliar pill, syrup, or tablet is generally used for?
                  Photograph the packaging or type its name to look up its medical purpose via the OpenFDA public library.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleStartCamera}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Packaging with Camera</span>
                </button>

                <button
                  onClick={handleOpenGallery}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Choose from Gallery</span>
                </button>
              </div>

              {/* Search By Name Alternative with Typo-Tolerant Autocomplete */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
                  Or search medication name (typo-tolerant autocomplete)
                </p>
                <div className="flex items-center gap-2 max-w-md mx-auto">
                  <div className="flex-1 min-w-0">
                    <MedicineAutocompleteInput
                      value={manualQuery}
                      onChange={setManualQuery}
                      onSelect={handleSelectMedicine}
                      placeholder="Type name (e.g. Dolo 650, Augmentin, Paracetamol)..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleManualSearch()}
                    disabled={!manualQuery.trim()}
                    className="px-4 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    Lookup
                  </button>
                </div>
              </div>
            </div>

            {/* Switch to Safety Check Promo */}
            <div className="bg-gradient-to-r from-[#E3F3F1] to-[#E8F8F6] border border-[#14B8A6]/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B5A54] text-white flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Need your personal dosage?</h4>
                  <p className="text-[11px] text-[#0B5A54] font-medium">
                    Cross-reference loose pills against your active prescriptions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/prescriptions/scan')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer"
              >
                Safety Check
              </button>
            </div>
          </div>
        )}

        {/* ANALYZING STATE */}
        {isAnalyzing && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5 my-4">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-blue-500/10 animate-ping" />
              <div className="relative w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-9 h-9 animate-pulse text-blue-200" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900 font-heading">
                Looking Up Medication Purpose...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Extracting drug name and retrieving therapeutic background from the OpenFDA public database.
              </p>
            </div>
          </div>
        )}

        {/* RESULTS STATE */}
        {!isAnalyzing && lookupResult && (
          <div className="space-y-4">
            {/* FOUND RESULT VIEW */}
            {lookupResult.status === 'FOUND' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200/80 shadow-sm space-y-4 text-left">
                {/* Header Tag */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 truncate font-heading">
                          {lookupResult.drugName}
                        </h2>
                      </div>
                      {lookupResult.genericName && (
                        <p className="text-[11px] font-bold text-blue-700">
                          Active Ingredient: {lookupResult.genericName}
                        </p>
                      )}
                      <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        Source: {lookupResult.source}
                      </span>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0">
                    Informational Only
                  </span>
                </div>

                {/* Purpose / Uses Box */}
                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Primary Purpose & Indications</span>
                  </p>
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-800 leading-relaxed space-y-2">
                    <p>{lookupResult.summary || lookupResult.purpose}</p>
                  </div>
                </div>

                {/* Additional Clinical Details if available */}
                {lookupResult.indicationsAndUsage && lookupResult.indicationsAndUsage !== lookupResult.summary && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Clinical Indications</span>
                    </p>
                    <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed">
                      <p>{lookupResult.indicationsAndUsage}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Another Medicine</span>
                  </button>

                  <button
                    onClick={() => navigate('/prescriptions/scan')}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Check My Prescription</span>
                  </button>
                </div>
              </div>
            )}

            {/* NO INFO AVAILABLE VIEW */}
            {lookupResult.status === 'NO_INFO_AVAILABLE' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-left space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{lookupResult.drugName || 'Medication'}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">OpenFDA Public Database</p>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed">
                  <p>{lookupResult.summary || 'General information not available for this medication — please consult your doctor or pharmacist.'}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Search Another
                  </button>
                  <button
                    onClick={() => navigate('/hospitals')}
                    className="w-full sm:w-1/2 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    Consult Doctor
                  </button>
                </div>
              </div>
            )}

            {/* UNCLEAR TEXT VIEW */}
            {lookupResult.status === 'UNCLEAR_TEXT' && (
              <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <HelpCircle className="w-7 h-7 text-amber-600" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-black text-slate-900">
                    Could Not Identify Medicine
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lookupResult.summary ||
                      'Please ensure good lighting without glare so the printed drug name is clearly visible, or type the name manually above.'}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Try Again
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
          processLookup({ image: img });
        }}
        onOpenGallery={handleOpenGallery}
        title="What Is This Medicine For?"
        themeColor="blue"
      />
    </div>
  );
};
