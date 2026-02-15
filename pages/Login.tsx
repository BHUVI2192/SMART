import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, MapPin, ShieldCheck, UserCircle, Lock, AlertCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">

        {/* Left Side - Visuals */}
        <div className="md:w-1/2 bg-blue-900 p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-6">
              <QrCode className="w-8 h-8" />
              <span className="text-xl font-bold tracking-wide">AMS QR</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Attendance Made Smarter.</h2>
            <p className="text-blue-200 mb-8">
              Secure, GPS-verified attendance tracking for modern institutions.
              Real-time analytics and 85% attendance alerts.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center space-x-3 text-sm text-blue-100">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Proxy-proof verification</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-blue-100">
              <MapPin className="w-5 h-5 text-amber-400" />
              <span>Geo-fenced check-ins</span>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-800 opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-900 opacity-30 blur-3xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-8 md:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">Welcome Back</h3>
            <p className="text-gray-500">Sign in to your account</p>
          </div>

          {/* Toggle: Real Login vs Demo Mode */}
          <div className="flex items-center justify-center mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDemoMode(false)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${!demoMode ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Login
            </button>
            <button
              onClick={() => setDemoMode(true)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${demoMode ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Demo Mode
            </button>
          </div>

          {!demoMode ? (
            <>
              {/* Real Login Form */}
              {!apiReady && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    API not configured. Set <code className="bg-amber-100 px-1 rounded">VITE_APPS_SCRIPT_URL</code> in <code className="bg-amber-100 px-1 rounded">.env.local</code> and restart. Use Demo Mode for now.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USN / Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircle className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., 4PM21CS001 or admin@vtu.ac.in"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !apiReady}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Default credentials: <span className="font-medium">student123</span> / <span className="font-medium">faculty123</span> / <span className="font-medium">admin123</span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Demo Mode */}
              <p className="text-sm text-gray-500 mb-4 text-center">Select a role to login instantly (no API needed)</p>
              <div className="space-y-3">
                {(['ADMIN', 'FACULTY', 'STUDENT'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleDemoLogin(role)}
                    disabled={loading}
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 transition-all disabled:opacity-50 flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <UserCircle className="w-5 h-5 mr-3 text-gray-400" />
                      Login as <span className="font-bold ml-1">{role}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {role === 'ADMIN' && 'Admin User'}
                      {role === 'FACULTY' && 'Prof. Harshitha'}
                      {role === 'STUDENT' && 'Asha Bhat (4PM21CS001)'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Demo mode uses local mock data. For cross-device features, configure the API and use Login mode.
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