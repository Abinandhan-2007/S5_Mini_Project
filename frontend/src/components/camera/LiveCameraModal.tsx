import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Upload,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  onOpenGallery?: () => void;
  title?: string;
  themeColor?: 'teal' | 'blue';
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onOpenGallery,
  title = 'Scan Medicine Packaging',
  themeColor = 'teal',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user') => {
    setCameraError(null);
    setIsReady(false);

    // Stop existing stream if running
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
          setIsReady(true);
        };
      }

      // Check for torch capability
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to open camera stream:', err);
      let msg = 'Unable to access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application.';
      }
      setCameraError(msg);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsReady(false);
    setTorchEnabled(false);
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchEnabled(nextState);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  // Flip Camera
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture Frame
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual shutter flash animation
    setIsFlashing(true);

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // High quality JPEG
    const base64Image = canvas.toDataURL('image/jpeg', 0.92);

    setTimeout(() => {
      setIsFlashing(false);
      stopCamera();
      onCapture(base64Image);
      onClose();
    }, 120);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isTeal = themeColor === 'teal';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between items-center select-none animate-in fade-in duration-200">
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER CONTROLS */}
      <div className="w-full px-4 pt-4 pb-2 flex items-center justify-between z-20 text-white max-w-lg mx-auto">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Close Camera"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="text-sm font-black tracking-tight text-white">{title}</h3>
          <p className="text-[10.5px] text-slate-300 font-medium">Position tablet packaging inside the frame</p>
        </div>

        <div className="flex items-center gap-1.5">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer',
                torchEnabled ? 'bg-amber-400 text-slate-950' : 'bg-white/15 hover:bg-white/25 text-white'
              )}
              title="Flashlight"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Flip Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEWFINDER CENTER AREA */}
      <div className="relative flex-1 w-full max-w-md mx-auto flex items-center justify-center overflow-hidden px-4">
        {/* Shutter flash overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150" />
        )}

        {/* Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={clsx(
            'w-full h-full object-cover rounded-3xl transition-opacity duration-300',
            isReady ? 'opacity-100' : 'opacity-0',
            facingMode === 'user' && 'scale-x-[-1]'
          )}
        />

        {/* TARGETING RETICLE OVERLAY */}
        {isReady && !cameraError && (
          <div className="absolute inset-x-6 inset-y-12 sm:inset-x-8 sm:inset-y-16 pointer-events-none flex flex-col justify-between items-center">
            {/* Top Corner Borders */}
            <div className="w-full flex justify-between">
              <div
                className={clsx(
                  'w-8 h-8 border-t-3 border-l-3 rounded-tl-xl',
                  isTeal ? 'border-[#14B8A6]' : 'border-blue-400'
                )}
              />
              <div
                className={clsx(
                  'w-8 h-8 border-t-3 border-r-3 rounded-tr-xl',
                  isTeal ? 'border-[#14B8A6]' : 'border-blue-400'
                )}
              />
            </div>

            {/* Scanning Laser Line */}
            <div className="w-full relative overflow-hidden flex items-center justify-center h-40">
              <div
                className={clsx(
                  'w-full h-0.5 shadow-lg animate-bounce',
                  isTeal ? 'bg-[#14B8A6] shadow-[#14B8A6]/80' : 'bg-blue-400 shadow-blue-400/80'
                )}
              />
            </div>

            {/* Bottom Corner Borders */}
            <div className="w-full flex justify-between">
              <div
                className={clsx(
                  'w-8 h-8 border-b-3 border-l-3 rounded-bl-xl',
                  isTeal ? 'border-[#14B8A6]' : 'border-blue-400'
                )}
              />
              <div
                className={clsx(
                  'w-8 h-8 border-b-3 border-r-3 rounded-br-xl',
                  isTeal ? 'border-[#14B8A6]' : 'border-blue-400'
                )}
              />
            </div>
          </div>
        )}

        {/* CAMERA ERROR / PERMISSION DENIED FALLBACK */}
        {cameraError && (
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 text-center space-y-4 max-w-xs mx-auto shadow-2xl z-30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white">Camera Access Error</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => startCamera(facingMode)}
                className="w-full py-2.5 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
              >
                Try Again
              </button>
              {onOpenGallery && (
                <button
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onOpenGallery();
                  }}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose from Gallery / Files</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM SHUTTER BAR */}
      <div className="w-full pb-8 pt-4 px-6 z-20 max-w-lg mx-auto flex items-center justify-around">
        {/* Gallery shortcut */}
        {onOpenGallery ? (
          <button
            onClick={() => {
              stopCamera();
              onClose();
              onOpenGallery();
            }}
            className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center transition-all cursor-pointer"
            title="Upload from Gallery"
          >
            <Upload className="w-5 h-5 text-white" />
            <span className="text-[8px] font-bold text-slate-200 mt-0.5">Gallery</span>
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}

        {/* Primary Shutter Button */}
        <button
          onClick={handleSnapPhoto}
          disabled={!isReady || Boolean(cameraError)}
          className={clsx(
            'w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xl',
            isReady && !cameraError
              ? isTeal
                ? 'bg-white ring-4 ring-[#14B8A6]/80'
                : 'bg-white ring-4 ring-blue-500/80'
              : 'bg-slate-700 opacity-50 cursor-not-allowed'
          )}
          title="Take Photo"
        >
          <div
            className={clsx(
              'w-full h-full rounded-full flex items-center justify-center transition-all',
              isTeal
                ? 'bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6]'
                : 'bg-gradient-to-tr from-[#1E40AF] to-[#2563EB]'
            )}
          >
            <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.2]" />
          </div>
        </button>

        {/* Flip shortcut */}
        <button
          onClick={toggleFacingMode}
          disabled={!isReady || Boolean(cameraError)}
          className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40"
          title="Switch Camera"
        >
          <RotateCcw className="w-5 h-5 text-white" />
          <span className="text-[8px] font-bold text-slate-200 mt-0.5">Flip</span>
        </button>
      </div>
    </div>
  );
};
