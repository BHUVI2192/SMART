import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, QrCode, Loader2, Wifi, WifiOff } from 'lucide-react';
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
        // Load student stats
        const stats = await getStudentStats(authUser?.usn || authUser?.id || '');
        setSubjectStats(stats.stats);
        setOverallPercentage(stats.overall || 0);

        // Load timetable
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const ttResult = await apiGet('getTimetable', { day: today });

        if (ttResult.success) {
          const items: TimetableItem[] = ttResult.timetable.map((t: any) => ({
            id: t.id,
            subjectName: t.subjectName || t.subjectCode,
            startTime: t.startTime,
            endTime: t.endTime,
            room: t.room,
            status: t.status,
          }));
          setTimetable(items);

          const active = items.find(t => t.status === 'ONGOING');
          if (active) {
            setHasActiveClass(true);
            setActiveClassName(active.subjectName);
            setActiveClassTime(`${active.startTime} - ${active.endTime}`);
            setActiveClassRoom(active.room);
          } else {
            setHasActiveClass(false);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }
    setLoading(false);
  };

  const fallbackToLocal = () => {
    // Use mock data
    setSubjectStats(STUDENT_SUBJECT_STATS.map(s => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      totalClasses: s.totalClasses,
      attendedClasses: s.attendedClasses,
      percentage: s.percentage,
    })));
    setOverallPercentage(88);

    const storedData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    const entries: TimetableEntry[] = storedData ? JSON.parse(storedData) : TODAY_TIMETABLE;

    setTimetable(entries.map(e => ({
      id: e.id,
      subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || e.subjectId,
      startTime: e.startTime,
      endTime: e.endTime,
      room: e.room,
      status: e.status,
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
  const color = isGood ? '#10B981' : '#F59E0B';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection indicator */}
      <div className="flex justify-end">
        {apiReady ? (
          <span className="inline-flex items-center text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <Wifi className="w-3 h-3 mr-1" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Attendance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="text-gray-500 font-medium mb-4">Overall Attendance</h3>
          <div className="relative w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${color} ${overallPercentage * 3.6}deg, #E5E7EB 0deg)`
            }}
          >
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
              <span className={`text-3xl font-bold ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}>
                {overallPercentage}%
              </span>
            </div>
          </div>
          <p className={`text-sm mt-4 font-medium ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isGood ? 'You are on track!' : 'Warning: Low Attendance'}
          </p>
        </div>

        {/* Ongoing Class Action */}
        <div className={`md:col-span-2 rounded-2xl shadow-lg text-white p-8 flex flex-col justify-between transition-colors ${hasActiveClass ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 'bg-gray-800'
          }`}>
          {hasActiveClass ? (
            <>
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{activeClassName}</h2>
                    <p className="text-blue-200">{activeClassTime} • {activeClassRoom}</p>
                  </div>
                  <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                    LIVE NOW
                  </span>
                </div>
                <p className="mt-4 text-blue-100 max-w-md">
                  The attendance window is currently open. Ensure you are within the classroom to mark your attendance successfully.
                </p>
              </div>
              <button
                onClick={() => navigate('/student/scan')}
                className="mt-6 w-full sm:w-auto self-start bg-white text-blue-900 px-6 py-3 rounded-lg font-bold flex items-center hover:bg-blue-50 transition-colors"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Scan QR Code
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckCircle className="w-12 h-12 text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-300">No Classes Active</h2>
              <p className="text-gray-400">There are no ongoing sessions at the moment.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Subject-wise Status</h3>
            <span className="text-xs text-gray-500">Threshold: 85%</span>
          </div>
          <div className="divide-y divide-gray-100">
            {subjectStats.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No attendance data available yet</p>
                <p className="text-xs mt-1">Stats will appear after classes are completed</p>
              </div>
            ) : (
              subjectStats.map((sub) => (
                <div key={sub.subjectCode} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{sub.subjectCode}</h4>
                    <p className="text-xs text-gray-500">{sub.subjectName}</p>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <div className="text-right">
                      <span className={`block text-lg font-bold ${sub.percentage < 85 ? 'text-amber-500' : 'text-gray-900'}`}>
                        {sub.percentage}%
                      </span>
                      <span className="text-xs text-gray-400">{sub.attendedClasses}/{sub.totalClasses} classes</span>
                    </div>
                    {sub.percentage < 85 && (
                      <div className="bg-amber-100 p-1.5 rounded-full text-amber-600" title="Low Attendance Warning">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-6">Today's Schedule</h3>
          <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
            {timetable.map((cls) => (
              <div key={cls.id} className="relative pl-8">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${cls.status === 'COMPLETED' ? 'bg-gray-400' : cls.status === 'ONGOING' ? 'bg-blue-600' : 'bg-emerald-400'
                  }`}></div>

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{cls.subjectName}</h4>
                    <p className="text-xs text-gray-500">{cls.startTime} - {cls.endTime} • {cls.room}</p>
                  </div>
                  <div className="text-right">
                    {cls.status === 'COMPLETED' ? (
                      <span className="text-xs font-medium text-gray-400 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Done
                      </span>
                    ) : cls.status === 'ONGOING' ? (
                      <span className="text-xs font-bold text-blue-600">Now</span>
                    ) : (
                      <span className="text-xs text-gray-400">Upcoming</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {timetable.length === 0 && (
              <p className="text-sm text-gray-500 pl-8">No classes scheduled for today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;