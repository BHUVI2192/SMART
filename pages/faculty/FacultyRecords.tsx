import React, { useState, useEffect } from 'react';
import { Loader2, CalendarCheck, Users } from 'lucide-react';
import { AuthUser } from '../../services/auth';
import { isApiConfigured, apiGet } from '../../services/api';

interface FacultyRecordsProps {
    authUser: AuthUser | null;
}

interface SessionRecord {
    sessionId: string;
    subjectName: string;
    subjectCode: string;
    room: string;
    section: string;
    startTime: string;
    endTime: string;
    status: string;
    studentCount: number;
}

const FacultyRecords: React.FC<FacultyRecordsProps> = ({ authUser }) => {
    const apiReady = isApiConfigured();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<SessionRecord[]>([]);

    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = async () => {
        if (apiReady) {
            try {
                const result = await apiGet('getFacultyRecords', { facultyId: authUser?.id || '' });
                if (result.success) {
                    setRecords(result.records);
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
        setRecords([
            { sessionId: 's1', subjectName: 'System Software', subjectCode: '18CS61', room: 'LH-101', section: '6A', startTime: '2025-02-14 09:00', endTime: '2025-02-14 10:00', status: 'COMPLETED', studentCount: 54 },
            { sessionId: 's2', subjectName: 'Computer Graphics', subjectCode: '18CS62', room: 'LH-102', section: '6A', startTime: '2025-02-14 11:00', endTime: '2025-02-14 12:00', status: 'COMPLETED', studentCount: 48 },
            { sessionId: 's3', subjectName: 'Web Technology', subjectCode: '18CS63', room: 'LH-103', section: '6B', startTime: '2025-02-13 14:00', endTime: '2025-02-13 15:00', status: 'COMPLETED', studentCount: 52 },
        ]);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-900 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Session Records</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg"><CalendarCheck className="w-6 h-6 text-blue-700" /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{records.length}</p>
                        <p className="text-sm text-gray-500">Total Sessions</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-100 rounded-lg"><Users className="w-6 h-6 text-emerald-700" /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{records.reduce((sum, r) => sum + r.studentCount, 0)}</p>
                        <p className="text-sm text-gray-500">Total Scans</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Room</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Students</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {records.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-400">No session records yet</td></tr>
                        ) : (
                            records.map(r => (
                                <tr key={r.sessionId} className="hover:bg-gray-50">
                                    <td className="px-6 py-3">
                                        <div className="text-sm font-medium text-gray-900">{r.subjectName}</div>
                                        <div className="text-xs text-gray-500">{r.subjectCode} • Section {r.section}</div>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{r.room}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{r.startTime}</td>
                                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{r.studentCount}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'
                                            }`}>{r.status}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyRecords;
