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
    className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
        ? 'bg-white/15 text-white shadow-lg shadow-black/10'
        : 'text-slate-400 hover:bg-white/8 hover:text-white'
      }`}
  >
    <div className={`p-1.5 rounded-lg mr-3 transition-all duration-200 ${isActive ? 'bg-indigo-500/30' : 'group-hover:bg-white/10'
      }`}>
      <Icon className="w-[18px] h-[18px]" />
    </div>
    <span className="flex-1 text-left">{label}</span>
    {isActive && <ChevronRight className="w-4 h-4 text-white/50" />}
  </button>
);

const MobileNavItem: React.FC<{ icon: any; label: string; isActive: boolean; onClick: () => void }> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-1.5 px-2 flex-1 min-h-[52px] transition-all duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400'
      }`}
  >
    <div className={`p-1 rounded-lg mb-0.5 transition-all duration-200 ${isActive ? 'bg-indigo-100' : ''
      }`}>
      <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : ''}`}>{label}</span>
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

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN': return { text: 'Admin', color: 'bg-red-500/20 text-red-300' };
      case 'FACULTY': return { text: 'Faculty', color: 'bg-emerald-500/20 text-emerald-300' };
      case 'STUDENT': return { text: 'Student', color: 'bg-blue-500/20 text-blue-300' };
      default: return { text: '', color: '' };
    }
  };

  const badge = getRoleBadge();

  return (
    <div className="min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] gradient-dark flex flex-col transform transition-transform duration-300 ease-out lg:transform-none hide-desktop-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/8">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-base font-bold text-white leading-none tracking-tight">AMS QR</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest mt-0.5">SMART ATTENDANCE</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-4">
          <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex-shrink-0">
              {user.avatarInitials}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="px-3 flex-1">
          <p className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase px-4 mb-2">Navigation</p>
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
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="h-14 glass sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 border-b border-white/10">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl mr-2 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm lg:text-base font-semibold text-slate-800">
              {user.role === 'ADMIN' ? 'Admin Portal' : user.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user.avatarInitials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
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