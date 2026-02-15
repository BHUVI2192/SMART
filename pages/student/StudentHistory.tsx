import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2, CalendarDays, CheckCircle, XCircle } from 'lucide-react';
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

    useEffect(() => { loadHistory(); }, []);

    const loadHistory = async () => {
        if (apiReady) {
            try {
                const data = await getStudentHistory(authUser?.usn || authUser?.id || '');
                setHistory(data);
            } catch (err) { console.error('Failed to load history:', err); setHistory(getMockHistory()); }
        } else { setHistory(getMockHistory()); }
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

    const presentCount = history.filter(h => h.status === 'PRESENT').length;
    const absentCount = history.filter(h => h.status === 'ABSENT').length;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-5 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/student/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </button>
                <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">{history.length}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Total</p>
                </div>
                <div className="glass-card p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{presentCount}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Present</p>
                </div>
                <div className="glass-card p-3 text-center">
                    <p className="text-lg font-bold text-red-500">{absentCount}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Absent</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" placeholder="Search by subject..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 backdrop-blur transition-all hover:border-slate-300 focus:bg-white"
                    />
                </div>
                <div className="flex space-x-2">
                    {(['all', 'present', 'absent'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 ${filter === f
                                    ? 'gradient-primary text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white/60 text-slate-600 hover:bg-white border border-slate-200/60'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subject</th>
                                <th className="text-center px-4 sm:px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-12 text-slate-400">
                                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium">No records found</p>
                                </td></tr>
                            ) : (
                                filtered.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 sm:px-6 py-3.5 text-sm text-slate-800 font-medium">{entry.date}</td>
                                        <td className="px-4 sm:px-6 py-3.5">
                                            <div className="text-sm font-semibold text-slate-900">{entry.subjectCode}</div>
                                            <div className="text-[11px] text-slate-500">{entry.subjectName}</div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3.5 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${entry.status === 'PRESENT'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {entry.status === 'PRESENT' ? (
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                )}
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
        </div>
    );
};

export default StudentHistory;
