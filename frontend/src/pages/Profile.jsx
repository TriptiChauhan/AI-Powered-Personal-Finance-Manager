import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { User, Mail, DollarSign, Bell, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';

const Profile = () => {
  const { user: authUser } = useAuth();
  
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    currency: 'USD',
    email_notifications: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/profile');
      const data = response.data.user;
      setProfile({
        username: data.username,
        email: data.email,
        currency: data.currency || 'USD',
        email_notifications: data.email_notifications === 1 || data.email_notifications === true
      });
    } catch (err) {
      console.error('Fetch profile details failed:', err);
      triggerNotification('Could not load account profiles. Verify server state.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put('/profile', {
        username: profile.username,
        email: profile.email,
        currency: profile.currency,
        email_notifications: profile.email_notifications
      });
      
      triggerNotification('Profile settings updated successfully.', 'success');
      
      // Update local storage username/email if changed
      if (response.data.user) {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          // Trigger auth context refresh
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Update profile settings failed:', err);
      triggerNotification(err.response?.data?.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-2xl backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Profile Settings</h1>
        <p className="text-sm text-gray-550 mt-1">Configure account properties, default currencies, and notification setups.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl light-theme:glass-light">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-gray-550">Retrieving account settings metadata...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Account Details Card */}
          <div className="glass rounded-3xl p-6 glow-indigo space-y-6 light-theme:glass-light">
            <h3 className="text-lg font-bold text-white light-theme:text-gray-900 border-b border-gray-800/40 pb-3 light-theme:border-gray-202">
              Primary Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Profile Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    name="username"
                    value={profile.username}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Contact Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-600" />
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="glass rounded-3xl p-6 glow-indigo space-y-6 light-theme:glass-light">
            <h3 className="text-lg font-bold text-white light-theme:text-gray-900 border-b border-gray-800/40 pb-3 light-theme:border-gray-202">
              System Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency Dropdown */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Base ledger currency</label>
                  <p className="text-xs text-gray-550 mb-3.5">All transactions and limits will automatically format with this symbol.</p>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3.5 h-4 w-4 text-indigo-400" />
                  <select
                    name="currency"
                    value={profile.currency}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  >
                    <option value="USD">USD ($) United States Dollar</option>
                    <option value="INR">INR (₹) Indian Rupee</option>
                    <option value="EUR">EUR (€) Euro</option>
                    <option value="GBP">GBP (£) Great British Pound</option>
                  </select>
                </div>
              </div>

              {/* Email Notifications Toggle */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Alerts</label>
                  <p className="text-xs text-gray-550 mb-3.5">Receive dispatches when monthly category budgets exceed limits or reminders are due.</p>
                </div>
                
                <label className="flex items-center gap-3.5 p-3 rounded-2xl border border-gray-800/50 bg-gray-950/20 cursor-pointer select-none hover:bg-gray-950/40 transition-all light-theme:border-gray-205 light-theme:bg-gray-50/50">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={profile.email_notifications}
                    onChange={handleChange}
                    className="h-5 w-5 rounded-md text-indigo-600 focus:ring-indigo-550 border-gray-800 bg-gray-950 light-theme:border-gray-300"
                  />
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white light-theme:text-gray-800">
                    <Bell className="h-4 w-4 text-indigo-400" />
                    <span>Dispatch notifications</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={fetchProfile}
              className="px-5 py-3 border border-gray-800 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:hover:bg-gray-100 light-theme:text-gray-700"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-550 text-white font-semibold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Profile;
