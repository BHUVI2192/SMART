import React from 'react';
import { Users, BookOpen, AlertTriangle, Calendar } from 'lucide-react';
import { STUDENTS, SUBJECTS } from '../../data';

const AdminDashboard = () => {
  const lowAttendanceStudents = STUDENTS.filter(s => s.overallAttendance < 85);

  const stats = [
    { label: 'Total Students', value: '1,240', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Faculty', value: '58', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Total Subjects', value: SUBJECTS.length.toString(), icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Active Classes', value: '8', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  // Dummy data for chart
  const attendanceData = [
    { name: 'Mon', present: 85 },
    { name: 'Tue', present: 88 },
    { name: 'Wed', present: 92 },
    { name: 'Thu', present: 78 },
    { name: 'Fri', present: 82 },
    { name: 'Sat', present: 95 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Administrator Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h4 className="text-2xl font-bold text-gray-900">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Attendance Alert */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              Low Attendance Alerts ({'<'} 85%)
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
              Action Required
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
                  <th className="px-4 py-2 font-medium">USN</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Attendance</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {lowAttendanceStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{student.usn}</td>
                    <td className="px-4 py-3 text-gray-600">{student.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {student.overallAttendance}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">Notify Parent</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Attendance Trend (Custom CSS Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Attendance Overview</h3>
          <div className="h-64 w-full flex items-end justify-between space-x-2 pt-4 px-2">
             {attendanceData.map((d) => (
               <div key={d.name} className="flex flex-col items-center flex-1 h-full justify-end group">
                 <div className="relative w-full max-w-[40px] bg-gray-100 rounded-t-md h-full flex items-end overflow-hidden">
                   <div 
                     style={{ height: `${d.present}%` }} 
                     className="w-full bg-blue-900 rounded-t-md transition-all duration-500 group-hover:bg-blue-800 relative"
                   >
                     {/* Tooltip on hover */}
                     <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                       {d.present}%
                     </div>
                   </div>
                 </div>
                 <span className="text-xs text-gray-500 mt-2 font-medium">{d.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;