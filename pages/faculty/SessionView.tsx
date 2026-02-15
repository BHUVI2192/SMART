import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Smartphone, MapPin, Users, StopCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import { AuthUser } from '../../services/auth';
import { isApiConfigured, apiGet } from '../../services/api';
import { getActiveSession, rotateToken, endSession as endSessionApi, getAttendanceLogs, createSession, Session, ScanLog } from '../../services/sessions';
import { TODAY_TIMETABLE, SUBJECTS } from '../../data';
import { TimetableEntry } from '../../types';

const SESSION_STORAGE_KEY = 'ams_active_session';
const TIMETABLE_STORAGE_KEY = 'ams_timetable';

interface SessionViewProps {
  authUser: AuthUser | null;
}

const SessionView: React.FC<SessionViewProps> = ({ authUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const apiReady = isApiConfigured();

  // State
  const [sessionId, setSessionId] = useState<string>(id || '');
  const [subjectName, setSubjectName] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [qrToken, setQrToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [presentCount, setPresentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load session data
  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    if (apiReady) {
      try {
        // ID might be a sessionId (from API) or a timetable entry ID (from local)
        const result = await getActiveSession({ sessionId: id });
        if (result.length > 0) {
          const session = result[0];
          setSessionId(session.sessionId);
          setSubjectName(session.subjectName);
          setRoom(session.room);
          setSection(session.section);
          setQrToken(session.token);
          setLat(Number(session.lat) || 0);
          setLng(Number(session.lng) || 0);
        } else {
          // Session doesn't exist yet for this timetable entry — create one
          // Look up timetable entry info
          const ttResult = await apiGet('getTimetable', { facultyId: authUser?.id || '' });
          const entry = ttResult.success ? ttResult.timetable.find((t: any) => t.id === id) : null;

          if (entry) {
            let roomLat = 12.9716, roomLng = 77.5946;
            try {
              const roomsResult = await apiGet('getRooms');
              if (roomsResult.success) {
                const roomInfo = roomsResult.rooms.find((r: any) => r.name === entry.room);
                if (roomInfo) { roomLat = roomInfo.lat; roomLng = roomInfo.lng; }
              }
            } catch { }

            const newSession = await createSession({
              facultyId: authUser?.id || '',
              subjectCode: entry.subjectCode,
              subjectName: entry.subjectName || entry.subjectCode,
              room: entry.room,
              section: entry.section,
              endTime: entry.endTime,
              lat: roomLat,
              lng: roomLng,
            });
            setSessionId(newSession.sessionId);
            setQrToken(newSession.token);
            setSubjectName(entry.subjectName || entry.subjectCode);
            setRoom(entry.room);
            setSection(entry.section);
            setLat(roomLat);
            setLng(roomLng);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }
    setLoading(false);
  };

  const fallbackToLocal = () => {
    // Original localStorage logic for demo mode
    const storedTimetable = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    let foundEntry: TimetableEntry | undefined;

    if (storedTimetable) {
      const timetable = JSON.parse(storedTimetable);
      foundEntry = timetable.find((t: TimetableEntry) => t.id === id);
    } else {
      foundEntry = TODAY_TIMETABLE.find(t => t.id === id);
    }

    if (foundEntry) {
      setSubjectName(SUBJECTS.find(s => s.id === foundEntry!.subjectId)?.name || 'Unknown');
      setRoom(foundEntry.room);
      setSection(foundEntry.section);

      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      const storedData = stored ? JSON.parse(stored) : null;

      if (storedData && storedData.sessionId === id) {
        setQrToken(storedData.token);
        setLogs(storedData.logs || []);
        setPresentCount((storedData.logs || []).filter((l: any) => l.status === 'SUCCESS').length);
      } else {
        const token = `TOKEN_${Math.random().toString(36).substr(2, 9)}`;
        setQrToken(token);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          sessionId: id,
          token,
          logs: []
        }));
      }
    }
  };

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Token rotation (every 30s)
  useEffect(() => {
    if (!sessionId || !qrToken) return;

    const qrInterval = setInterval(async () => {
      if (timeLeft <= 0) return; // Don't rotate if expired

      if (apiReady) {
        try {
          const newToken = await rotateToken(sessionId);
          setQrToken(newToken);
        } catch (err) {
          console.error('Failed to rotate token:', err);
        }
      } else {
        const newToken = `TOKEN_${Math.random().toString(36).substr(2, 9)}`;
        setQrToken(newToken);
        const currentData = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
        if (currentData.sessionId === id) {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...currentData, token: newToken }));
        }
      }
    }, 30000);

    return () => clearInterval(qrInterval);
  }, [sessionId, qrToken, timeLeft]);

  // Poll for attendance logs
  useEffect(() => {
    if (!sessionId) return;

    const poll = setInterval(async () => {
      if (apiReady) {
        try {
          const newLogs = await getAttendanceLogs(sessionId);
          setLogs(newLogs.map(l => ({ ...l, status: 'PRESENT' })));
          setPresentCount(newLogs.length);
        } catch { }
      } else {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : null;
        if (data?.sessionId === id && data.logs) {
          setLogs(data.logs);
          setPresentCount(data.logs.filter((l: any) => l.status === 'SUCCESS').length);
        }
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [sessionId]);

  // Draw QR Code when token changes
  useEffect(() => {
    if (canvasRef.current && qrToken) {
      QRCode.toCanvas(canvasRef.current, qrToken, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [qrToken]);

  const handleEndClass = async () => {
    if (apiReady && sessionId) {
      try {
        await endSessionApi(sessionId);
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    } else {
      // Local fallback
      const storedTimetableStr = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      if (storedTimetableStr) {
        const timetable = JSON.parse(storedTimetableStr);
        const updated = timetable.map((t: any) => t.id === id ? { ...t, status: 'COMPLETED' } : t);
        localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(updated));
      }
    }
    navigate('/faculty/dashboard');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

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

        <div className="flex items-center space-x-3">
          {apiReady ? (
            <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Wifi className="w-3 h-3 mr-1" /> Live Sync
            </span>
          ) : (
            <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              <WifiOff className="w-3 h-3 mr-1" /> Offline
            </span>
          )}
          <button
            onClick={handleEndClass}
            className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
          >
            <StopCircle className="w-5 h-5 mr-2" />
            End Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: QR Display */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Mark Attendance</h2>
              <p className="text-blue-200 text-sm">{subjectName} • {room} • Section {section}</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-mono font-bold ${timeLeft <= 60 ? 'text-red-300' : ''}`}>{formatTime(timeLeft)}</p>
              <p className="text-xs text-blue-300 uppercase tracking-wider">
                {timeLeft <= 0 ? 'EXPIRED' : 'QR Expires In'}
              </p>
            </div>
          </div>

          <div className="p-8 flex flex-col items-center justify-center bg-gray-50 min-h-[400px]">
            {timeLeft <= 0 ? (
              <div className="text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Session Timer Expired</h3>
                <p className="text-gray-500 mb-4">Students can no longer scan this QR code.</p>
                <button onClick={handleEndClass} className="bg-blue-900 text-white px-6 py-2 rounded-lg font-medium">
                  End Class
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 relative border border-gray-100">
                  <canvas ref={canvasRef} />
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                      <span>Token rotates every 30s</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[200px] mx-auto">{qrToken}</p>
                    <p className="text-xs text-blue-500 font-semibold mt-2">
                      {apiReady ? 'Students: scan this QR from your device' : 'Demo: upload a screenshot of this QR'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Geo-Fencing: <span className="font-semibold text-gray-800">{room}</span>
                    {lat > 0 && <span className="text-xs text-gray-400 ml-1">({lat.toFixed(4)}, {lng.toFixed(4)})</span>}
                  </span>
                </div>
              </>
            )}
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
              {logs.slice().reverse().map((log, idx) => (
                <div key={log.usn + idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{log.studentName}</p>
                      <p className="text-xs text-gray-500">{log.usn}</p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center">
                    <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      <Smartphone className="w-3 h-3 mr-1" /> Verified
                    </span>
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