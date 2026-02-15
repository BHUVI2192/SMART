import React, { useState, useEffect } from 'react';
import { Loader2, Clock, MapPin } from 'lucide-react';
import { isApiConfigured, apiGet } from '../../services/api';
import { TODAY_TIMETABLE, SUBJECTS, FACULTY_MEMBERS } from '../../data';
import { TimetableEntry } from '../../types';

const TIMETABLE_STORAGE_KEY = 'ams_timetable';

interface TTEntry {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    subjectCode: string;
    facultyName: string;
    section: string;
    room: string;
}

const AdminTimetable: React.FC = () => {
    const apiReady = isApiConfigured();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<TTEntry[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>('Monday');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        loadTimetable();
    }, [selectedDay]);

    const loadTimetable = async () => {
        setLoading(true);
        if (apiReady) {
            try {
                const result = await apiGet('getTimetable', { day: selectedDay });
                if (result.success) {
                    setTimetable(result.timetable.map((t: any) => ({
                        id: t.id,
                        day: t.day,
                        startTime: t.startTime,
                        endTime: t.endTime,
                        subjectName: t.subjectName || t.subjectCode,
                        subjectCode: t.subjectCode,
                        facultyName: t.facultyName || t.facultyId || '',
                        section: t.section,
                        room: t.room,
                    })));
                }
            } catch (err) {
                console.error(err);
                fallback();
            }
        } else {
            fallback();
        }
        setLoading(false);
    };

    const fallback = () => {
        const stored = localStorage.getItem(TIMETABLE_STORAGE_KEY);
        const entries: TimetableEntry[] = stored ? JSON.parse(stored) : TODAY_TIMETABLE;
        setTimetable(entries.map(e => ({
            id: e.id,
            day: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            subjectName: SUBJECTS.find(s => s.id === e.subjectId)?.name || e.subjectId,
            subjectCode: e.subjectId,
            facultyName: FACULTY_MEMBERS.find(f => f.id === e.facultyId)?.name || e.facultyId,
            section: e.section,
            room: e.room,
        })));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Timetable Management</h2>

            <div className="flex space-x-2 overflow-x-auto pb-2">
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedDay === day ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-blue-900 animate-spin" /></div>
            ) : timetable.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                    No classes scheduled for {selectedDay}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {timetable.map(entry => (
                        <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-gray-900 mb-1">{entry.subjectName}</h3>
                            <p className="text-xs text-gray-500 font-mono">{entry.subjectCode}</p>

                            <div className="mt-4 space-y-2 text-sm text-gray-600">
                                <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-400" />{entry.startTime} - {entry.endTime}</div>
                                <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" />{entry.room}, Section {entry.section}</div>
                            </div>

                            {entry.facultyName && (
                                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                    Faculty: <span className="font-medium text-gray-700">{entry.facultyName}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminTimetable;
