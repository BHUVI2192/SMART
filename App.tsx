import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import SessionView from './pages/faculty/SessionView';
import ScanPage from './pages/student/ScanPage';
import { User } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  user: User | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, user }) => {
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role.toLowerCase()}/dashboard`} />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/students" 
          element={
            <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
              <div className="p-4">Student Management Page (Placeholder)</div>
            </ProtectedRoute>
          } 
        />
        <Route 
           path="/admin/timetable" 
           element={
             <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
               <div className="p-4">Timetable Management (Placeholder)</div>
             </ProtectedRoute>
           } 
        />

        {/* Faculty Routes */}
        <Route 
          path="/faculty/dashboard" 
          element={
            <ProtectedRoute user={user} allowedRoles={['FACULTY']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/faculty/session/:id" 
          element={
            <ProtectedRoute user={user} allowedRoles={['FACULTY']}>
              <SessionView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/faculty/records" 
          element={
            <ProtectedRoute user={user} allowedRoles={['FACULTY']}>
              <div className="p-4">Attendance Records Table (Placeholder)</div>
            </ProtectedRoute>
          } 
        />

        {/* Student Routes */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute user={user} allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/scan" 
          element={
            <ProtectedRoute user={user} allowedRoles={['STUDENT']}>
              <ScanPage user={user} />
            </ProtectedRoute>
          } 
        />
         <Route 
          path="/student/history" 
          element={
            <ProtectedRoute user={user} allowedRoles={['STUDENT']}>
              <div className="p-4">Attendance History (Placeholder)</div>
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

export default App;