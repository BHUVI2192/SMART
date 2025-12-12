import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';
import { CURRENT_USER_MOCK } from '../data';
import { QrCode, MapPin, ShieldCheck, UserCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>('STUDENT');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const user = CURRENT_USER_MOCK[role] as User;
      onLogin(user);
      
      switch (role) {
        case 'ADMIN': navigate('/admin/dashboard'); break;
        case 'FACULTY': navigate('/faculty/dashboard'); break;
        case 'STUDENT': navigate('/student/dashboard'); break;
      }
      setLoading(false);
    }, 1000);
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

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Role (Demo)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['ADMIN', 'FACULTY', 'STUDENT'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-1 text-xs md:text-sm font-medium rounded-lg border transition-all ${
                      role === r 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username / ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  defaultValue="demo_user"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                defaultValue="password"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              This is a dummy application for VTU Mini Project.
              <br />No real authentication is performed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;