import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Calendar, FileText, 
  QrCode, History, LogOut, Menu, X, User as UserIcon 
} from 'lucide-react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const NavItem: React.FC<{ path: string; icon: any; label: string; isActive: boolean; onClick: () => void }> = ({ path, icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
      isActive
        ? 'bg-blue-900 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-blue-900'
    }`}
  >
    <Icon className="w-5 h-5 mr-3" />
    {label}
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
          { path: '/faculty/records', icon: FileText, label: 'Attendance Records' },
        ];
      case 'STUDENT':
        return [
          { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/student/scan', icon: QrCode, label: 'Scan QR' },
          { path: '/student/history', icon: History, label: 'My Attendance' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <QrCode className="w-8 h-8 text-blue-900 mr-2" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">AMS QR</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wider">VTU PROJECT</p>
          </div>
        </div>

        <nav className="p-4">
          {getNavItems().map((item) => (
            <NavItem 
              key={item.path} 
              path={item.path}
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button 
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 px-4 lg:px-8">
            <h2 className="text-lg font-semibold text-gray-800">
               {user.role === 'ADMIN' ? 'Admin Portal' : user.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold border-2 border-white shadow-sm">
                {user.avatarInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;