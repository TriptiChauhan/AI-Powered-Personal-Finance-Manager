import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  LogOut,
  Wallet,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Bell,
  Settings,
  Sparkles,
  Sliders
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Money Manager', path: '/transactions', icon: Sliders },
    { name: 'Analytics Core', path: '/analytics', icon: BarChart3 },
    { name: 'Financial Calendar', path: '/calendar', icon: Calendar },
    { name: 'Bills & Reminders', path: '/reminders', icon: Bell },
    { name: 'AI Planner', path: '/planner', icon: Sparkles },
    { name: 'Profile Settings', path: '/profile', icon: Settings }
  ];

  return (
    <aside
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] border-r border-gray-800/40 bg-gray-950/75 backdrop-blur-md transition-all duration-300 hidden md:flex flex-col justify-between light-theme:bg-white/80 light-theme:border-gray-200/50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Navigation Links */}
      <div className="px-3 py-6 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/40 light-theme:text-gray-650 light-theme:hover:text-gray-900 light-theme:hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </div>

      {/* Collapse Toggle / User Profile Footer */}
      <div className="p-3 border-t border-gray-800/40 space-y-3 light-theme:border-gray-200/50">
        {!isCollapsed && user && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gray-900/30 border border-gray-800/30 light-theme:bg-gray-50 light-theme:border-gray-200/50">
            <User className="h-4.5 w-4.5 text-indigo-400 light-theme:text-indigo-650" />
            <div className="truncate">
              <p className="text-xs font-bold text-gray-200 light-theme:text-gray-800 truncate">{user.username}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5 transition-all light-theme:text-rose-600 light-theme:hover:bg-rose-50/50"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {/* Desktop Collapse Arrow */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-auto hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900/40 transition-all light-theme:border-gray-200 light-theme:text-gray-600"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
