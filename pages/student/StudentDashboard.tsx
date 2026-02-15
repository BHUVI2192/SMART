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
  percentage, size = 160, strokeWidth = 10, color
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-circle"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{percentage}%</span>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Attendance</span>
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
  const ringColor = isGood ? '#10b981' : '#f59e0b';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Connection Badge */}
      <div className="flex justify-end">
        {apiReady ? (
          <span className="inline-flex items-center text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
            <Wifi className="w-3 h-3 mr-1" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
            <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
          </span>
        )}
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress Ring Card */}
        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4">Overall Attendance</h3>
          <ProgressRing percentage={overallPercentage} color={ringColor} />
          <div className={`mt-4 flex items-center text-sm font-semibold ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {isGood ? 'On Track!' : 'Low — Needs Attention'}
          </div>
        </div>

        {/* Active Class Card */}
        <div className={`lg:col-span-2 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden ${hasActiveClass
            ? 'gradient-dark text-white'
            : 'glass-card'
          }`}>
          {hasActiveClass && (
            <>
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />

              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-1">{activeClassName}</h2>
                    <p className="text-slate-400 text-sm flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> {activeClassTime}
                      <span className="mx-2">•</span>
                      <MapPin className="w-3.5 h-3.5 mr-1" /> {activeClassRoom}
                    </p>
                  </div>
                  <span className="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse-glow flex-shrink-0">
                    Live
                  </span>
                </div>
                <p className="mt-4 text-slate-400 text-sm max-w-md">
                  The attendance window is open. Ensure you're within the classroom to mark successfully.
                </p>
              </div>
              <button
                onClick={() => navigate('/student/scan')}
                className="mt-6 w-full sm:w-auto self-start bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center hover:bg-slate-100 transition-all duration-200 shadow-lg"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Scan QR Code
              </button>
            </>
          )}
          {!hasActiveClass && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <CheckCircle className="w-7 h-7 text-slate-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-400">No Active Classes</h2>
              <p className="text-sm text-slate-400 mt-1">No sessions running right now</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subject Stats */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-4 rounded-full gradient-accent" />
              <h3 className="text-sm font-bold text-slate-800">Subject-wise Status</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">Min 85%</span>
          </div>
          <div className="divide-y divide-slate-50">
            {subjectStats.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-medium">No data yet</p>
              </div>
            ) : (
              subjectStats.map((sub) => (
                <div key={sub.subjectCode} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{sub.subjectCode}</h4>
                    <p className="text-[11px] text-slate-500">{sub.subjectName}</p>
                    {/* Progress bar */}
                    <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${sub.percentage >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${sub.percentage}%`, animation: 'progressFill 0.8s ease-out' }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4 flex items-center space-x-3">
                    <div>
                      <span className={`block text-lg font-bold ${sub.percentage < 85 ? 'text-amber-500' : 'text-slate-900'}`}>
                        {sub.percentage}%
                      </span>
                      <span className="text-[10px] text-slate-400">{sub.attendedClasses}/{sub.totalClasses}</span>
                    </div>
                    {sub.percentage < 85 && (
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card p-5">
          <div className="flex items-center space-x-2 mb-5">
            <div className="w-1 h-4 rounded-full gradient-primary" />
            <h3 className="text-sm font-bold text-slate-800">Today's Schedule</h3>
          </div>
          <div className="relative ml-3 space-y-6">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />
            {timetable.map((cls) => (
              <div key={cls.id} className="relative pl-7">
                <div className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white shadow-sm z-10 ${cls.status === 'COMPLETED' ? 'bg-slate-400' :
                    cls.status === 'ONGOING' ? 'bg-indigo-500 animate-pulse-glow' : 'bg-emerald-400'
                  }`} />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{cls.subjectName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {cls.startTime} - {cls.endTime}
                      <span className="mx-1.5">•</span>
                      <MapPin className="w-3 h-3 mr-0.5" /> {cls.room}
                    </p>
                  </div>
                  <div>
                    {cls.status === 'COMPLETED' ? (
                      <span className="text-[10px] font-medium text-slate-400 flex items-center bg-slate-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" /> Done
                      </span>
                    ) : cls.status === 'ONGOING' ? (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Now</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Upcoming</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {timetable.length === 0 && (
              <p className="text-sm text-slate-400 pl-7">No classes scheduled</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;