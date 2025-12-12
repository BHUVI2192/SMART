import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, MapPin, CheckCircle, XCircle, Loader2, Upload } from 'lucide-react';
import jsQR from 'jsqr';
import { User, TimetableEntry } from '../../types';
import { TODAY_TIMETABLE, SUBJECTS } from '../../data';

type ScanStage = 'PERMISSION' | 'CAMERA' | 'PROCESSING' | 'GPS_CHECK' | 'RESULT';
type ScanResult = 'SUCCESS' | 'FAIL_GPS' | 'FAIL_TIMEOUT' | 'FAIL_INVALID_QR';

interface ScanPageProps {
  user: User | null;
}

const SESSION_STORAGE_KEY = 'ams_active_session';
const TIMETABLE_STORAGE_KEY = 'ams_timetable';

const ScanPage: React.FC<ScanPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<ScanStage>('PERMISSION');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [markedSubjectName, setMarkedSubjectName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
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
            setStage('RESULT');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGpsResult = (success: boolean) => {
    // Verify Token against LocalStorage
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) {
      setResult('FAIL_TIMEOUT'); // No active session
      setStage('RESULT');
      return;
    }

    const sessionData = JSON.parse(storedSession);
    
    // Check if token matches
    if (sessionData.token !== scannedData) {
      setResult('FAIL_INVALID_QR');
      setStage('RESULT');
      return;
    }

    // If GPS is good and Token is good
    if (success) {
      // 1. Identify Subject based on Session ID
      // Retrieve full timetable from storage to support dynamic classes
      const storedTimetable = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      let timetable: TimetableEntry[] = storedTimetable ? JSON.parse(storedTimetable) : TODAY_TIMETABLE;
      
      const sessionInfo = timetable.find(t => t.id === sessionData.sessionId);
      const subjectInfo = SUBJECTS.find(s => s.id === sessionInfo?.subjectId);
      const subjectName = subjectInfo ? subjectInfo.name : 'Unknown Subject';
      setMarkedSubjectName(subjectName);

      // 2. Mark Attendance
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        studentName: user?.name || 'Unknown Student',
        usn: (user as any)?.usn || 'UNKNOWN_USN',
        time: new Date().toLocaleTimeString(),
        status: 'SUCCESS'
      };

      const updatedLogs = [...(sessionData.logs || []), newLog];
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        ...sessionData,
        logs: updatedLogs
      }));

      setResult('SUCCESS');
    } else {
      setResult('FAIL_GPS');
    }
    
    setStage('RESULT');
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
                <h3 className="text-xl font-bold mb-2">Camera & Storage Access</h3>
                <p className="text-gray-400 text-sm">We need permission to upload images and verify location.</p>
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
            <div className="text-center space-y-8 w-full">
              <div>
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                   <MapPin className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold">Verifying Location</h3>
                <p className="text-gray-400 text-sm mt-2">Checking if you are inside LH-101...</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleGpsResult(true)}
                  className="py-3 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-600/30"
                >
                  Simulate Valid GPS
                </button>
                <button 
                   onClick={() => handleGpsResult(false)}
                   className="py-3 bg-red-600/20 border border-red-600/50 text-red-400 rounded-xl text-sm font-medium hover:bg-red-600/30"
                >
                  Simulate Far Away
                </button>
              </div>
            </div>
          )}

          {stage === 'RESULT' && result === 'SUCCESS' && (
             <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl animate-in zoom-in duration-300">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle className="w-10 h-10 text-emerald-600" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Attendance Marked!</h3>
               <p className="text-gray-500 mb-6">Your attendance for <span className="font-semibold text-gray-800">{markedSubjectName}</span> has been recorded.</p>
               <button 
                 onClick={() => navigate('/student/dashboard')}
                 className="w-full py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800"
               >
                 Done
               </button>
             </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_INVALID_QR' && (
             <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl animate-in zoom-in duration-300">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <XCircle className="w-10 h-10 text-red-600" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Invalid QR Code</h3>
               <p className="text-gray-500 mb-6">The uploaded image is not a valid QR code or has expired.</p>
               <button 
                 onClick={() => setStage('CAMERA')} 
                 className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
               >
                 Try Again
               </button>
             </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_GPS' && (
             <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl animate-in zoom-in duration-300">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <XCircle className="w-10 h-10 text-red-600" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Location Mismatch</h3>
               <p className="text-gray-500 mb-6">You seem to be too far from the classroom.</p>
               <button 
                 onClick={() => setStage('GPS_CHECK')} 
                 className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
               >
                 Try Again
               </button>
             </div>
          )}

          {stage === 'RESULT' && result === 'FAIL_TIMEOUT' && (
             <div className="text-center bg-white text-gray-900 p-8 rounded-2xl w-full mx-4 shadow-xl animate-in zoom-in duration-300">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <XCircle className="w-10 h-10 text-red-600" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h3>
               <p className="text-gray-500 mb-6">No active session found.</p>
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