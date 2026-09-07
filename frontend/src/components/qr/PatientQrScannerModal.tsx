import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Search,
  AlertCircle,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Building2,
  CheckCircle2,
  FlipHorizontal,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiGet } from '../../lib/apiFetch';

export interface PatientQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  hospitalName?: string;
  portalRole?: 'receptionist' | 'doctor' | 'nurse' | 'admin' | 'staff';
  onPatientLoaded: (patientData: any) => void;
}

export const PatientQrScannerModal: React.FC<PatientQrScannerModalProps> = ({
  isOpen,
  onClose,
  hospitalId,
  hospitalName,
  portalRole = 'staff',
  onPatientLoaded,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'carepulse-patient-qr-reader';

  // Play auditory clinical confirmation beep
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio context may be restricted by browser policy
    }
  };

  // Fetch patient 360 records from backend using the scanned code
  const handleProcessCode = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      playScanChime();
      setSuccessMessage('Patient QR verified! Loading medical record...');

      const endpoint = `/staff/patient-qr-lookup?code=${encodeURIComponent(rawCode.trim())}${
        hospitalId ? `&hospital_id=${encodeURIComponent(hospitalId)}` : ''
      }`;
      const res = await apiGet(endpoint);
      const data: any = await res.json();

      if (res.ok && data && data.success && data.patient) {
        setTimeout(() => {
          setIsLoading(false);
          onPatientLoaded(data);
          onClose();
        }, 500);
      } else {
        throw new Error(data?.detail || 'Patient record could not be retrieved.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setSuccessMessage(null);
      setErrorMessage(err?.message || 'No registered patient matches this QR code. Try entering Patient ID manually.');
      // Restart scanner if camera mode is active
      if (activeMode === 'camera') {
        setTimeout(startCameraScanner, 2000);
      }
    }
  };

  const startCameraScanner = async () => {
    try {
      stopCameraScanner();
      setErrorMessage(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          stopCameraScanner();
          handleProcessCode(decodedText);
        },
        () => {
          // Frame error callback (empty to prevent log flooding during active search)
        }
      );
    } catch (err: any) {
      console.warn('Camera scanner initialization error:', err);
      setIsScanning(false);
      setActiveMode('manual');
      setErrorMessage('Camera access is unavailable or permission denied. You can upload a QR image or enter the Patient ID manually below.');
    }
  };

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Toggle Front / Back camera
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle uploaded file scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      stopCameraScanner();
      const html5QrCode = new Html5Qrcode('carepulse-patient-qr-reader-file');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleProcessCode(decodedText);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Could not detect a valid QR code in this image. Please ensure the QR code is clearly visible.');
    }
  };

  // Handle manual code form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setErrorMessage('Please enter a valid Patient ID, Code, or Phone number.');
      return;
    }
    stopCameraScanner();
    handleProcessCode(manualCode.trim());
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeMode, cameraFacing]);

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setManualCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* Header with Hospital Context */}
        <div className="bg-gradient-to-r from-[#0B5A54] via-[#0D6E67] to-teal-700 text-white p-4.5 sm:p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <QrCode className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-heading tracking-tight text-white">
                  Scan Patient QR
                </h3>
                <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md bg-white/20 border border-white/30 text-teal-100">
                  {portalRole}
                </span>
              </div>
              <p className="text-[11px] text-teal-100/90 font-medium flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3 text-teal-200 shrink-0" />
                <span>Scoped to: <strong>{hospitalName || 'Current Hospital Facility'}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 bg-slate-100/80 p-1.5 border-b border-slate-200/80 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                : 'hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              stopCameraScanner();
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                : 'hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              stopCameraScanner();
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                : 'hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Manual ID</span>
          </button>
        </div>

        {/* Main Scanner Container */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Status / Alert Messages */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200/90 text-rose-800 text-xs font-bold p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{errorMessage}</p>
                {activeMode === 'camera' && (
                  <button
                    type="button"
                    onClick={() => setActiveMode('manual')}
                    className="text-[11px] underline font-extrabold text-[#0B5A54] hover:text-teal-800"
                  >
                    Switch to Manual ID search &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: LIVE CAMERA SCANNER */}
          {activeMode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-square shadow-inner flex items-center justify-center border-2 border-teal-600/30">
                {/* HTML5 QR Camera Container */}
                <div id={readerElementId} className="w-full h-full" />

                {/* Animated Laser Scanning Line */}
                {isScanning && !isLoading && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-teal-400/70 rounded-2xl relative shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-300 to-transparent absolute shadow-[0_0_8px_#2dd4bf] animate-[bounce_2s_infinite]" />
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-teal-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-teal-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-teal-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-teal-400 rounded-br" />
                    </div>
                  </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2.5 z-20">
                    <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                    <p className="text-xs font-black tracking-wide">Retrieving Medical Profile...</p>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  Point camera at patient's CarePulse QR code
                </span>
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all active:scale-95 cursor-pointer text-[11px]"
                  title="Switch Front / Rear Camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Switch Camera</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: FILE UPLOAD SCANNER */}
          {activeMode === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div id="carepulse-patient-qr-reader-file" className="hidden" />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-600/40 hover:border-[#0B5A54] rounded-3xl p-8 text-center bg-teal-50/40 hover:bg-teal-50/70 transition-all cursor-pointer space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-[#0B5A54] flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 font-heading">
                    Upload Patient QR Image
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Click to select screenshot or photo of patient health card or app
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Select File from Computer
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: MANUAL ID LOOKUP */}
          {activeMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1 font-heading">
                  Enter Patient Code, ID, or Phone
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. P000002, PAT-000001, or +91 98765 43210"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium mt-1 pl-1">
                  Works with official CarePulse display code (P000001), raw UUID, or registered phone.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !manualCode.trim()}
                className="w-full py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Medical Database...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Find Patient Record</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Help Banner */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                <p className="text-[11px] font-extrabold text-slate-800">Quick Demo Code:</p>
                <p className="text-[10px] text-slate-500 font-mono">P000002 • User (sivanagu7771@gmail.com)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setManualCode('P000002');
                setActiveMode('manual');
              }}
              className="px-2.5 py-1 text-[10px] font-black bg-white hover:bg-teal-50 text-[#0B5A54] border border-teal-200 rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
            >
              Use Code
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Multi-Hospital EMR Scan Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold transition-all cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
