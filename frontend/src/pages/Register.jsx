import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Wallet, ShieldAlert, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear validation error on change
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    console.log('[Registration UI] Submitting registration form data:', { username: formData.username, email: formData.email });
    try {
      await register(formData.username, formData.email, formData.password);
      setSuccessMsg('Account created! Bootstrapping your secure ledger...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('[Registration UI Error]:', err);
      const errMsg = typeof err === 'string' ? err : (err?.message || 'Failed to create account. Please check inputs.');
      setErrors({ server: errMsg });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col transition-colors duration-300 light-theme:text-gray-900">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        {/* Background decoration blobs */}
        <div className="absolute top-1/3 left-1/3 -z-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md glass rounded-3xl p-8 glow-indigo relative overflow-hidden light-theme:glass-light"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-600 to-cyan-500 shadow-md mb-4">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white light-theme:text-gray-900">Create Account</h2>
            <p className="text-sm text-gray-500 mt-2">Open your smart fintech wallet registry</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Success banner */}
            {successMsg && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Server Error banner */}
            {errors.server && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{errors.server}</span>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. money_mapper"
                className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-55 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-450 ${
                  errors.username ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                }`}
              />
              {errors.username && <p className="text-xs text-rose-400 mt-1 block">{errors.username}</p>}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@domain.com"
                className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-55 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-450 ${
                  errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                }`}
              />
              {errors.email && <p className="text-xs text-rose-400 mt-1 block">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-55 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-450 ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                }`}
              />
              {errors.password && <p className="text-xs text-rose-400 mt-1 block">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-55 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-450 ${
                  errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                }`}
              />
              {errors.confirmPassword && <p className="text-xs text-rose-400 mt-1 block">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold text-white shadow-xl shadow-indigo-600/10 active:scale-98 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Registering account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-gray-505">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-400 font-medium hover:text-indigo-300 light-theme:text-indigo-650 light-theme:hover:text-indigo-500">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
