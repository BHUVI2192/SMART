import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, MapPin, CheckCircle, XCircle, Loader2, Upload, Navigation, Sparkles, Video } from 'lucide-react';
import jsQR from 'jsqr';
import { User } from '../../types';
import { AuthUser } from '../../services/auth';
import { isApiConfigured } from '../../services/api';
import { markAttendance, MarkAttendanceResult } from '../../services/attendance';
import { getActiveSession } from '../../services/sessions';
import { getCurrentPosition, GeoPosition } from '../../services/geolocation';

type ScanStage = 'PERMISSION' | 'CAMERA' | 'PROCESSING' | 'GPS_CHECK' | 'RESULT';
type ScanResult = 'SUCCESS' | 'FAIL_GPS' | 'FAIL_TIMEOUT' | 'FAIL_INVALID_QR' | 'FAIL_DUPLICATE';

interface ScanPageProps {
  user: User | null;
  authUser: AuthUser | null;
}

const SESSION_STORAGE_KEY = 'ams_active_session';

const ScanPage: React.FC<ScanPageProps> = ({ user, authUser }) => {
  const navigate = useNavigate();
  const apiReady = isApiConfigured();
  const [stage, setStage] = useState<ScanStage>('PERMISSION');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [markedSubjectName, setMarkedSubjectName] = useState<string>('');
  const [gpsPosition, setGpsPosition] = useState<GeoPosition | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startLiveCamera = async () => {
    setStage('CAMERA');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        // Start frame-by-frame QR scanning
        scanIntervalRef.current = window.setInterval(() => { scanFrame(); }, 250);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied or unavailable. Use the upload option instead.');
      setCameraActive(false);
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      // QR detected!
      stopCamera();
      setScannedData(code.data);
      setStage('GPS_CHECK');
    }
  };

  const startCamera = () => { startLiveCamera(); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setStage('PROCESSING');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setScannedData(code.data);
            setTimeout(() => setStage('GPS_CHECK'), 1000);
          } else {
            setResult('FAIL_INVALID_QR');
            setResultMessage('The uploaded image is not a valid QR code.');
            setStage('RESULT');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGpsVerification = async () => {
    setGpsLoading(true); setGpsError('');
    try {
      const position = await getCurrentPosition();
      setGpsPosition(position);
      if (apiReady) {
        const sessions = await getActiveSession({});
        if (sessions.length === 0) { setResult('FAIL_TIMEOUT'); setResultMessage('No active session found.'); setStage('RESULT'); return; }
        const matchingSession = sessions.find(s => s.token === scannedData);
        if (!matchingSession) { setResult('FAIL_INVALID_QR'); setResultMessage('QR code has expired or is invalid.'); setStage('RESULT'); return; }
        const apiResult: MarkAttendanceResult = await markAttendance({
          usn: authUser?.usn || authUser?.id || '', studentName: authUser?.name || user?.name || 'Unknown',
          sessionId: matchingSession.sessionId, token: scannedData || '',
          gpsLat: position.latitude, gpsLng: position.longitude,
        });
        if (apiResult.success) {
          setResult('SUCCESS'); setMarkedSubjectName(apiResult.subjectName || matchingSession.subjectName || 'Unknown Subject');
        } else {
          switch (apiResult.code) {
            case 'DUPLICATE': setResult('FAIL_DUPLICATE'); setResultMessage(apiResult.error || 'Already marked.'); break;
            case 'GPS_FAIL': setResult('FAIL_GPS'); setDistance(apiResult.distance || 0); setResultMessage(apiResult.error || 'Too far.'); break;
            case 'INVALID_TOKEN': setResult('FAIL_INVALID_QR'); setResultMessage(apiResult.error || 'QR expired.'); break;
            case 'SESSION_EXPIRED': setResult('FAIL_TIMEOUT'); setResultMessage(apiResult.error || 'Session expired.'); break;
            default: setResult('FAIL_GPS'); setResultMessage(apiResult.error || 'Verification failed.');
          }
        }
      } else {
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!storedSession) { setResult('FAIL_TIMEOUT'); setResultMessage('No active session found.'); setStage('RESULT'); return; }
        const sessionData = JSON.parse(storedSession);
        if (sessionData.token !== scannedData) { setResult('FAIL_INVALID_QR'); setResultMessage('QR code has expired.'); setStage('RESULT'); return; }
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          studentName: user?.name || 'Unknown Student', usn: (user as any)?.usn || authUser?.usn || 'UNKNOWN_USN',
          time: new Date().toLocaleTimeString(), status: 'SUCCESS'
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...sessionData, logs: [...(sessionData.logs || []), newLog] }));
        setResult('SUCCESS'); setMarkedSubjectName('Demo Subject');
      }
      setStage('RESULT');
    } catch (err: any) { setGpsError(err.message || 'Failed to get location'); setGpsLoading(false); }
    finally { setGpsLoading(false); }
  };

  const ResultCard: React.FC<{
    icon: React.ReactNode; title: string; message: string;
    accent: string; buttonText: string; buttonAction: () => void;
    buttonStyle?: string;
  }> = ({ icon, title, message, accent, buttonText, buttonAction, buttonStyle }) => (
    <div className="text-center w-full max-w-sm mx-auto animate-scale-in">
      <div className={`glass-card p-6 sm:p-8`}>
        <div className={`w-16 h-16 rounded-2xl ${accent} flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        {gpsPosition && result === 'SUCCESS' && (
          <p className="text-[10px] text-slate-400 mb-4">GPS: {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}</p>
        )}
        <button onClick={buttonAction} className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 ${buttonStyle || 'gradient-primary text-white'}`}>
          {buttonText}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-180px)] flex flex-col animate-fade-in">
      <div className="mb-4">
        <button onClick={() => { stopCamera(); navigate('/student/dashboard'); }} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 rounded-3xl overflow-hidden relative shadow-2xl shadow-black/20 flex flex-col gradient-dark">
        {/* Top Header */}
        <div className="p-5 pb-0 relative z-10 text-white text-center">
          <h2 className="text-base font-bold">Scan QR Code</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Point camera at QR or upload image</p>
        </div>

        {/* Hidden canvas for QR frame scanning */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white">

          {stage === 'PERMISSION' && (
            <div className="text-center space-y-6 animate-slide-up">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto animate-float">
                <Camera className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1.5">Camera & Location</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">We need permission to scan QR codes with your camera and verify your GPS location.</p>
              </div>
              <button onClick={startCamera} className="w-full py-3.5 gradient-accent rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                <Camera className="w-4 h-4 mr-2 inline" /> Open Camera & Scan
              </button>
            </div>
          )}

          {stage === 'CAMERA' && (
            <div className="w-full space-y-4 text-center animate-slide-up">
              {/* Live Camera View */}
              {cameraActive && (
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/10">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-indigo-400/50 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="inline-flex items-center bg-black/60 backdrop-blur-sm text-[10px] text-white/80 px-3 py-1 rounded-full">
                      <Video className="w-3 h-3 mr-1 text-red-400 animate-pulse" /> Scanning...
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs">
                  {cameraError}
                </div>
              )}

              {!cameraActive && !cameraError && (
                <div className="w-full h-48 border-2 border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                  <p className="text-sm text-slate-400">Starting camera...</p>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Upload fallback */}
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white/10 border border-white/10 text-white rounded-xl font-semibold text-sm hover:bg-white/15 transition-all flex items-center justify-center">
                <Upload className="w-4 h-4 mr-2" /> Upload QR Image
              </button>
            </div>
          )}

          {stage === 'PROCESSING' && (
            <div className="text-center animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <p className="text-base font-semibold">Processing QR...</p>
              <p className="text-[11px] text-slate-500 mt-1">Decoding image data</p>
            </div>
          )}

          {stage === 'GPS_CHECK' && (
            <div className="text-center space-y-5 w-full animate-slide-up">
              <div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${gpsLoading ? 'bg-indigo-500/20 animate-pulse-glow' : 'bg-amber-500/20'}`}>
                  {gpsLoading ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Navigation className="w-8 h-8 text-amber-400" />}
                </div>
                <h3 className="text-lg font-bold">
                  {gpsLoading ? 'Verifying Location...' : 'GPS Verification'}
                </h3>
                <p className="text-slate-400 text-sm mt-1.5 max-w-xs mx-auto">
                  {gpsLoading ? 'Checking your GPS against classroom' : 'Allow location access to verify'}
                </p>
              </div>
              {gpsError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{gpsError}</div>
              )}
              {gpsPosition && (
                <div className="bg-white/5 rounded-xl p-3 text-[11px] text-slate-500 border border-white/5">
                  <p>Lat: {gpsPosition.latitude.toFixed(6)}, Lng: {gpsPosition.longitude.toFixed(6)}</p>
                  <p>Accuracy: ±{Math.round(gpsPosition.accuracy)}m</p>
                </div>
              )}
              {!gpsLoading && (
                <button onClick={handleGpsVerification} className="w-full py-3.5 gradient-success rounded-xl font-bold text-sm transition-all flex items-center justify-center hover:shadow-lg hover:shadow-emerald-500/25">
                  <MapPin className="w-4 h-4 mr-2" /> Verify My Location
                </button>
              )}
            </div>
          )}

          {stage === 'RESULT' && result === 'SUCCESS' && (
            <ResultCard icon={<Sparkles className="w-8 h-8 text-emerald-600" />} title="Attendance Marked!" accent="bg-emerald-100"
              message={`Your attendance for ${markedSubjectName} has been recorded.`}
              buttonText="Done" buttonAction={() => navigate('/student/dashboard')} />
          )}
          {stage === 'RESULT' && result === 'FAIL_INVALID_QR' && (
            <ResultCard icon={<XCircle className="w-8 h-8 text-red-600" />} title="Invalid QR" accent="bg-red-100"
              message={resultMessage} buttonText="Try Again" buttonAction={() => { setStage('CAMERA'); setResult(null); startLiveCamera(); }}
              buttonStyle="bg-slate-800 text-white hover:bg-slate-700" />
          )}
          {stage === 'RESULT' && result === 'FAIL_GPS' && (
            <ResultCard icon={<XCircle className="w-8 h-8 text-red-600" />} title="Location Mismatch" accent="bg-red-100"
              message={`${resultMessage}${distance ? ` (${distance}m away)` : ''}`}
              buttonText="Try Again" buttonAction={() => { setStage('GPS_CHECK'); setResult(null); setGpsPosition(null); }}
              buttonStyle="bg-slate-800 text-white hover:bg-slate-700" />
          )}
          {stage === 'RESULT' && result === 'FAIL_TIMEOUT' && (
            <ResultCard icon={<XCircle className="w-8 h-8 text-red-600" />} title="Session Expired" accent="bg-red-100"
              message={resultMessage} buttonText="Go Back" buttonAction={() => navigate('/student/dashboard')} />
          )}
          {stage === 'RESULT' && result === 'FAIL_DUPLICATE' && (
            <ResultCard icon={<CheckCircle className="w-8 h-8 text-amber-600" />} title="Already Marked" accent="bg-amber-100"
              message={resultMessage} buttonText="Go Back" buttonAction={() => navigate('/student/dashboard')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanPage;