import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedLayout from './components/ProtectedLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MoneyManager from './pages/MoneyManager';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Reminders from './pages/Reminders';
import CalendarView from './pages/CalendarView';
import Planner from './pages/Planner';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public views */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Secure authenticated layout wrapper views */}
            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<MoneyManager />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/planner" element={<Planner />} />
              </Route>
            </Route>

            {/* Redirection fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
