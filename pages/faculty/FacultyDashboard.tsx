import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, MapPin, Plus, CheckCircle, X, Loader2, Wifi, WifiOff } from 'lucide-react';
import { AuthUser } from '../../services/auth';
import { isApiConfigured } from '../../services/api';
import { apiGet, apiPost } from '../../services/api';
import { createSession } from '../../services/sessions';
import { TODAY_TIMETABLE, SUBJECTS } from '../../data';
import { TimetableEntry } from '../../types';

interface FacultyDashboardProps {
  authUser: AuthUser | null;
}

interface TimetableItem {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  section: string;
  room: string;
  status: string;
  sessionId: string | null;
}

const TIMETABLE_STORAGE_KEY = 'ams_timetable';

const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ authUser }) => {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const apiReady = isApiConfigured();

  // Form State
  const [newClassSubject, setNewClassSubject] = useState('18CS61');
  const [newClassStart, setNewClassStart] = useState('');
  const [newClassEnd, setNewClassEnd] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([
    { code: '18CS61', name: 'System Software' },
    { code: '18CS62', name: 'Computer Graphics' },
    { code: '18CS63', name: 'Web Technology' },
    { code: '18CS64', name: 'Data Mining' },
    { code: '18CS65', name: 'Cloud Computing' },
  ]);

  // Load timetable
  useEffect(() => {
    loadTimetable();
    const interval = setInterval(loadTimetable, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadTimetable = async () => {
    if (apiReady) {
      try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const result = await apiGet('getTimetable', {
          facultyId: authUser?.id || '',
          day: today,
        });
        if (result.success) {
          setTimetable(result.timetable);
        }
      } catch (err) {
        console.error('Failed to load timetable:', err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }
    setLoading(false);
  };

  const fallbackToLocal = () => {
    const storedData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (storedData) {
      const entries: TimetableEntry[] = JSON.parse(storedData);
      setTimetable(entries.map(e => ({
        id: e.id,
        day: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        subjectCode: e.subjectId,
        subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || '',
        facultyId: e.facultyId,
        section: e.section,
        room: e.room,
        status: e.status,
        sessionId: null,
      })));
    } else {
      setTimetable(TODAY_TIMETABLE.map(e => ({
        id: e.id,
        day: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        subjectCode: e.subjectId,
        subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || '',
        facultyId: e.facultyId,
        section: e.section,
        room: e.room,
        status: e.status,
        sessionId: null,
      })));
    }
  };

  const handleStartSession = async (item: TimetableItem) => {
    if (item.sessionId) {
      // Already has a session, navigate to it
      navigate(`/faculty/session/${item.sessionId}`);
      return;
    }

    if (apiReady) {
      setStarting(item.id);
      try {
        // Get room GPS coords
        let lat = 12.9716;
        let lng = 77.5946;
        try {
          const roomsResult = await apiGet('getRooms');
          if (roomsResult.success) {
            const room = roomsResult.rooms.find((r: any) => r.name === item.room);
            if (room) {
              lat = room.lat;
              lng = room.lng;
            }
          }
        } catch { }

        const result = await createSession({
          facultyId: authUser?.id || '',
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          room: item.room,
          section: item.section,
          endTime: item.endTime,
          lat,
          lng,
        });
        navigate(`/faculty/session/${result.sessionId}`);
      } catch (err) {
        console.error('Failed to create session:', err);
        alert('Failed to start session. Please try again.');
      } finally {
        setStarting(null);
      }
    } else {
      // Demo mode - use local storage session
      navigate(`/faculty/session/${item.id}`);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectInfo = subjects.find(s => s.code === newClassSubject);

    if (apiReady) {
      try {
        await apiPost('addClass', {
          action: 'addClass',
          startTime: newClassStart,
          endTime: newClassEnd,
          subjectCode: newClassSubject,
          subjectName: subjectInfo?.name || '',
          facultyId: authUser?.id || '',
          section: '6A',
          room: newClassRoom || 'LH-101',
        });
        loadTimetable();
      } catch (err) {
        console.error('Failed to add class:', err);
      }
    } else {
      // Local fallback
      const newEntry = {
        id: `tt_new_${Date.now()}`,
        day: 'Monday',
        startTime: newClassStart,
        endTime: newClassEnd,
        subjectCode: newClassSubject,
        subjectName: subjectInfo?.name || '',
        facultyId: 'f1',
        section: '6A',
        room: newClassRoom || 'LH-101',
        status: 'UPCOMING',
        sessionId: null,
      };
      setTimetable(prev => [...prev, newEntry]);
    }

    setIsModalOpen(false);
    setNewClassStart('');
    setNewClassEnd('');
    setNewClassRoom('');
  };

  const displayName = authUser?.name || 'Professor';

  const ClassCard: React.FC<{ session: TimetableItem }> = ({ session }) => (
    <div className={`p-5 rounded-xl border border-gray-200 shadow-sm transition-all ${session.status === 'ONGOING' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white'
      }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${session.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-800' :
              session.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
            }`}>
            {session.status}
          </span>
          <h3 className="text-lg font-bold text-gray-900">{session.subjectName || session.subjectCode}</h3>
          <p className="text-sm text-gray-600">Section {session.section}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-800">{session.startTime}</p>
          <p className="text-xs text-gray-500 uppercase">Start Time</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6 text-sm text-gray-500">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {session.endTime} End
        </div>
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-1" />
          {session.room}
        </div>
      </div>

      {session.status !== 'COMPLETED' ? (
        <button
          onClick={() => handleStartSession(session)}
          disabled={starting === session.id}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors ${session.status === 'ONGOING'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
              : 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-200'
            } shadow-md disabled:opacity-50`}
        >
          {starting === session.id ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              {session.status === 'ONGOING' ? 'Resume Session' : 'Generate QR & Start'}
            </>
          )}
        </button>
      ) : (
        <button className="w-full flex items-center justify-center py-2.5 rounded-lg font-medium bg-gray-100 text-gray-500 cursor-not-allowed">
          <CheckCircle className="w-5 h-5 mr-2" />
          Class Completed
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Good Morning, {displayName}</h2>
          <p className="text-gray-500 flex items-center">
            Here is your schedule for today.
            {apiReady ? (
              <span className="ml-2 inline-flex items-center text-xs text-emerald-600">
                <Wifi className="w-3 h-3 mr-1" /> Live
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center text-xs text-amber-600">
                <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-800 flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Extra Class
        </button>
      </div>

      <div className="flex space-x-3 mb-4">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-medium uppercase">Total Classes</span>
          <span className="text-lg font-bold text-blue-900">{timetable.length}</span>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-medium uppercase">Completed</span>
          <span className="text-lg font-bold text-emerald-600">{timetable.filter(t => t.status === 'COMPLETED').length}</span>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-medium uppercase">Ongoing</span>
          <span className="text-lg font-bold text-blue-600">{timetable.filter(t => t.status === 'ONGOING').length}</span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Today's Timetable</h3>

      {timetable.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-200">
          <p className="text-lg font-medium">No classes scheduled for today</p>
          <p className="text-sm mt-1">Click "Add Extra Class" to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetable.map((session) => (
            <ClassCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Class</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                    value={newClassStart}
                    onChange={(e) => setNewClassStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                    value={newClassEnd}
                    onChange={(e) => setNewClassEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room No</label>
                <input
                  type="text"
                  placeholder="e.g. LH-202"
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;