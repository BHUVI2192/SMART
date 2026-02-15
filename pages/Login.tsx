import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, MapPin, ShieldCheck, UserCircle, Lock, AlertCircle, Fingerprint, Wifi } from 'lucide-react';
import { login as apiLogin, AuthUser } from '../services/auth';
import { isApiConfigured } from '../services/api';
import { CURRENT_USER_MOCK } from '../data';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const navigate = useNavigate();

  const apiReady = isApiConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await apiLogin(userId, password);
      onLogin(user);

      switch (user.role) {
        case 'ADMIN': navigate('/admin/dashboard'); break;
        case 'FACULTY': navigate('/faculty/dashboard'); break;
        case 'STUDENT': navigate('/student/dashboard'); break;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'ADMIN' | 'FACULTY' | 'STUDENT') => {
    setLoading(true);
    const mockUser = CURRENT_USER_MOCK[role] as User;

    const authUser: AuthUser = {
      id: mockUser.id,
      name: mockUser.name,
      role: role,
      email: mockUser.email,
      usn: (mockUser as any).usn || '',
      semester: (mockUser as any).semester || '',
      section: (mockUser as any).section || '',
      department: (mockUser as any).department || '',
      avatarInitials: mockUser.avatarInitials,
    };

    sessionStorage.setItem('ams_current_user', JSON.stringify(authUser));

    setTimeout(() => {
      onLogin(authUser);
      switch (role) {
        case 'ADMIN': navigate('/admin/dashboard'); break;
        case 'FACULTY': navigate('/faculty/dashboard'); break;
        case 'STUDENT': navigate('/student/dashboard'); break;
      }
      setLoading(false);
    }, 500);
  };

  const features = [
    { icon: ShieldCheck, text: 'Anti-proxy verification', color: 'text-emerald-400' },
    { icon: MapPin, text: 'GPS geofenced check-ins', color: 'text-amber-400' },
    { icon: Fingerprint, text: 'Biometric ready', color: 'text-purple-400' },
    { icon: Wifi, text: 'Real-time cross-device sync', color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #1a1a2e 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl shadow-black/40 animate-scale-in relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Left Panel - Branding */}
        <div className="lg:w-[45%] p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(99,102,241,0.15) 0%, rgba(37,99,235,0.1) 100%)' }}
        >
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-11 h-11 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">AMS QR</span>
                <p className="text-[10px] text-slate-500 tracking-widest font-medium">SMART ATTENDANCE</p>
              </div>
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-4">
              Attendance<br />Made <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Smarter.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Secure, GPS-verified attendance tracking for modern institutions. Real-time analytics and 85% attendance alerts.
            </p>
          </div>

          <div className="space-y-3 mt-8 relative z-10">
            {features.map((f, i) => (
              <div key={i} className="flex items-center space-x-3 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <span className="text-sm text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="lg:w-[55%] p-8 lg:p-10" style={{ background: 'rgba(255,255,255,0.97)' }}>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Welcome Back</h3>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center mb-6 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setDemoMode(false)}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${!demoMode ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Login
            </button>
            <button
              onClick={() => setDemoMode(true)}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${demoMode ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Demo Mode
            </button>
          </div>

          {!demoMode ? (
            <>
              {!apiReady && (
                <div className="mb-4 bg-amber-50 border border-amber-200/60 rounded-xl p-3 flex items-start space-x-2 animate-slide-down">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    API not configured. Set <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono">VITE_APPS_SCRIPT_URL</code> in <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono">.env.local</code> and restart. Use Demo Mode for now.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200/60 rounded-xl p-3 flex items-start space-x-2 animate-slide-down">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">USN / Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserCircle className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50/50 transition-all duration-200 hover:border-slate-300 focus:bg-white"
                      placeholder="e.g., 4PM21CS001 or admin@vtu.ac.in"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50/50 transition-all duration-200 hover:border-slate-300 focus:bg-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !apiReady}
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white gradient-primary hover:shadow-lg hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-slate-400">
                  Credentials: <span className="font-semibold text-slate-500">student123</span> / <span className="font-semibold text-slate-500">faculty123</span> / <span className="font-semibold text-slate-500">admin123</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-5 text-center">Select a role to login instantly</p>
              <div className="space-y-3 stagger-children">
                {([
                  { role: 'ADMIN' as const, name: 'Admin User', desc: 'Full system access', gradient: 'from-red-500 to-orange-500' },
                  { role: 'FACULTY' as const, name: 'Prof. Harshitha', desc: 'Session & QR management', gradient: 'from-emerald-500 to-teal-500' },
                  { role: 'STUDENT' as const, name: 'Asha Bhat (4PM21CS001)', desc: 'Scan & view attendance', gradient: 'from-blue-500 to-indigo-500' },
                ]).map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleDemoLogin(item.role)}
                    disabled={loading}
                    className="w-full p-4 border border-slate-200 rounded-xl text-left hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-300 disabled:opacity-50 flex items-center group transform hover:-translate-y-0.5"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                      {item.role[0]}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-slate-900">{item.role}</p>
                      <p className="text-xs text-slate-500">{item.name}</p>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors hidden sm:block">{item.desc}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 text-center">
                <p className="text-[11px] text-slate-400">
                  Demo uses local mock data. For cross-device features, configure API.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;