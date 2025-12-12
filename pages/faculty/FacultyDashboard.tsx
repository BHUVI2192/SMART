import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, MapPin, Plus, CheckCircle, X } from 'lucide-react';
import { TODAY_TIMETABLE, SUBJECTS } from '../../data';
import { TimetableEntry } from '../../types';

const TIMETABLE_STORAGE_KEY = 'ams_timetable';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newClassSubject, setNewClassSubject] = useState(SUBJECTS[0].id);
  const [newClassStart, setNewClassStart] = useState('');
  const [newClassEnd, setNewClassEnd] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');

  // Initialize Timetable from LocalStorage or Default Data
  useEffect(() => {
    const storedData = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (storedData) {
      setTimetable(JSON.parse(storedData));
    } else {
      // Seed with dummy data if empty
      setTimetable(TODAY_TIMETABLE);
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(TODAY_TIMETABLE));
    }
  }, []);

  const getSubjectName = (id: string) => SUBJECTS.find(s => s.id === id)?.name || 'Unknown Subject';

  const handleStartSession = (classId: string) => {
    navigate(`/faculty/session/${classId}`);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEntry: TimetableEntry = {
      id: `tt_new_${Date.now()}`,
      dayOfWeek: 'Monday', // Assuming today is Monday for demo
      startTime: newClassStart,
      endTime: newClassEnd,
      subjectId: newClassSubject,
      facultyId: 'f1', // Current logged in faculty
      section: '6A',
      room: newClassRoom || 'LH-101',
      status: 'UPCOMING'
    };

    const updatedTimetable = [...timetable, newEntry];
    setTimetable(updatedTimetable);
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(updatedTimetable));
    
    setIsModalOpen(false);
    // Reset form
    setNewClassStart('');
    setNewClassEnd('');
    setNewClassRoom('');
  };

  const ClassCard: React.FC<{ session: TimetableEntry }> = ({ session }) => (
    <div className={`p-5 rounded-xl border border-gray-200 shadow-sm transition-all ${
      session.status === 'ONGOING' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${
            session.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-800' : 
            session.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
          }`}>
            {session.status}
          </span>
          <h3 className="text-lg font-bold text-gray-900">{getSubjectName(session.subjectId)}</h3>
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
          onClick={() => handleStartSession(session.id)}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors ${
            session.status === 'ONGOING' 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
              : 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-200'
          } shadow-md`}
        >
          <PlayCircle className="w-5 h-5 mr-2" />
          {session.status === 'ONGOING' ? 'Resume Session' : 'Generate QR & Start'}
        </button>
      ) : (
        <button className="w-full flex items-center justify-center py-2.5 rounded-lg font-medium bg-gray-100 text-gray-500 cursor-not-allowed">
          <CheckCircle className="w-5 h-5 mr-2" />
          Class Completed
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Good Morning, Prof. Harshitha</h2>
          <p className="text-gray-500">Here is your schedule for today.</p>
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
      </div>

      <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Today's Timetable</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timetable.map((session) => (
          <ClassCard key={session.id} session={session} />
        ))}
      </div>

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
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                >
                  {SUBJECTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={newClassStart}
                    onChange={(e) => setNewClassStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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