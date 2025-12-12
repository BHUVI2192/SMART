import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Smartphone, MapPin, Users, StopCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { TODAY_TIMETABLE } from '../../data';
import { TimetableEntry } from '../../types';

// Dummy Attendance Log Interface
interface ScanLog {
  id: string;
  studentName: string;
  usn: string;
  time: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
}

const SESSION_STORAGE_KEY = 'ams_active_session';
const TIMETABLE_STORAGE_KEY = 'ams_timetable';

const SessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [session, setSession] = useState<TimetableEntry | null>(null);
  const [qrToken, setQrToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [presentCount, setPresentCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Session details from LocalStorage Timetable
  useEffect(() => {
    const storedTimetable = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    let foundSession = null;

    if (storedTimetable) {
      const timetable: TimetableEntry[] = JSON.parse(storedTimetable);
      foundSession = timetable.find(t => t.id === id);
    } else {
      // Fallback
      foundSession = TODAY_TIMETABLE.find(t => t.id === id);
    }

    if (foundSession) {
      setSession(foundSession);
    }
  }, [id]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize and Update Active Session in LocalStorage
  useEffect(() => {
    if (!session) return;

    let currentToken = '';
    
    // 1. Check if a session already exists in storage
    const storedDataString = localStorage.getItem(SESSION_STORAGE_KEY);
    const storedData = storedDataString ? JSON.parse(storedDataString) : null;

    // IMPORTANT: Also ensure we mark this session as ONGOING in the timetable if it isn't already
    // This is needed if the user navigated directly here without clicking "Start" on dashboard
    const updateTimetableStatus = () => {
       const storedTimetableStr = localStorage.getItem(TIMETABLE_STORAGE_KEY);
       if (storedTimetableStr) {
         const timetable: TimetableEntry[] = JSON.parse(storedTimetableStr);
         const updatedTimetable = timetable.map(t => 
           t.id === session.id ? { ...t, status: 'ONGOING' } : t
         );
         // @ts-ignore - status string type mismatch fix in logic, technically fine
         localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(updatedTimetable));
       }
    };
    updateTimetableStatus();

    if (storedData && storedData.sessionId === session.id) {
      // RESTORE EXISTING SESSION
      currentToken = storedData.token;
      setQrToken(storedData.token);
      setLogs(storedData.logs || []);
      const successCount = (storedData.logs || []).filter((l: ScanLog) => l.status === 'SUCCESS').length;
      setPresentCount(successCount);
    } else {
      // CREATE NEW SESSION
      currentToken = `TOKEN_${Math.random().toString(36).substr(2, 9)}`;
      setQrToken(currentToken);
      setLogs([]);
      setPresentCount(0);
      
      const initialData = {
        sessionId: session.id,
        token: currentToken,
        logs: []
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(initialData));
    }

    // 2. Start Token Rotation (Updating storage while preserving logs)
    const qrInterval = setInterval(() => {
      const newToken = `TOKEN_${Math.random().toString(36).substr(2, 9)}`;
      setQrToken(newToken);
      
      // Update token in storage, keeping existing logs
      const currentData = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
      
      // Ensure we only update if the session ID matches (safety check)
      if (currentData.sessionId === session.id) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          ...currentData,
          token: newToken
        }));
      }
    }, 30000);

    return () => {
      clearInterval(qrInterval);
    };
  }, [session]);

  // Poll for changes in logs (Simulating real-time updates from student actions)
  useEffect(() => {
    const checkLogs = setInterval(() => {
      const currentDataString = localStorage.getItem(SESSION_STORAGE_KEY);
      const currentData = currentDataString ? JSON.parse(currentDataString) : {};

      // Only sync if it matches our session
      if (currentData.sessionId === session?.id && currentData.logs && Array.isArray(currentData.logs)) {
        // Check if logs changed (simple length check for dummy app)
        if (currentData.logs.length !== logs.length) {
          setLogs(currentData.logs);
          const successCount = currentData.logs.filter((l: ScanLog) => l.status === 'SUCCESS').length;
          setPresentCount(successCount);
        }
      }
    }, 2000);

    return () => clearInterval(checkLogs);
  }, [logs, session]);

  // Draw QR Code when token changes
  useEffect(() => {
    if (canvasRef.current && qrToken) {
      QRCode.toCanvas(canvasRef.current, qrToken, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [qrToken]);

  const handleEndClass = () => {
    if (!session) return;
    
    // 1. Update Timetable in LocalStorage to COMPLETED
    const storedTimetableStr = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (storedTimetableStr) {
      const timetable: TimetableEntry[] = JSON.parse(storedTimetableStr);
      const updatedTimetable = timetable.map(t => 
        t.id === session.id ? { ...t, status: 'COMPLETED' } : t
      );
      // @ts-ignore
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(updatedTimetable));
    }

    // 2. Clear Active Session (Optional, keeps logs for record view if implemented)
    // localStorage.removeItem(SESSION_STORAGE_KEY); 

    // 3. Navigate back
    navigate('/faculty/dashboard');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!session) return <div>Loading Session...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/faculty/dashboard')}
          className="flex items-center text-gray-600 hover:text-blue-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <button 
          onClick={handleEndClass}
          className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
        >
          <StopCircle className="w-5 h-5 mr-2" />
          End Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: QR Display */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Mark Attendance</h2>
              <p className="text-blue-200 text-sm">Session ID: {session.id.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold">{formatTime(timeLeft)}</p>
              <p className="text-xs text-blue-300 uppercase tracking-wider">QR Expires In</p>
            </div>
          </div>
          
          <div className="p-8 flex flex-col items-center justify-center bg-gray-50 min-h-[400px]">
             {/* QR Container */}
             <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 relative border border-gray-100">
               <div className="relative">
                 <canvas ref={canvasRef} />
               </div>
               
               <div className="mt-4 text-center">
                 <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs font-mono">
                   <RefreshCw className="w-3 h-3 animate-spin-slow" />
                   <span>Updating Token...</span>
                 </div>
                 <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[200px] mx-auto">{qrToken}</p>
                 <p className="text-xs text-blue-500 font-semibold mt-2">Ask students to upload this QR screenshot</p>
               </div>
             </div>

             <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
               <MapPin className="w-4 h-4 text-emerald-500" />
               <span>Geo-Fencing Active: <span className="font-semibold text-gray-800">LH-101 (Lat: 12.97, Long: 77.59)</span></span>
             </div>
          </div>
        </div>

        {/* Right Col: Live Stats */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
            <Users className="w-10 h-10 text-blue-900 mx-auto mb-2" />
            <h3 className="text-gray-500 font-medium">Present Students</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{presentCount} <span className="text-lg text-gray-400 font-normal">/ 60</span></p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800">Live Activity Log</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {logs.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Waiting for scans...
                </div>
              )}
              {logs.slice().reverse().map((log) => (
                <div key={log.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{log.studentName}</p>
                      <p className="text-xs text-gray-500">{log.usn}</p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{log.time}</span>
                  </div>
                  <div className="mt-2 flex items-center">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <Smartphone className="w-3 h-3 mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                         Failed: {log.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionView;