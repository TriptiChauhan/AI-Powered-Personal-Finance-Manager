import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Send,
  HelpCircle,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  MessageSquare,
  DollarSign,
  User,
  Sliders,
  Award,
  ArrowRight,
  Play,
  RotateCcw,
  PlusCircle,
  Trash2,
  Check,
  Percent,
  XCircle,
  Info
} from 'lucide-react';
import { CardSkeleton } from '../components/SkeletonLoader';

const Planner = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'INR';

  // Config & State
  const [monthSelection, setMonthSelection] = useState(
    new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [savingsGoal, setSavingsGoal] = useState('');
  const [financialGoal, setFinancialGoal] = useState('Save Money');
  
  // Custom Allocations categories breakdown dictionary
  const [expenseBreakdown, setExpenseBreakdown] = useState({
    Rent: 12000,
    Food: 6000,
    'Electricity Bill': 2500,
    'Internet Bill': 900,
    'Water Bill': 500,
    Transport: 3000,
    Fuel: 2500,
    Shopping: 4000,
    Entertainment: 2000,
    Medical: 1500,
    Insurance: 2000,
    Investments: 5000,
    Savings: 8000,
    Others: 3000
  });

  // Adding Custom category
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [prefillLoading, setPrefillLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: `Namaste ${user?.username || 'user'}! I am AuraAI, your wealth advisor. I can analyze your customized allocations, category spending averages, and goals to optimize your budget. Ask me anything or select a suggestion pill below.`
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Fetch prefill allocations from DB (falls back to transaction aggregates if DB is empty)
  const fetchPrefillData = async () => {
    setPrefillLoading(true);
    try {
      const response = await axios.get(`/planner/prefill?monthSelection=${monthSelection}`);
      const data = response.data;
      if (data.monthlyIncome) {
        setMonthlyIncome(data.monthlyIncome);
      }
      if (data.expenseBreakdown && Object.keys(data.expenseBreakdown).length > 0) {
        setExpenseBreakdown(data.expenseBreakdown);
      }
    } catch (err) {
      console.error('[AI Planner] Failed to resolve prefill stats:', err);
    } finally {
      setPrefillLoading(false);
    }
  };

  // Re-fetch prefill data when month selection changes
  useEffect(() => {
    fetchPrefillData();
  }, [monthSelection]);

  const handleCategoryAmountChange = (catName, val) => {
    const numeric = parseFloat(val) || 0;
    setExpenseBreakdown(prev => ({
      ...prev,
      [catName]: numeric
    }));
  };

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatAmount) return;
    
    const catName = newCatName.trim();
    const amount = parseFloat(newCatAmount) || 0;

    setExpenseBreakdown(prev => ({
      ...prev,
      [catName]: amount
    }));

    setNewCatName('');
    setNewCatAmount('');
    setShowAddForm(false);
  };

  const handleDeleteCategory = (catName) => {
    setExpenseBreakdown(prev => {
      const updated = { ...prev };
      delete updated[catName];
      return updated;
    });
  };

  // Calculations
  const totalAllocated = Object.values(expenseBreakdown).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  const remainingBalance = monthlyIncome - totalAllocated;
  const isOverdrawn = totalAllocated > monthlyIncome;
  const isBalanced = totalAllocated === monthlyIncome;

  const triggerGeneratePlan = async (e) => {
    if (e) e.preventDefault();
    if (isOverdrawn) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/planner/generate', {
        monthlyIncome,
        monthlyExpenses: totalAllocated,
        savingsGoal: parseFloat(savingsGoal) || 0,
        financialGoal,
        monthSelection,
        expenseBreakdown
      });
      setPlan(response.data);
    } catch (err) {
      console.error('[AI Planner] Plan generation failed:', err);
      setError(err.response?.data?.message || 'Could not compile Indian AI monthly plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (messageText) => {
    const textToSend = messageText || chatInput;
    if (!textToSend.trim()) return;

    // Add user message
    setChatHistory(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await axios.post('/planner/ask', { question: textToSend });
      setChatHistory(prev => [...prev, { sender: 'ai', text: response.data.answer }]);
    } catch (err) {
      console.error('[AI Chat] Q&A request failed:', err);
      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I encountered an error compiling that response. Please verify database connectivity and try again.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const presetQuestions = [
    "Where can I reduce my spending in India?",
    "Which mutual funds SIP should I start?",
    "How does tax saving PPF or ELSS work?",
    "Can I afford a trip this month?",
    "How can I save ₹2,000 extra?"
  ];

  // Radial Circle variables
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const healthScore = plan?.financialHealthScore || 0;
  const strokeOffset = circ - (healthScore / 100) * circ;

  const getScoreBgColor = (score) => {
    if (score >= 85) return 'stroke-emerald-450';
    if (score >= 70) return 'stroke-amber-450';
    return 'stroke-rose-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 85) return 'text-emerald-405';
    if (score >= 70) return 'text-amber-450';
    return 'text-rose-455';
  };

  const plannedSavings = plan?.monthlyBudget?.['Savings'] || 0;
  const targetSavingsGoal = parseFloat(savingsGoal) || 0;
  const savingsProgressPercent = targetSavingsGoal > 0 ? Math.min(100, (plannedSavings / targetSavingsGoal) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight flex items-center gap-2">
            AI Monthly Planner
            <BrainCircuit className="text-indigo-400 h-7 w-7 shrink-0 animate-pulse" />
          </h1>
          <p className="text-sm text-gray-550 mt-1">Configure income parameters, customize category cards, and generate your Indian Rupee AI planner.</p>
        </div>

        {plan && (
          <button
            onClick={() => setPlan(null)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-800 bg-gray-950 text-gray-400 hover:text-white px-5 py-3 font-semibold transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-655"
          >
            <RotateCcw className="h-4 w-4" />
            Re-configure Inputs
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. LOADING STATES */}
      {prefillLoading && (
        <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl light-theme:glass-light">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-gray-550">Resolving saved allocations and transaction aggregates...</p>
        </div>
      )}

      {loading && !prefillLoading && (
        <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl light-theme:glass-light">
          <BrainCircuit className="h-12 w-12 text-indigo-400 animate-bounce mb-5" />
          <p className="text-base font-bold text-white light-theme:text-gray-900 animate-pulse">AuraAI is mapping your financial limits plan...</p>
          <p className="text-xs text-gray-550 mt-2">Saving allocations to MySQL & planning Indian wealth playbooks</p>
        </div>
      )}

      {/* 2. GLASSMORPHIC CONFIGURATION WRAPPER */}
      {!plan && !loading && !prefillLoading && (
        <div className="space-y-6">
          
          {/* Validation Indicators header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Monthly Income Card */}
            <div className="glass rounded-3xl p-5 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Monthly Income</span>
              <div className="relative">
                <span className="absolute left-0 top-1 text-xl font-bold text-indigo-400">₹</span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                  className="w-full pl-5 py-1 text-2xl font-black bg-transparent text-white focus:outline-hidden light-theme:text-gray-905"
                />
              </div>
            </div>

            {/* Running Total Card */}
            <div className="glass rounded-3xl p-5 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Total Allocated</span>
              <span className="text-2xl font-black text-white light-theme:text-gray-900">
                {formatAmount(totalAllocated, baseCurrency)}
              </span>
            </div>

            {/* Remaining Balance Card */}
            <div className="glass rounded-3xl p-5 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Remaining Balance</span>
              <span className={`text-2xl font-black ${remainingBalance < 0 ? 'text-rose-455 animate-pulse' : 'text-emerald-405'}`}>
                {formatAmount(remainingBalance, baseCurrency)}
              </span>
            </div>

            {/* Selection Options Card */}
            <div className="glass rounded-3xl p-4 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center space-y-1">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Month:</span>
                <select
                  value={monthSelection}
                  onChange={e => setMonthSelection(e.target.value)}
                  className="bg-transparent border-none text-white font-bold light-theme:text-gray-900 focus:outline-hidden"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Goal:</span>
                <select
                  value={financialGoal}
                  onChange={e => setFinancialGoal(e.target.value)}
                  className="bg-transparent border-none text-white font-bold light-theme:text-gray-900 focus:outline-hidden"
                >
                  {['Save Money', 'Buy a Laptop', 'Buy a Bike', 'Trip', 'Emergency Fund', 'Investment'].map(g => (
                    <option key={g} value={g} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">{g}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* AI Validation Alert Banners */}
          <AnimatePresence mode="wait">
            {isOverdrawn && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-start gap-3 light-theme:text-rose-800"
              >
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Allocations Exceed Income:</span> Your planned expenses exceed your monthly income by <span className="font-extrabold">{formatAmount(Math.abs(remainingBalance), baseCurrency)}</span>. Consider reducing spending on wants or increasing your income streams.
                </div>
              </motion.div>
            )}

            {!isOverdrawn && remainingBalance > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-405 flex items-start gap-3 light-theme:text-emerald-800"
              >
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Unallocated Surplus Cash:</span> You have <span className="font-extrabold">{formatAmount(remainingBalance, baseCurrency)}</span> unallocated. Consider adding it to investments, high-yield savings, or your emergency fund SIPs.
                </div>
              </motion.div>
            )}

            {isBalanced && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-400 flex items-start gap-3 light-theme:text-indigo-800"
              >
                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Perfectly Balanced:</span> Every rupee is accounted for. Your planned expenses and savings targets exactly equal your monthly income.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Category Cards builder */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light border border-gray-800/40 space-y-5">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3 light-theme:border-gray-202">
                  <h3 className="text-md font-bold text-white light-theme:text-gray-900 flex items-center gap-1.5">
                    <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                    Expense Allocations Builder
                  </h3>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <PlusCircle className="h-4.5 w-4.5" />
                    {showAddForm ? 'Cancel Custom' : 'Add Custom Category'}
                  </button>
                </div>

                {/* Add Custom category form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddCustomCategory}
                      className="p-4 rounded-2xl bg-gray-950/60 border border-gray-850 space-y-3 overflow-hidden light-theme:bg-gray-50 light-theme:border-gray-205"
                    >
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Create Custom Category Allocation</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. ELSS SIP, Rent, Maid"
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          className="px-3.5 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                        />
                        <div className="relative">
                          <span className="absolute left-3.5 top-2 text-xs font-bold text-indigo-400">₹</span>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="0"
                            value={newCatAmount}
                            onChange={e => setNewCatAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-xs px-4 py-2 transition-all"
                      >
                        Insert Category Card
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Grid list of categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
                  {Object.keys(expenseBreakdown).map(catName => {
                    const amt = expenseBreakdown[catName];
                    return (
                      <div key={catName} className="p-3.5 rounded-2xl bg-gray-955/40 border border-gray-900 flex justify-between items-center text-xs group hover:border-gray-800 transition-all light-theme:bg-gray-50/50 light-theme:border-gray-202">
                        <div className="space-y-1.5 flex-1 pr-4">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-gray-300 light-theme:text-gray-700">{catName}</span>
                            <span className="text-indigo-400">
                              {formatAmount(amt, baseCurrency)}
                            </span>
                          </div>
                          {/* Range Slider */}
                          <input
                            type="range"
                            min="0"
                            max={monthlyIncome > 0 ? monthlyIncome * 0.7 : 50000}
                            step="500"
                            value={amt}
                            onChange={(e) => handleCategoryAmountChange(catName, e.target.value)}
                            className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 light-theme:bg-gray-200"
                          />
                        </div>

                        {/* Delete category button */}
                        <button
                          onClick={() => handleDeleteCategory(catName)}
                          className="p-2 text-gray-600 hover:text-rose-500 rounded-xl hover:bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* Right Column: Savings goal & Generation Trigger */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Target Savings Card */}
              <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light border border-gray-800/40 space-y-4">
                <h3 className="text-sm font-bold text-white light-theme:text-gray-900 flex items-center gap-1.5 border-b border-gray-850 pb-2 light-theme:border-gray-202">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                  Savings target Goal
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Monthly Savings Target</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs font-bold text-indigo-400">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 10000"
                        value={savingsGoal}
                        onChange={e => setSavingsGoal(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 text-xs text-white border border-gray-800 bg-gray-950 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate AI Monthly Plan Trigger Button */}
              <button
                onClick={triggerGeneratePlan}
                disabled={isOverdrawn}
                className="w-full py-4 rounded-2xl font-extrabold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:pointer-events-none bg-indigo-600 hover:bg-indigo-550 shadow-indigo-600/20"
              >
                <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                Generate AI Monthly Plan
              </button>

            </div>

          </div>

        </div>
      )}

      {/* 3. DYNAMIC RESULTS VIEW */}
      {plan && !loading && !prefillLoading && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Score gauge Card */}
            <div className="glass rounded-3xl p-5 glow-indigo flex flex-col items-center justify-between text-center light-theme:glass-light border border-gray-800/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Financial Health Score</h3>
              
              <div className="relative flex items-center justify-center my-3">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-gray-800 light-theme:stroke-gray-200 fill-transparent"
                    strokeWidth="5"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className={`fill-transparent ${getScoreBgColor(healthScore)}`}
                    strokeWidth="5"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: strokeOffset }}
                    transition={{ duration: 1 }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-white light-theme:text-gray-900">{healthScore}</span>
                  <span className="text-[9px] text-gray-500">/ 100</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className={`font-bold text-sm ${getScoreTextColor(healthScore)}`}>
                  {plan.scoreLabel || 'Healthy'}
                </p>
                <p className="text-[10px] text-gray-500 max-w-[200px] leading-normal">
                  Based on target savings ratio, active constraints, and budget buffers.
                </p>
              </div>
            </div>

            {/* Motivational quote card */}
            <div className="glass rounded-3xl p-6 border border-indigo-500/10 bg-indigo-500/5 text-gray-250 flex flex-col justify-center gap-3 relative overflow-hidden md:col-span-2 light-theme:glass-light">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
              
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-extrabold flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 animate-pulse" />
                Coach's Motivation
              </span>
              <p className="text-base font-medium leading-relaxed italic text-white light-theme:text-gray-855">
                "{plan.motivation}"
              </p>
            </div>

          </div>

          {/* Daily & Weekly Cap limits */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Daily limit */}
            <div className="glass rounded-3xl p-5 glow-indigo md:col-span-1 text-center border border-gray-800/40 light-theme:glass-light flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Daily Spending Limit</span>
              <span className="text-2xl font-black text-emerald-405">
                {formatAmount(plan.dailyLimit, baseCurrency)}
              </span>
              <span className="text-[10px] text-gray-550 block mt-1">discretionary cap</span>
            </div>

            {/* Weekly Spending Limits */}
            {plan.weeklyLimits && Object.keys(plan.weeklyLimits).map((weekKey, idx) => {
              const weekLim = plan.weeklyLimits[weekKey];
              return (
                <div key={idx} className="glass rounded-3xl p-5 glow-indigo md:col-span-1 text-center border border-gray-800/40 light-theme:glass-light flex flex-col justify-center items-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{weekKey} Limit</span>
                  <span className="text-xl font-bold text-white light-theme:text-gray-900">
                    {formatAmount(weekLim, baseCurrency)}
                  </span>
                  <span className="text-[9px] text-gray-550 mt-1 uppercase">max threshold</span>
                </div>
              );
            })}

          </div>

          {/* Budget Allocations summary & target progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* budget summary */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-2 light-theme:glass-light border border-gray-800/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-indigo-400" />
                Monthly Budget Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {plan.monthlyBudget && Object.keys(plan.monthlyBudget).map((catName, idx) => {
                  const alloc = plan.monthlyBudget[catName];
                  return (
                    <div key={idx} className="p-3 rounded-2xl bg-gray-955 border border-gray-900 flex justify-between items-center text-xs light-theme:bg-gray-50 light-theme:border-gray-202">
                      <span className="font-bold text-gray-305 light-theme:text-gray-700">{catName}</span>
                      <span className="font-black text-white light-theme:text-gray-950">
                        {formatAmount(alloc, baseCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Savings target goal card */}
            {targetSavingsGoal > 0 && (
              <div className="glass rounded-3xl p-6 glow-indigo md:col-span-1 light-theme:glass-light border border-gray-800/40 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                    Savings target Progress
                  </h3>
                  <p className="text-xs text-gray-550">Recommended planned savings compared with target goal milestones.</p>
                </div>

                <div className="my-6">
                  <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span className="text-gray-450 uppercase text-[10px]">Planned Goal Match</span>
                    <span className="text-white light-theme:text-gray-900">{savingsProgressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800/40 light-theme:bg-gray-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${savingsProgressPercent}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Target Goal:</span>
                    <span className="font-semibold text-white light-theme:text-gray-850">{formatAmount(targetSavingsGoal, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recommended:</span>
                    <span className="font-semibold text-emerald-450">{formatAmount(plannedSavings, baseCurrency)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Timeline checklists & Recommendations/warnings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Timeline checklists */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-1 light-theme:glass-light border border-gray-800/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                Weekly Planner Timeline
              </h3>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {plan.weeklyPlan && plan.weeklyPlan.map((weekData, idx) => (
                  <div key={idx} className="relative pl-5 border-l border-gray-850 light-theme:border-gray-202 text-xs space-y-2">
                    <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-indigo-600 border border-gray-950" />
                    <h4 className="font-bold text-white light-theme:text-gray-900 text-sm">{weekData.week}</h4>
                    <div className="space-y-1.5 text-gray-400 light-theme:text-gray-655">
                      {weekData.tasks && weekData.tasks.map((task, tIdx) => (
                        <div key={tIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations & Warnings alerts */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-2 light-theme:glass-light border border-gray-800/40 space-y-5">
              
              {/* Warnings */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-455 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Smart Warnings Alerts
                </h4>
                <div className="space-y-1.5">
                  {plan.warnings && plan.warnings.map((w, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 text-xs text-rose-200/90 flex items-start gap-2 light-theme:text-rose-800">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-indigo-400" />
                  Actionable AI Playbooks Recommendations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {plan.recommendations && plan.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-3 rounded-2xl bg-gray-955 border border-gray-900 text-xs text-gray-300 light-theme:bg-gray-50 light-theme:border-gray-202 light-theme:text-gray-700">
                      <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Context Chat panel */}
          <div className="glass rounded-3xl p-5 glow-indigo border border-gray-800/40 overflow-hidden light-theme:glass-light space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-800/40 pb-3 light-theme:border-gray-202">
              <MessageSquare className="h-5 w-5 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-white light-theme:text-gray-900">Ask AuraAI Advisor</h3>
                <span className="text-[10px] text-gray-550">Contextual financial intelligence</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 p-2 bg-gray-950/20 border border-gray-900 rounded-2xl light-theme:bg-gray-55/50 light-theme:border-gray-202">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-gray-955 border border-gray-850 text-gray-300 rounded-tl-none light-theme:bg-white light-theme:text-gray-700 light-theme:border-gray-250'
                  }`}>
                    <div className="space-y-1 whitespace-pre-line">
                      {msg.text.split('\n').map((line, lIdx) => {
                        if (line.startsWith('### ')) {
                          return <h4 key={lIdx} className="font-extrabold text-white light-theme:text-gray-900 mt-1 first:mt-0">{line.replace('### ', '')}</h4>;
                        }
                        return <p key={lIdx}>{line}</p>;
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-start">
                  <div className="p-3 rounded-2xl bg-gray-955 border border-gray-850 rounded-tl-none flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                    <span className="text-[10px] text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="space-y-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {presetQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(q)}
                    disabled={chatLoading}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-gray-800 hover:border-indigo-500 bg-gray-950 text-gray-400 hover:text-white transition-all whitespace-nowrap shrink-0 light-theme:bg-white light-theme:border-gray-250 light-theme:text-gray-655"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex items-center gap-2 border border-gray-805 bg-gray-955 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205">
                <input
                  type="text"
                  placeholder="Ask AuraAI about your plan..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-650 focus:outline-hidden light-theme:text-gray-900"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-550 transition-all disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Planner;
