import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Sparkles, BrainCircuit, LineChart, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';

const Landing = () => {
  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-hidden transition-colors duration-300 light-theme:text-gray-900">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-20 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute top-40 right-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8 lg:pt-28 pb-16">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md light-theme:border-indigo-200 light-theme:bg-indigo-50 light-theme:text-indigo-650"
          >
            <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
            Next-Gen Personal Finance Assistant
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-none"
          >
            Master Your Spending with{' '}
            <span className="text-gradient font-black">AI Insights</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl light-theme:text-gray-600"
          >
            Take full control of your budgets, expenses, and savings. Our local AI engine automatically audits your transactions, flags leaks, and recommends structural adjustments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-550 text-white font-semibold shadow-xl shadow-indigo-600/20 active:scale-98 transition-all w-full sm:w-auto justify-center"
            >
              Start Free Today
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              to="/login"
              className="px-8 py-4 rounded-2xl border border-gray-800 bg-gray-950 hover:bg-gray-900 transition-all font-semibold w-full sm:w-auto text-center light-theme:border-gray-200 light-theme:bg-white light-theme:hover:bg-gray-50"
            >
              Sign In to Dashboard
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="border-t border-gray-900/60 bg-gray-950/20 py-20 transition-colors duration-300 light-theme:border-gray-200 light-theme:bg-gray-50/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white light-theme:text-gray-900 sm:text-4xl">
              Engineered for Wealth Creation
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400 light-theme:text-gray-600">
              An elegant sandbox utility equipped with full automation capabilities and charts.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="glass rounded-3xl p-8 glow-indigo light-theme:glass-light"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-600">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white light-theme:text-gray-900">AI Advice Core</h3>
              <p className="mt-3 text-sm text-gray-450 leading-relaxed light-theme:text-gray-600">
                Instantly aggregates transactions, monitors categories, and suggests savings plans using local rule networks and Gemini logic.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="glass rounded-3xl p-8 glow-teal light-theme:glass-light"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 light-theme:bg-teal-50 light-theme:text-teal-650">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white light-theme:text-gray-900">Visual Insights</h3>
              <p className="mt-3 text-sm text-gray-450 leading-relaxed light-theme:text-gray-600">
                Understand category allocations and expense velocity trends using responsive Recharts graphics.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="glass rounded-3xl p-8 glow-indigo light-theme:glass-light"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white light-theme:text-gray-900">Secure Vault</h3>
              <p className="mt-3 text-sm text-gray-450 leading-relaxed light-theme:text-gray-600">
                Your credentials and API calls are shielded by industry-standard cryptographically hashed JWT authorization standards.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900/60 bg-gray-950 py-12 transition-colors duration-300 light-theme:border-gray-200 light-theme:bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white light-theme:text-gray-955">AuraFinance</span>
          </div>
          <p className="mt-4 md:mt-0">
            &copy; {new Date().getFullYear()} AuraFinance. Securely managed, AI assisted.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
