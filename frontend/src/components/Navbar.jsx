import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, Wallet, User, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800/40 bg-gray-950/75 backdrop-blur-md transition-colors duration-300 light-theme:bg-white/80 light-theme:border-gray-200/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-cyan-500 shadow-md">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white light-theme:text-gray-900">
                Aura<span className="bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">Finance</span>
              </span>
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white transition-all hover:bg-gray-800/50 light-theme:border-gray-200 light-theme:bg-gray-100 light-theme:text-gray-600 light-theme:hover:text-gray-900"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isDashboard
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/40 light-theme:text-gray-600 light-theme:hover:text-gray-950 light-theme:hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-800/50 bg-gray-900/50 light-theme:border-gray-200 light-theme:bg-gray-100">
                  <User className="h-4 w-4 text-indigo-400 light-theme:text-indigo-600" />
                  <span className="text-sm font-medium text-gray-300 light-theme:text-gray-700">
                    {user.username}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-800/80 bg-gray-950 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all light-theme:border-gray-200 light-theme:bg-white light-theme:hover:bg-rose-50 light-theme:text-rose-600 light-theme:hover:border-rose-200"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all light-theme:text-gray-600 light-theme:hover:text-gray-950"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-sm font-medium text-white shadow-md shadow-indigo-600/10 transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-800 bg-gray-900/40 text-gray-400 light-theme:border-gray-200 light-theme:bg-gray-100 light-theme:text-gray-600"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-400 hover:text-white light-theme:text-gray-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-800 bg-gray-950 px-4 py-4 space-y-3 transition-colors duration-300 light-theme:bg-white light-theme:border-gray-200">
          {user ? (
            <>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-900/50 light-theme:bg-gray-100">
                <User className="h-4 w-4 text-indigo-400 light-theme:text-indigo-600" />
                <span className="text-sm font-medium text-white light-theme:text-gray-850">
                  {user.username} ({user.email})
                </span>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center justify-center gap-2 w-full text-center px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 font-medium"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2 rounded-xl border border-gray-800 text-gray-300 font-medium light-theme:border-gray-200 light-theme:text-gray-700"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
