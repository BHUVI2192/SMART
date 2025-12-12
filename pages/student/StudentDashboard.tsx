import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STUDENT_SUBJECT_STATS, TODAY_TIMETABLE, SUBJECTS } from '../../data';
import { TimetableEntry } from '../../types';
import { AlertTriangle, CheckCircle, QrCode } from 'lucide-react';

const TIMETABLE_STORAGE_KEY = 'ams_timetable';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  
  const overallPercentage = 88; // Hardcoded dummy for aggregate
  const isGood = overallPercentage >= 85;
  const color = isGood ? '#10B981' : '#F59E0B'; // Emerald vs Amber

  useEffect(() => {
    // Load synced timetable or fallback
    const storedData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (storedData) {
      setTimetable(JSON.parse(storedData));
    } else {
      setTimetable(TODAY_TIMETABLE);
    }
    
    // Optional: Add event listener for storage changes to auto-update if tabs are open
    const handleStorageChange = () => {
       const freshData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
       if (freshData) setTimetable(JSON.parse(freshData));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const activeClass = timetable.find(t => t.status === 'ONGOING');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Overall Attendance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="text-gray-500 font-medium mb-4">Overall Attendance</h3>
          
          {/* Custom CSS Donut Chart */}
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
        <div className={`md:col-span-2 rounded-2xl shadow-lg text-white p-8 flex flex-col justify-between transition-colors ${
          activeClass ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 'bg-gray-800'
        }`}>
          {activeClass ? (
            <>
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{SUBJECTS.find(s => s.id === activeClass.subjectId)?.name}</h2>
                    <p className="text-blue-200">{activeClass.startTime} - {activeClass.endTime} • {activeClass.room}</p>
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
            {STUDENT_SUBJECT_STATS.map((sub) => (
              <div key={sub.subjectId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
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
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-6">Today's Schedule</h3>
          <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
            {timetable.map((cls) => (
              <div key={cls.id} className="relative pl-8">
                {/* Dot */}
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                  cls.status === 'COMPLETED' ? 'bg-gray-400' : cls.status === 'ONGOING' ? 'bg-blue-600' : 'bg-emerald-400'
                }`}></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{SUBJECTS.find(s=>s.id === cls.subjectId)?.name}</h4>
                    <p className="text-xs text-gray-500">{cls.startTime} - {cls.endTime} • {cls.room}</p>
                  </div>
                  <div className="text-right">
                    {cls.status === 'COMPLETED' ? (
                       <span className="text-xs font-medium text-gray-400 flex items-center">
                         <CheckCircle className="w-3 h-3 mr-1" /> Attended
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