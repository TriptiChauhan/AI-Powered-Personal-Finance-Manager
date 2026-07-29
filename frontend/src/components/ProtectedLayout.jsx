import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { LayoutDashboard, Receipt, BarChart3, Calendar, Bell, Settings, Sparkles, Sliders } from 'lucide-react';

const ProtectedLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mobileNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Manager', path: '/transactions', icon: Sliders },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Planner', path: '/planner', icon: Sparkles },
    { name: 'Reminders', path: '/reminders', icon: Bell },
    { name: 'Settings', path: '/profile', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-white transition-colors duration-300 light-theme:bg-gray-100 light-theme:text-gray-900">
      {/* Shared Navbar at top */}
      <Navbar />

      <div className="flex">
        {/* Left Sidebar on desktop */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 transition-all duration-300 ${
            isCollapsed ? 'md:ml-20' : 'md:ml-64'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <nav className="fixed bottom-0 left-0 right-0 z-45 h-16 border-t border-gray-800 bg-gray-950/80 backdrop-blur-md flex md:hidden items-center justify-around px-4 light-theme:bg-white light-theme:border-gray-205">
        {mobileNavItems.map(item => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-indigo-400 light-theme:text-indigo-600'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default ProtectedLayout;
