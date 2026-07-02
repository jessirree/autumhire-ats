import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppSidebar } from '../components/ats/AppSidebar';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts.length > 1 ? pathParts[1] : 'dashboard';

  const handleNavigate = (page: string) => {
    if (user?.role) {
      const rolePath = user.role === 'hiring-manager' ? 'hiring' : user.role;
      navigate(`/${rolePath}/${page}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || user.role === 'candidate') {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 font-sans">
      <AppSidebar
        role={user.role as 'admin' | 'recruiter' | 'hiring-manager'}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
