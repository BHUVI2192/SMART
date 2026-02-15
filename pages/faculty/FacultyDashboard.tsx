import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, MapPin, Plus, CheckCircle, X, Loader2, Wifi, WifiOff, BookOpen, Users, Zap } from 'lucide-react';
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

  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassStart, setNewClassStart] = useState('');
  const [newClassEnd, setNewClassEnd] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadTimetable();
    loadSubjects();
    const interval = setInterval(loadTimetable, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSubjects = async () => {
    if (apiReady) {
      try {
        const result = await apiGet('getSubjects', { facultyId: authUser?.id || '' });
        if (result.success && result.subjects.length > 0) {
          setSubjects(result.subjects.map((s: any) => ({ code: s.code, name: s.name })));
          setNewClassSubject(result.subjects[0].code);
        }
      } catch (err) { console.error('Failed to load subjects:', err); }
    }
    // Fallback if no API subjects loaded
    if (subjects.length === 0) {
      const fallback = [
        { code: '18CS61', name: 'System Software' },
        { code: '18CS62', name: 'Computer Graphics' },
        { code: '18CS63', name: 'Web Technology' },
        { code: '18CS64', name: 'Data Mining' },
        { code: '18CS65', name: 'Cloud Computing' },
      ];
      setSubjects(fallback);
      setNewClassSubject(fallback[0].code);
    }
  };

  const loadTimetable = async () => {
    if (apiReady) {
      try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const result = await apiGet('getTimetable', { facultyId: authUser?.id || '', day: today });
        if (result.success) setTimetable(result.timetable);
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
        id: e.id, day: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime,
        subjectCode: e.subjectId, subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || '',
        facultyId: e.facultyId, section: e.section, room: e.room, status: e.status, sessionId: null,
      })));
    } else {
      setTimetable(TODAY_TIMETABLE.map(e => ({
        id: e.id, day: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime,
        subjectCode: e.subjectId, subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || '',
        facultyId: e.facultyId, section: e.section, room: e.room, status: e.status, sessionId: null,
      })));
    }
  };

  const handleStartSession = async (item: TimetableItem) => {
    if (item.sessionId) { navigate(`/faculty/session/${item.sessionId}`); return; }
    if (apiReady) {
      setStarting(item.id);
      try {
        let lat = 12.9716, lng = 77.5946;
        try {
          const roomsResult = await apiGet('getRooms');
          if (roomsResult.success) {
            const room = roomsResult.rooms.find((r: any) => r.name === item.room);
            if (room) { lat = room.lat; lng = room.lng; }
          }
        } catch { }
        const result = await createSession({
          facultyId: authUser?.id || '', subjectCode: item.subjectCode, subjectName: item.subjectName,
          room: item.room, section: item.section, endTime: item.endTime, lat, lng,
        });
        navigate(`/faculty/session/${result.sessionId}`);
      } catch (err) {
        console.error('Failed to create session:', err);
        alert('Failed to start session. Please try again.');
      } finally { setStarting(null); }
    } else {
      navigate(`/faculty/session/${item.id}`);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAddError('');
    const subjectInfo = subjects.find(s => s.code === newClassSubject);
    if (apiReady) {
      try {
        const result = await apiPost('addClass', {
          action: 'addClass', startTime: newClassStart, endTime: newClassEnd,
          subjectCode: newClassSubject, subjectName: subjectInfo?.name || '',
          facultyId: authUser?.id || '', section: '6A', room: newClassRoom || 'LH-101',
        });
        if (!result.success) {
          setAddError(result.error || 'Failed to add class');
          setSubmitting(false);
          return;
        }
        loadTimetable();
      } catch (err) { console.error('Failed to add class:', err); }
    } else {
      setTimetable(prev => [...prev, {
        id: `tt_new_${Date.now()}`, day: 'Monday', startTime: newClassStart, endTime: newClassEnd,
        subjectCode: newClassSubject, subjectName: subjectInfo?.name || '', facultyId: 'f1',
        section: '6A', room: newClassRoom || 'LH-101', status: 'UPCOMING', sessionId: null,
      }]);
    }
    setSubmitting(false);
    setIsModalOpen(false);
    setNewClassStart(''); setNewClassEnd(''); setNewClassRoom('');
  };

  const displayName = authUser?.name || 'Professor';
  const completed = timetable.filter(t => t.status === 'COMPLETED').length;
  const ongoing = timetable.filter(t => t.status === 'ONGOING').length;
  const upcoming = timetable.filter(t => t.status === 'UPCOMING').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {displayName.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-500 text-sm mt-0.5 flex items-center">
            Here is your schedule for today
            {apiReady ? (
              <span className="ml-2 inline-flex items-center text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                <Wifi className="w-3 h-3 mr-1" /> Live
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Extra Class
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: timetable.length, icon: BookOpen, gradient: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-500/15' },
          { label: 'Completed', value: completed, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/15' },
          { label: 'Ongoing', value: ongoing, icon: Zap, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/15' },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card p-4 flex items-center space-x-3`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md ${stat.shadow} flex-shrink-0`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Section Header */}
      <div className="flex items-center space-x-2">
        <div className="w-1 h-5 rounded-full gradient-accent" />
        <h3 className="text-base font-bold text-slate-800">Today's Timetable</h3>
      </div>

      {/* Class Cards */}
      {timetable.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-400">No classes scheduled</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Extra Class" to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {timetable.map((session) => (
            <div key={session.id} className={`glass-card p-5 relative overflow-hidden ${session.status === 'ONGOING' ? 'ring-2 ring-indigo-400/30 border-indigo-200' : ''
              }`}>
              {/* Status Accent */}
              <div className={`absolute top-0 left-0 w-1 h-full rounded-r-full ${session.status === 'ONGOING' ? 'bg-indigo-500' :
                session.status === 'COMPLETED' ? 'bg-slate-300' : 'bg-emerald-400'
                }`} />

              <div className="flex justify-between items-start mb-3 ml-3">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2 ${session.status === 'ONGOING' ? 'bg-indigo-100 text-indigo-700' :
                    session.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                    {session.status === 'ONGOING' && '● '}{session.status}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{session.subjectName || session.subjectCode}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Section {session.section}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">{session.startTime}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Start</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-4 ml-3 text-xs text-slate-500">
                <div className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {session.endTime}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {session.room}
                </div>
              </div>

              {session.status !== 'COMPLETED' ? (
                <button
                  onClick={() => handleStartSession(session)}
                  disabled={starting === session.id}
                  className={`w-full flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:-translate-y-0.5 ${session.status === 'ONGOING'
                    ? 'gradient-success text-white shadow-md shadow-emerald-500/20'
                    : 'gradient-primary text-white shadow-md shadow-blue-500/20'
                    } disabled:opacity-50 disabled:transform-none`}
                >
                  {starting === session.id ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Starting...</>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {session.status === 'ONGOING' ? 'Resume Session' : 'Generate QR & Start'}
                    </>
                  )}
                </button>
              ) : (
                <button className="w-full flex items-center justify-center py-2.5 rounded-xl font-medium text-sm bg-slate-100 text-slate-400 cursor-not-allowed">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in group">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500 overflow-hidden" onClick={() => setIsModalOpen(false)}>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] animate-bop" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-bop" style={{ animationDelay: '-2s' }} />
          </div>

          <div className="candy-card w-full max-w-md p-8 sm:p-10 animate-scale-in relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Add New Class</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Session Scheduler</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">Subject</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    className="w-full pl-14 pr-6 py-4 appearance-none"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                  >
                    {subjects.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">Start Time</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                      <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="time"
                      required
                      className="w-full pl-14 pr-5 py-4"
                      value={newClassStart}
                      onChange={(e) => setNewClassStart(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">End Time</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                      <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="time"
                      required
                      className="w-full pl-14 pr-5 py-4"
                      value={newClassEnd}
                      onChange={(e) => setNewClassEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">Room / Location</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. LH-202"
                    className="w-full pl-14 pr-6 py-4"
                    value={newClassRoom}
                    onChange={(e) => setNewClassRoom(e.target.value)}
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 px-4 py-3 rounded-2xl animate-shake">{addError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-5 rounded-[20px] text-base"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Add to Schedule
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;