import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { isApiConfigured, apiGet } from '../../services/api';
import { STUDENTS } from '../../data';

interface StudentRecord {
    usn: string;
    name: string;
    email: string;
    semester: string;
    section: string;
    attendance: number;
}

const AdminStudents: React.FC = () => {
    const apiReady = isApiConfigured();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        if (apiReady) {
            try {
                const result = await apiGet('getAdminStats');
                if (result.success && result.students) {
                    setStudents(result.students);
                }
            } catch (err) {
                console.error('Failed to load:', err);
                fallback();
            }
        } else {
            fallback();
        }
        setLoading(false);
    };

    const fallback = () => {
        setStudents(STUDENTS.map(s => ({
            usn: s.usn,
            name: s.name,
            email: s.email,
            semester: s.semester.toString(),
            section: s.section,
            attendance: Math.floor(Math.random() * 30) + 70,
        })));
    };

    const filtered = students.filter(s =>
        search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.usn.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-900 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Student Records</h2>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or USN..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">USN</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Semester</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Section</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Attendance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found</td></tr>
                        ) : (
                            filtered.map(s => (
                                <tr key={s.usn} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm font-mono text-blue-700">{s.usn}</td>
                                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                                    <td className="px-6 py-3 text-sm text-gray-500">{s.email}</td>
                                    <td className="px-6 py-3 text-sm text-center text-gray-700">{s.semester}</td>
                                    <td className="px-6 py-3 text-sm text-center text-gray-700">{s.section}</td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className={`font-bold text-sm ${s.attendance < 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                {s.attendance}%
                                            </span>
                                            {s.attendance < 85 ? (
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            )}
                                        </div>
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

export default AdminStudents;
