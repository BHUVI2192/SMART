import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, MapPin, CheckCircle, XCircle, Loader2, Upload, Navigation } from 'lucide-react';
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

  const startCamera = () => {
    setStage('CAMERA');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage('PROCESSING');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
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

  // Real GPS verification + API attendance marking
  const handleGpsVerification = async () => {
    setGpsLoading(true);
    setGpsError('');

    try {
      // Step 1: Get GPS position
      const position = await getCurrentPosition();
      setGpsPosition(position);

      if (apiReady) {
        // Step 2: Find the active session to get the sessionId
        const sessions = await getActiveSession({});

        if (sessions.length === 0) {
          setResult('FAIL_TIMEOUT');
          setResultMessage('No active session found. The class may have ended.');
          setStage('RESULT');
          return;
        }

        // Find the session matching our scanned token
        const matchingSession = sessions.find(s => s.token === scannedData);

        if (!matchingSession) {
          setResult('FAIL_INVALID_QR');
          setResultMessage('QR code has expired or is invalid. Ask the faculty for a fresh QR.');
          setStage('RESULT');
          return;
        }

        // Step 3: Call the API to mark attendance (server validates GPS + duplicate + token)
        const apiResult: MarkAttendanceResult = await markAttendance({
          usn: authUser?.usn || authUser?.id || '',
          studentName: authUser?.name || user?.name || 'Unknown',
          sessionId: matchingSession.sessionId,
          token: scannedData || '',
          gpsLat: position.latitude,
          gpsLng: position.longitude,
        });

        if (apiResult.success) {
          setResult('SUCCESS');
          setMarkedSubjectName(apiResult.subjectName || matchingSession.subjectName || 'Unknown Subject');
        } else {
          // Handle specific error codes
          switch (apiResult.code) {
            case 'DUPLICATE':
              setResult('FAIL_DUPLICATE');
              setResultMessage(apiResult.error || 'Already marked.');
              break;
            case 'GPS_FAIL':
              setResult('FAIL_GPS');
              setDistance(apiResult.distance || 0);
              setResultMessage(apiResult.error || 'Too far from classroom.');
              break;
            case 'INVALID_TOKEN':
              setResult('FAIL_INVALID_QR');
              setResultMessage(apiResult.error || 'QR expired.');
              break;
            case 'SESSION_EXPIRED':
              setResult('FAIL_TIMEOUT');
              setResultMessage(apiResult.error || 'Session expired.');
              break;
            default:
              setResult('FAIL_GPS');
              setResultMessage(apiResult.error || 'Verification failed.');
          }
        }
      } else {
        // Demo mode fallback — original localStorage logic
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!storedSession) {
          setResult('FAIL_TIMEOUT');
          setResultMessage('No active session found.');
          setStage('RESULT');
          return;
        }

        const sessionData = JSON.parse(storedSession);
        if (sessionData.token !== scannedData) {
          setResult('FAIL_INVALID_QR');
          setResultMessage('QR code has expired.');
          setStage('RESULT');
          return;
        }

        // Mark attendance locally
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          studentName: user?.name || 'Unknown Student',
          usn: (user as any)?.usn || authUser?.usn || 'UNKNOWN_USN',
          time: new Date().toLocaleTimeString(),
          status: 'SUCCESS'
        };
        const updatedLogs = [...(sessionData.logs || []), newLog];
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...sessionData, logs: updatedLogs }));

        setResult('SUCCESS');
        setMarkedSubjectName('Demo Subject');
      }

      setStage('RESULT');
    } catch (err: any) {
      setGpsError(err.message || 'Failed to get location');
      setGpsLoading(false);
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="flex items-center text-gray-600 hover:text-blue-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
      </div>

      <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-2xl flex flex-col">

        {/* Top Overlay */}
        <div className="absolute top-0 inset-x-0 p-6 z-10 bg-gradient-to-b from-black/70 to-transparent text-white">
          <h2 className="text-lg font-bold text-center">Scan QR Code</h2>
          <p className="text-xs text-gray-300 text-center">Upload the QR image provided by faculty</p>
        </div>

        {/* Content Area Based on Stage */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-gray-900 text-white p-6">

          {stage === 'PERMISSION' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Camera & Location Access</h3>
                <p className="text-gray-400 text-sm">We need permission to upload images and verify your GPS location.</p>
              </div>
              <button
                onClick={startCamera}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {stage === 'CAMERA' && (
            <div className="w-full space-y-6 text-center">
              <div className="w-full h-64 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center bg-gray-800/50">
                <Upload className="w-12 h-12 text-gray-500 mb-2" />
                <p className="text-gray-400 text-sm">Upload QR Image</p>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-white text-blue-900 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Select Image
              </button>
            </div>
          )}

          {stage === 'PROCESSING' && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Processing QR...</p>
            </div>
          )}

          {stage === 'GPS_CHECK' && (
            <div className="text-center space-y-6 w-full">
              <div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${gpsLoading ? 'bg-blue-500/20 animate-pulse' : 'bg-amber-500/20'
                  }`}>
                  {gpsLoading ? (
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  ) : (
                    <Navigation className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {gpsLoading ? 'Verifying Location...' : 'GPS Verification Required'}
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  {gpsLoading ? 'Checking your GPS location against the classroom' : 'Allow location access to verify you are in the classroom'}
                </p>
              </div>

              {gpsError && (
                <div className="bg-red-600/20 border border-red-600/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                  {gpsError}
                </div>
              )}

              {gpsPosition && (
                <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
                  <p>Your Location: {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}</p>
                  <p>Accuracy: ±{Math.round(gpsPosition.accuracy)}m</p>
                </div>
              )}

              {!gpsLoading && (
                <button
                  onClick={handleGpsVerification}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors flex items-center justify-center"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Verify My Location
                </button>
              )}
            </div>
          )}

          {stage === 'RESULT' && result === 'SUCCESS' && (
            <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Attendance Marked!</h3>
              <p className="text-gray-500 mb-6">Your attendance for <span className="font-semibold text-gray-800">{markedSubjectName}</span> has been recorded.</p>
              {gpsPosition && (
                <p className="text-xs text-gray-400 mb-4">GPS: {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)} (±{Math.round(gpsPosition.accuracy)}m)</p>
              )}
              <button
                onClick={() => navigate('/student/dashboard')}
                className="w-full py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800"
              >
                Done
              </button>
            </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_INVALID_QR' && (
            <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Invalid / Expired QR</h3>
              <p className="text-gray-500 mb-6">{resultMessage}</p>
              <button
                onClick={() => { setStage('CAMERA'); setResult(null); }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_GPS' && (
            <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Location Mismatch</h3>
              <p className="text-gray-500 mb-2">{resultMessage}</p>
              {distance !== null && (
                <p className="text-sm text-red-500 font-medium mb-4">You are {distance}m away from the classroom</p>
              )}
              <button
                onClick={() => { setStage('GPS_CHECK'); setResult(null); setGpsPosition(null); }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_TIMEOUT' && (
            <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h3>
              <p className="text-gray-500 mb-6">{resultMessage}</p>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="w-full py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800"
              >
                Go Back
              </button>
            </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_DUPLICATE' && (
            <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Already Marked</h3>
              <p className="text-gray-500 mb-6">{resultMessage}</p>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="w-full py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800"
              >
                Go Back
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ScanPage;