import React from 'react';
import {
  LayoutDashboard, Users, Briefcase, FileText, Search,
  Calendar, Award, BarChart2, Megaphone,
  ClipboardList, UserCheck, GitBranch, Mail,
  CheckSquare, LogOut, Layers,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { id: 'dashboard',             label: 'Dashboard',             icon: <LayoutDashboard className="size-4" /> },
    { id: 'users',                 label: 'User Management',       icon: <Users className="size-4" /> },
    { id: 'positions',             label: 'Job Positions',         icon: <Layers className="size-4" /> },
    { id: 'requisition-approvals', label: 'Requisition Approvals', icon: <CheckSquare className="size-4" /> },
    { id: 'post-job',              label: 'Post New Job',          icon: <Briefcase className="size-4" /> },
    { id: 'templates',             label: 'Email Templates',       icon: <Mail className="size-4" /> },
    { id: 'screening',             label: 'Pre-screening',         icon: <ClipboardList className="size-4" /> },
    { id: 'workflow',              label: 'Workflows',             icon: <GitBranch className="size-4" /> },
    { id: 'reports',               label: 'Reports',               icon: <BarChart2 className="size-4" /> },
  ],
  recruiter: [
    { id: 'dashboard',    label: 'Dashboard',       icon: <LayoutDashboard className="size-4" /> },
    { id: 'requisitions', label: 'Requisitions',    icon: <FileText className="size-4" /> },
    { id: 'adverts',      label: 'Job Adverts',     icon: <Megaphone className="size-4" /> },
    { id: 'applications', label: 'Applications',    icon: <ClipboardList className="size-4" /> },
    { id: 'screening',    label: 'Screening',       icon: <Search className="size-4" /> },
    { id: 'candidates',   label: 'Candidates',      icon: <Users className="size-4" /> },
    { id: 'interviews',   label: 'Interviews',      icon: <Calendar className="size-4" /> },
    { id: 'offers',       label: 'Offers',          icon: <Award className="size-4" /> },
  ],
  'hiring-manager': [
    { id: 'dashboard',    label: 'Dashboard',       icon: <LayoutDashboard className="size-4" /> },
    { id: 'requisitions', label: 'Requisitions',    icon: <FileText className="size-4" /> },
    { id: 'shortlisting', label: 'Shortlisting',    icon: <UserCheck className="size-4" /> },
    { id: 'interviews',   label: 'Interviews',      icon: <Calendar className="size-4" /> },
    { id: 'approvals',    label: 'Offer Approvals', icon: <CheckSquare className="size-4" /> },
  ],
};

interface AppSidebarProps {
  role: 'admin' | 'recruiter' | 'hiring-manager';
  currentPage: string;
  onNavigate: (page: string) => void;
  userName: string;
  onLogout: () => void;
}

export function AppSidebar({ role, currentPage, onNavigate, userName, onLogout }: AppSidebarProps) {
  const items = NAV_ITEMS[role] || [];

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    recruiter: 'Recruiter',
    'hiring-manager': 'Hiring Manager',
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/favicon.jpg" alt="Autumhire" className="size-8 rounded-lg object-contain shrink-0" />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Autumhire</p>
            <p className="text-xs text-gray-500 mt-0.5">{roleLabel[role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-autumn-primary/10 text-autumn-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={isActive ? 'text-autumn-primary' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-autumn-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-gray-50">
          <div className="size-8 rounded-full bg-autumn-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-autumn-primary">
              {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500">{roleLabel[role]}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
