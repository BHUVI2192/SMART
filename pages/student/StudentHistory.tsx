import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '../../services/auth';
import { isApiConfigured } from '../../services/api';
import { getStudentHistory, HistoryEntry } from '../../services/attendance';

interface StudentHistoryProps {
    authUser: AuthUser | null;
}

const StudentHistory: React.FC<StudentHistoryProps> = ({ authUser }) => {
    const navigate = useNavigate();
    const apiReady = isApiConfigured();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        if (apiReady) {
            try {
                const data = await getStudentHistory(authUser?.usn || authUser?.id || '');
                setHistory(data);
            } catch (err) {
                console.error('Failed to load history:', err);
                setHistory(getMockHistory());
            }
        } else {
            setHistory(getMockHistory());
        }
        setLoading(false);
    };

    const getMockHistory = (): HistoryEntry[] => [
        { subjectCode: '18CS61', subjectName: 'System Software', date: '2025-02-14', status: 'PRESENT' },
        { subjectCode: '18CS62', subjectName: 'Computer Graphics', date: '2025-02-14', status: 'PRESENT' },
        { subjectCode: '18CS63', subjectName: 'Web Technology', date: '2025-02-13', status: 'ABSENT' },
        { subjectCode: '18CS61', subjectName: 'System Software', date: '2025-02-13', status: 'PRESENT' },
        { subjectCode: '18CS64', subjectName: 'Data Mining', date: '2025-02-12', status: 'PRESENT' },
        { subjectCode: '18CS65', subjectName: 'Cloud Computing', date: '2025-02-12', status: 'PRESENT' },
        { subjectCode: '18CS62', subjectName: 'Computer Graphics', date: '2025-02-11', status: 'ABSENT' },
        { subjectCode: '18CS63', subjectName: 'Web Technology', date: '2025-02-11', status: 'PRESENT' },
    ];

    const filtered = history
        .filter(h => filter === 'all' || (filter === 'present' && h.status === 'PRESENT') || (filter === 'absent' && h.status === 'ABSENT'))
        .filter(h => search === '' || h.subjectName.toLowerCase().includes(search.toLowerCase()) || h.subjectCode.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-900 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/student/dashboard')} className="flex items-center text-gray-600 hover:text-blue-900">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </button>
                <h2 className="text-xl font-bold text-gray-800">Attendance History</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex space-x-2">
                    {(['all', 'present', 'absent'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-12 text-gray-400">No records found</td></tr>
                        ) : (
                            filtered.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-800">{entry.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{entry.subjectCode}</div>
                                        <div className="text-xs text-gray-500">{entry.subjectName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {entry.status}
                                        </span>
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

export default StudentHistory;
