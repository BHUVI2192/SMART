import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Calendar, FileText,
  QrCode, History, LogOut, Menu, X, User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const NavItem: React.FC<{ icon: any; label: string; isActive: boolean; onClick: () => void }> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-5 py-4 mb-2 text-sm font-bold rounded-full transition-all duration-500 group relative ${isActive
      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
      : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/5'
      }`}
  >
    {isActive && (
      <div className="absolute left-1.5 w-1 h-6 bg-white rounded-full shadow-sm" />
    )}
    <div className={`p-2 rounded-2xl mr-4 transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-slate-50 group-hover:bg-indigo-50 group-hover:scale-110'
      }`}>
      <Icon className="w-[20px] h-[20px]" />
    </div>
    <span className="flex-1 text-left tracking-tight">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ icon: any; label: string; isActive: boolean; onClick: () => void }> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-1 px-1 flex-1 transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
  >
    <div className={`p-2.5 rounded-2xl mb-0.5 transition-all duration-500 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className={`text-[9px] font-black tracking-tighter uppercase ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location.pathname === path;

  const getNavItems = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/students', icon: Users, label: 'Students' },
          { path: '/admin/timetable', icon: Calendar, label: 'Timetable' },
        ];
      case 'FACULTY':
        return [
          { path: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/faculty/records', icon: FileText, label: 'Records' },
        ];
      case 'STUDENT':
        return [
          { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/student/scan', icon: QrCode, label: 'Scan QR' },
          { path: '/student/history', icon: History, label: 'History' },
        ];
      default:
        return [];
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/scan')) return 'Scan Attendance';
    if (path.includes('/history')) return 'Attendance History';
    if (path.includes('/records')) return 'Attendance Records';
    if (path.includes('/students')) return 'Students List';
    if (path.includes('/timetable')) return 'Class Timetable';
    if (path.includes('/session')) return 'Class Session';
    return user.role === 'ADMIN' ? 'Admin Portal' : user.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal';
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN': return { text: 'Admin', color: 'bg-red-50 text-red-600' };
      case 'FACULTY': return { text: 'Faculty', color: 'bg-emerald-50 text-emerald-600' };
      case 'STUDENT': return { text: 'Student', color: 'bg-blue-50 text-blue-600' };
      default: return { text: '', color: '' };
    }
  };

  const badge = getRoleBadge();

  return (
    <div className="min-h-screen flex bg-[#f8faff]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-md z-40 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Restored Candymorphism */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 w-[280px] h-screen candy-sidebar flex flex-col transform transition-transform duration-500 ease-out lg:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 lg:m-4 lg:h-[calc(100vh-32px)] lg:rounded-[40px] shadow-2xl shadow-indigo-100/50`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 mt-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">AMS QR</h1>
            <p className="text-[10px] text-indigo-500 font-black tracking-widest mt-1 uppercase">Smart VTU</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden ml-auto p-2.5 text-slate-400 hover:text-indigo-600 rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card - Soft Glass */}
        <div className="px-4 py-6">
          <div className="flex items-center p-4 rounded-[28px] bg-white/40 border border-white shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-black text-base shadow-xl shadow-indigo-500/20 flex-shrink-0 animate-bop">
              {user.avatarInitials}
            </div>
            <div className="ml-4 truncate">
              <p className="text-sm font-black text-slate-900 truncate lowercase tracking-tight">{user.name}</p>
              <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full mt-1 uppercase tracking-wider ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="px-4 flex-1 overflow-y-auto">
          <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase px-5 mb-4">Portal</p>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.path)}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-6 py-4 text-sm font-black text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all duration-500 group"
          >
            <div className="p-2 rounded-2xl bg-slate-50 mr-4 group-hover:bg-red-100 group-hover:scale-110 transition-all">
              <LogOut className="w-5 h-5" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header - Candy Bar style */}
        <header className="h-20 lg:h-24 sticky top-0 z-30 flex items-center justify-between px-6 lg:px-10 bg-[#f8faff]/80 backdrop-blur-xl border-b border-slate-100 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-12 h-12 flex items-center justify-center bg-white text-slate-700 shadow-xl shadow-slate-200 rounded-2xl mr-4 active:scale-90 transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {getPageTitle()}
              </h2>
              <p className="text-[10px] lg:text-xs text-slate-400 font-bold hidden sm:block">Welcome back, {user.name.split(' ')[0]}!</p>
            </div>
          </div>

          <div className="flex items-center group cursor-pointer">
            <div className="text-right mr-4 hidden md:block">
              <p className="text-sm font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{user.name}</p>
              <p className="text-[11px] text-slate-400 font-bold">{user.email}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 font-black text-sm shadow-xl shadow-slate-200 group-hover:scale-110 transition-all duration-500 border border-slate-50">
              {user.avatarInitials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 lg:px-10 mt-4 pb-28 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav - Candy Pill style */}
      <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden px-3 py-2 bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-2xl shadow-indigo-900/10 border border-slate-100">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <MobileNavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
          <MobileNavItem
            icon={LogOut}
            label="Logout"
            isActive={false}
            onClick={onLogout}
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;