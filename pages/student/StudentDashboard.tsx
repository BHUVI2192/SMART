import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, QrCode, Loader2, Wifi, WifiOff, TrendingUp, Clock, MapPin } from 'lucide-react';
import { AuthUser } from '../../services/auth';
import { isApiConfigured, apiGet } from '../../services/api';
import { getStudentStats, SubjectStat } from '../../services/attendance';
import { STUDENT_SUBJECT_STATS, TODAY_TIMETABLE, SUBJECTS } from '../../data';
import { TimetableEntry } from '../../types';

interface StudentDashboardProps {
  authUser: AuthUser | null;
}

interface TimetableItem {
  id: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  room: string;
  status: string;
}

const TIMETABLE_STORAGE_KEY = 'ams_timetable';

// SVG Progress Ring
const ProgressRing: React.FC<{ percentage: number; size?: number; strokeWidth?: number; color: string }> = ({
  percentage, size = 180, strokeWidth = 14, color
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 filter drop-shadow-sm">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-circle"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-500">
        <span className="text-4xl font-black text-slate-900 leading-none">{percentage}%</span>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Status</span>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ authUser }) => {
  const navigate = useNavigate();
  const apiReady = isApiConfigured();
  const [loading, setLoading] = useState(true);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [hasActiveClass, setHasActiveClass] = useState(false);
  const [activeClassName, setActiveClassName] = useState('');
  const [activeClassTime, setActiveClassTime] = useState('');
  const [activeClassRoom, setActiveClassRoom] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    if (apiReady) {
      try {
        const stats = await getStudentStats(authUser?.usn || authUser?.id || '');
        setSubjectStats(stats.stats);
        setOverallPercentage(stats.overall || 0);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const ttResult = await apiGet('getTimetable', { day: today });

        if (ttResult.success) {
          const items: TimetableItem[] = ttResult.timetable.map((t: any) => ({
            id: t.id, subjectName: t.subjectName || t.subjectCode,
            startTime: t.startTime, endTime: t.endTime, room: t.room, status: t.status,
          }));
          setTimetable(items);
          const active = items.find(t => t.status === 'ONGOING');
          if (active) {
            setHasActiveClass(true);
            setActiveClassName(active.subjectName);
            setActiveClassTime(`${active.startTime} - ${active.endTime}`);
            setActiveClassRoom(active.room);
          } else { setHasActiveClass(false); }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        fallbackToLocal();
      }
    } else { fallbackToLocal(); }
    setLoading(false);
  };

  const fallbackToLocal = () => {
    setSubjectStats(STUDENT_SUBJECT_STATS.map(s => ({
      subjectCode: s.subjectCode, subjectName: s.subjectName,
      totalClasses: s.totalClasses, attendedClasses: s.attendedClasses, percentage: s.percentage,
    })));
    setOverallPercentage(88);
    const storedData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    const entries: TimetableEntry[] = storedData ? JSON.parse(storedData) : TODAY_TIMETABLE;
    setTimetable(entries.map(e => ({
      id: e.id, subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || e.subjectId,
      startTime: e.startTime, endTime: e.endTime, room: e.room, status: e.status,
    })));
    const active = entries.find(t => t.status === 'ONGOING');
    if (active) {
      setHasActiveClass(true);
      setActiveClassName(SUBJECTS.find(s => s.id === active.subjectId)?.name || '');
      setActiveClassTime(`${active.startTime} - ${active.endTime}`);
      setActiveClassRoom(active.room);
    }
  };

  const isGood = overallPercentage >= 85;
  const ringColor = isGood ? 'var(--primary)' : 'var(--warning)';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Ring Card */}
        <div className="candy-card p-6 sm:p-10 flex flex-col items-center justify-center">
          <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-8">Performance</h3>
          <ProgressRing percentage={overallPercentage} color={ringColor} />
          <div className={`mt-10 flex items-center px-6 py-2 rounded-full font-black text-xs uppercase tracking-wider ${isGood ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
            <TrendingUp className="w-4 h-4 mr-2" />
            {isGood ? 'Excellent Track' : 'Needs Attention'}
          </div>
        </div>

        {/* Active Class Card */}
        <div className={`lg:col-span-2 rounded-[40px] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${hasActiveClass
          ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-900/40'
          : 'candy-card'
          }`}>
          {hasActiveClass && (
            <>
              {/* Decorative candy glow */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20 blur-[80px]" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} />
              <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full opacity-10 blur-[60px]" style={{ background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)' }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Happening Now</span>
                    <h2 className="text-2xl sm:text-5xl font-black mt-2 mb-4 tracking-tight">{activeClassName}</h2>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <p className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-slate-100 text-sm font-bold flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-indigo-400" /> {activeClassTime}
                      </p>
                      <p className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-slate-100 text-sm font-bold flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-indigo-400" /> {activeClassRoom}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-500 text-white text-[10px] px-4 py-2 rounded-full font-black uppercase tracking-widest animate-pulse-glow flex-shrink-0 shadow-lg shadow-emerald-500/30">
                    Live Session
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/scan')}
                className="mt-10 relative z-10 w-full sm:w-auto self-start bg-white text-indigo-600 px-10 py-5 rounded-full font-black text-base flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-500 shadow-2xl shadow-white/10"
              >
                <QrCode className="w-6 h-6 mr-3" />
                Scan QR Attendance
              </button>
            </>
          )}
          {!hasActiveClass && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle className="w-10 h-10 text-slate-200" />
              </div>
              <h2 className="text-2xl font-black text-slate-300">No Active Sessions</h2>
              <p className="text-sm text-slate-400 mt-2 font-bold max-w-xs">You're all caught up! Next session will appear here when it starts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Stats */}
        <div className="candy-card overflow-hidden">
          <div className="p-5 sm:p-8 border-white/10 flex justify-between items-center bg-white/50">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-6 rounded-full bg-indigo-500" />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Subject-wise Status</h3>
            </div>
            <span className="text-[10px] text-indigo-600 font-black bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">Target: 85%</span>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {subjectStats.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-bold">Waiting for data sync...</p>
              </div>
            ) : (
              subjectStats.map((sub) => (
                <div key={sub.subjectCode} className="p-4 sm:p-5 bg-white/40 hover:bg-white rounded-[28px] border border-transparent hover:border-indigo-100 transition-all duration-500 flex items-center group shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
                  <div className="flex-1">
                    <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{sub.subjectCode}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide opacity-60">{sub.subjectName}</p>
                    {/* Progress bar */}
                    <div className="mt-4 w-full h-3 bg-slate-100 rounded-full overflow-hidden candy-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${sub.percentage >= 85 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                        style={{ width: `${sub.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-6 flex items-center space-x-4">
                    <div>
                      <span className={`block text-2xl font-black ${sub.percentage < 85 ? 'text-amber-500' : 'text-slate-900'}`}>
                        {sub.percentage}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.attendedClasses}/{sub.totalClasses} Classes</span>
                    </div>
                    {sub.percentage < 85 && (
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="candy-card p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-2 h-6 rounded-full bg-indigo-400" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Today's Timeline</h3>
          </div>
          <div className="relative ml-4 space-y-10">
            {/* Vertical line - Candy thread style */}
            <div className="absolute left-[7px] top-2 bottom-2 w-1 bg-slate-100 rounded-full" />

            {timetable.map((cls) => (
              <div key={cls.id} className="relative pl-10 group">
                <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-md z-10 transition-all duration-500 group-hover:scale-150 ${cls.status === 'COMPLETED' ? 'bg-slate-300' :
                  cls.status === 'ONGOING' ? 'bg-indigo-500 animate-pulse-glow' : 'bg-emerald-400'
                  }`} />
                <div className="hover:translate-x-2 transition-transform duration-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight">{cls.subjectName}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center bg-slate-50 px-3 py-1 rounded-full">
                          <Clock className="w-3 h-3 mr-1.5" /> {cls.startTime} - {cls.endTime}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center bg-slate-50 px-3 py-1 rounded-full">
                          <MapPin className="w-3 h-3 mr-1" /> {cls.room}
                        </p>
                      </div>
                    </div>
                    <div>
                      {cls.status === 'COMPLETED' ? (
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      ) : cls.status === 'ONGOING' ? (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">Live</span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">Later</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {timetable.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-bold text-slate-300 tracking-tight uppercase">No classes today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;