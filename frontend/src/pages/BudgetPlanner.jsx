import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  BrainCircuit,
  Sparkles,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Clock,
  ArrowRight,
  RotateCcw,
  Search,
  CheckSquare,
  FileText,
  Trash,
  Move,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { CardSkeleton } from '../components/SkeletonLoader';

const BudgetPlanner = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'INR';

  // Tabs: 'create', 'history', 'comparison'
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Form Inputs State
  const [monthSelection, setMonthSelection] = useState(
    new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [currentSavings, setCurrentSavings] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [financialGoal, setFinancialGoal] = useState('Save Money');

  // Allocations Checklist
  const defaultAllocations = [
    { name: 'Rent', amount: 12000, position: 0 },
    { name: 'Food', amount: 6000, position: 1 },
    { name: 'Electricity', amount: 2500, position: 2 },
    { name: 'Water Bill', amount: 500, position: 3 },
    { name: 'Internet', amount: 900, position: 4 },
    { name: 'Transport', amount: 3000, position: 5 },
    { name: 'Fuel', amount: 2500, position: 6 },
    { name: 'Shopping', amount: 4000, position: 7 },
    { name: 'Entertainment', amount: 2000, position: 8 },
    { name: 'Medical', amount: 1500, position: 9 },
    { name: 'Mobile Recharge', amount: 1000, position: 10 },
    { name: 'EMI', amount: 3000, position: 11 },
    { name: 'Education', amount: 1500, position: 12 },
    { name: 'Investments', amount: 5000, position: 13 },
    { name: 'Savings', amount: 8000, position: 14 },
    { name: 'Others', amount: 3000, position: 15 }
  ];

  const [categories, setCategories] = useState(defaultAllocations);
  
  // Custom Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 2. Active AI Plan Response Output
  const [activePlan, setActivePlan] = useState(null);

  // 3. History State
  const [historyPlans, setHistoryPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
  
  // Comparison State
  const [compareIds, setCompareIds] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Drag and Drop State Handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const updated = [...categories];
    const [removed] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, removed);
    
    // Reset position order index
    const reordered = updated.map((item, idx) => ({
      ...item,
      position: idx
    }));
    setCategories(reordered);
  };

  // Form Value Handlers
  const handleCategoryAmountChange = (index, val) => {
    const numeric = parseFloat(val) || 0;
    const updated = [...categories];
    updated[index].amount = numeric;
    setCategories(updated);
  };

  const handleCategoryRename = (index, newName) => {
    const updated = [...categories];
    updated[index].name = newName;
    setCategories(updated);
  };

  const handleDeleteCategory = (index) => {
    const updated = categories.filter((_, idx) => idx !== index);
    setCategories(updated);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    const amount = parseFloat(newCatAmount) || 0;
    
    setCategories(prev => [
      ...prev,
      { name, amount, position: prev.length }
    ]);
    setNewCatName('');
    setNewCatAmount('');
    setShowAddForm(false);
  };

  // Calculations
  const totalAllocated = categories.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const remainingIncome = monthlyIncome - totalAllocated;
  const isOverdrawn = totalAllocated > monthlyIncome;
  const isBalanced = totalAllocated === monthlyIncome;

  // Retrieve History list
  const fetchHistoryPlans = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(`/budget-plans?search=${searchQuery}`);
      setHistoryPlans(response.data.plans || []);
    } catch (err) {
      console.error('[Budget Planner] History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryPlans();
    }
  }, [activeTab, searchQuery]);

  // Generate Plan Trigger
  const handleGeneratePlan = async () => {
    if (isOverdrawn) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/budget-plans', {
        monthlyIncome,
        currentSavings: parseFloat(currentSavings) || 0,
        savingsGoal: parseFloat(savingsGoal) || 0,
        financialGoal,
        monthSelection,
        expenseBreakdown: categories
      });

      setActivePlan(response.data.planDetails);
      setActiveTab('plan');
    } catch (err) {
      console.error('[Budget Planner] Generation failed:', err);
      setError(err.response?.data?.message || 'Failed to generate financial plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open Plan Details
  const handleOpenPlanDetails = async (planId) => {
    try {
      const response = await axios.get(`/budget-plans/${planId}`);
      setSelectedPlanDetails(response.data.plan);
    } catch (err) {
      console.error('[Budget Planner] Details fetch failed:', err);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this budget plan and AI analysis history?')) return;
    try {
      await axios.delete(`/budget-plans/${planId}`);
      setHistoryPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlanDetails?.id === planId) {
        setSelectedPlanDetails(null);
      }
    } catch (err) {
      console.error('[Budget Planner] Deletion failed:', err);
    }
  };

  // Compare Plans
  const handleToggleCompareId = (planId) => {
    setCompareIds(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      }
      if (prev.length >= 2) {
        return [prev[1], planId];
      }
      return [...prev, planId];
    });
  };

  const handleRunComparison = async () => {
    if (compareIds.length !== 2) return;
    setHistoryLoading(true);
    try {
      const response = await axios.get(`/budget-plans/compare/${compareIds[0]}/${compareIds[1]}`);
      setComparisonResult(response.data.comparison);
      setActiveTab('compare');
    } catch (err) {
      console.error('[Budget Planner] Comparison failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Radial Variables
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const healthScore = activePlan?.ai?.financialHealthScore || selectedPlanDetails?.ai?.financialHealthScore || 0;
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

  const plannedSavings = activePlan?.ai?.monthlyBudget?.['Savings'] || activePlan?.ai?.monthlyBudget?.['savings'] || 0;
  const targetSavingsGoal = parseFloat(activePlan?.savingsGoal) || 0;
  const savingsProgressPercent = targetSavingsGoal > 0 ? Math.min(100, (plannedSavings / targetSavingsGoal) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3 light-theme:border-gray-202">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight flex items-center gap-2">
            Budget Planner
            <Sliders className="text-indigo-400 h-7 w-7" />
          </h1>
          <p className="text-sm text-gray-550 mt-1">Configure parameters, arrange categories, and check AI-generated wealth recommendations.</p>
        </div>

        <div className="flex bg-gray-950 border border-gray-850 p-1.5 rounded-2xl gap-1.5 light-theme:bg-gray-105 light-theme:border-gray-202">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Budget
          </button>
          
          {(activePlan || selectedPlanDetails) && (
            <button
              onClick={() => {
                if (selectedPlanDetails) {
                  setActivePlan(selectedPlanDetails);
                }
                setActiveTab('plan');
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'plan'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Active Plan Output
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Plans History
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SKELETON LOADER */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <CardSkeleton className="h-96" />
          </div>
          <CardSkeleton className="lg:col-span-1" />
        </div>
      )}

      {/* TAB 1: CREATE BUDGET FORM */}
      {activeTab === 'create' && !loading && (
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Income Card */}
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

            {/* Total Allocated */}
            <div className="glass rounded-3xl p-5 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Allocated Total</span>
              <span className="text-2xl font-black text-white light-theme:text-gray-900">
                {formatAmount(totalAllocated, baseCurrency)}
              </span>
            </div>

            {/* Remaining Income */}
            <div className="glass rounded-3xl p-5 border border-gray-800/40 light-theme:glass-light flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Remaining Income</span>
              <span className={`text-2xl font-black ${remainingIncome < 0 ? 'text-rose-455 animate-pulse' : 'text-emerald-405'}`}>
                {formatAmount(remainingIncome, baseCurrency)}
              </span>
            </div>
          </div>

          {/* Real-time Validation Banners */}
          <AnimatePresence mode="wait">
            {isOverdrawn && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-start gap-3 light-theme:text-rose-800"
              >
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold">Income Overdrawn:</span> Your planned expenses exceed your monthly income by <span className="font-extrabold">{formatAmount(Math.abs(remainingBalance), baseCurrency)}</span>. Consider reducing category limits to balance the budget.
                </div>
              </motion.div>
            )}

            {!isOverdrawn && remainingIncome > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-405 flex items-start gap-3 light-theme:text-emerald-800"
              >
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Surplus Unallocated:</span> You still have <span className="font-extrabold">{formatAmount(remainingIncome, baseCurrency)}</span> available. Consider adding it to savings, emergency funds, or SIP investments.
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
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Perfectly Balanced:</span> Your allocations exactly equal your income. Ready to build the AI plan.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Configuration Form Workspaces */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Categories Allocations builder (Draggable) */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="glass rounded-3xl p-6 glow-indigo border border-gray-800/40 light-theme:glass-light space-y-5">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3 light-theme:border-gray-202">
                  <div>
                    <h3 className="text-md font-bold text-white light-theme:text-gray-900 flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-indigo-400" />
                      Budget Allocations Manager
                    </h3>
                    <span className="text-[10px] text-gray-500 mt-1 block">Drag handles to re-order. Click names to edit labels.</span>
                  </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-350"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {showAddForm ? 'Cancel' : 'Add Category'}
                  </button>
                </div>

                {/* Add Category Card */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddCategory}
                      className="p-4 rounded-2xl bg-gray-950/60 border border-gray-850 space-y-3 overflow-hidden light-theme:bg-gray-50 light-theme:border-gray-205"
                    >
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Create custom allocation</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Category Name"
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          className="px-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-indigo-400">₹</span>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Amount"
                            value={newCatAmount}
                            onChange={e => setNewCatAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-xs px-4 py-2"
                      >
                        Insert Category Card
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Draggable grid wrapper */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {categories.map((item, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="p-3 rounded-2xl bg-gray-955/40 border border-gray-900 flex justify-between items-center group hover:border-gray-800 transition-all light-theme:bg-gray-50/50 light-theme:border-gray-202 cursor-grab"
                    >
                      <div className="flex items-center gap-2 flex-1 pr-3">
                        {/* Drag Handle */}
                        <Move className="h-4 w-4 text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                        
                        {/* Inline rename input */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleCategoryRename(idx, e.target.value)}
                          className="bg-transparent font-bold text-xs text-gray-300 light-theme:text-gray-700 border-none focus:outline-hidden focus:bg-gray-950/40 rounded-sm w-28 px-1 light-theme:focus:bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Amount Edit */}
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-1.5 text-xs text-indigo-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={e => handleCategoryAmountChange(idx, e.target.value)}
                            className="w-full pl-6 pr-1.5 py-1 text-xs font-black text-white bg-gray-955 border border-gray-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-right light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-950"
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCategory(idx)}
                          className="p-1 text-gray-600 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Right Column: Goal settings & Plan Triggers */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Savings Targets */}
              <div className="glass rounded-3xl p-6 border border-gray-800/40 light-theme:glass-light space-y-4">
                <h3 className="text-sm font-bold text-white light-theme:text-gray-900 border-b border-gray-850 pb-2 light-theme:border-gray-202 flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                  Savings target Goals
                </h3>

                <div className="space-y-3.5">
                  
                  {/* Current Savings */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Current savings cash</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-400">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        value={currentSavings}
                        onChange={e => setCurrentSavings(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Savings Goal */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Savings Target</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-400">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 10000"
                        value={savingsGoal}
                        onChange={e => setSavingsGoal(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Financial Goal */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Financial Goal Focus</label>
                    <select
                      value={financialGoal}
                      onChange={e => setFinancialGoal(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                    >
                      {['Save Money', 'Buy a Laptop', 'Buy a Bike', 'Trip', 'Emergency Fund', 'Education', 'Investment', 'Wedding', 'House', 'Other'].map(g => (
                        <option key={g} value={g} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month selection */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Planning Month</label>
                    <select
                      value={monthSelection}
                      onChange={e => setMonthSelection(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-955 border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">{m}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Generate AI Plan Action */}
              <button
                onClick={handleGeneratePlan}
                disabled={isOverdrawn}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/15 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                Generate AI Budget Plan
              </button>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ACTIVE AI PLAN RESPONSE VIEW */}
      {activeTab === 'plan' && activePlan && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Score Radial gauge */}
            <div className="glass rounded-3xl p-5 glow-indigo flex flex-col items-center justify-between text-center border border-gray-800/40 light-theme:glass-light">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Financial Health</h3>
              
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
                  {activePlan.ai?.scoreLabel || 'Healthy'}
                </p>
                <p className="text-[10px] text-gray-505 leading-normal max-w-[190px] mx-auto">
                  Based on target savings ratio, active constraints, and budget buffers.
                </p>
              </div>
            </div>

            {/* Motivational message banner */}
            <div className="glass rounded-3xl p-6 border border-indigo-500/10 bg-indigo-500/5 text-gray-250 flex flex-col justify-center gap-3 relative overflow-hidden md:col-span-2 light-theme:glass-light">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
              
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-extrabold flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 animate-pulse" />
                Wealth Coach Assessment
              </span>
              <p className="text-base font-medium leading-relaxed italic text-white light-theme:text-gray-850">
                "{activePlan.ai?.motivation || activePlan.ai?.summary}"
              </p>
            </div>

          </div>

          {/* Daily & Weekly Cap limits */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Daily limit */}
            <div className="glass rounded-3xl p-5 glow-indigo md:col-span-1 text-center border border-gray-800/40 light-theme:glass-light flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Daily Spending Limit</span>
              <span className="text-2xl font-black text-emerald-405">
                {formatAmount(activePlan.ai?.dailyLimit || 0, baseCurrency)}
              </span>
              <span className="text-[10px] text-gray-550 block mt-1">discretionary cap</span>
            </div>

            {/* Weekly Spending Limits */}
            {activePlan.ai?.weeklyLimits && Object.keys(activePlan.ai.weeklyLimits).map((weekKey, idx) => {
              const weekLim = activePlan.ai.weeklyLimits[weekKey];
              return (
                <div key={idx} className="glass rounded-3xl p-5 glow-indigo md:col-span-1 text-center border border-gray-800/40 light-theme:glass-light flex flex-col justify-center items-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{weekKey} Limit</span>
                  <span className="text-xl font-bold text-white light-theme:text-gray-900">
                    {formatAmount(weekLim, baseCurrency)}
                  </span>
                  <span className="text-[9px] text-gray-555 mt-1 uppercase">max threshold</span>
                </div>
              );
            })}

          </div>

          {/* budget summary allocations & targets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Allocations list */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-2 light-theme:glass-light border border-gray-800/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-indigo-400" />
                Monthly Budget Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {activePlan.categories && activePlan.categories.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-gray-955 border border-gray-900 flex justify-between items-center text-xs light-theme:bg-gray-50 light-theme:border-gray-202">
                    <span className="font-bold text-gray-305 light-theme:text-gray-700">{item.name}</span>
                    <span className="font-black text-white light-theme:text-gray-950">
                      {formatAmount(item.amount, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Goal progress */}
            {activePlan.savingsGoal > 0 && (
              <div className="glass rounded-3xl p-6 glow-indigo md:col-span-1 light-theme:glass-light border border-gray-800/40 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                    Savings target Progress
                  </h3>
                  <p className="text-xs text-gray-550 font-sans leading-relaxed">AI Recommended savings compared against your savings goals.</p>
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
                    <span className="font-semibold text-white light-theme:text-gray-850">{formatAmount(activePlan.savingsGoal, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recommended:</span>
                    <span className="font-semibold text-emerald-450">{formatAmount(plannedSavings, baseCurrency)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Checklist & AI Advices recommendations/warnings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Checklist */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-1 light-theme:glass-light border border-gray-800/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                Monthly Checklist
              </h3>

              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {activePlan.ai?.weeklyPlan && activePlan.ai.weeklyPlan.map((weekData, idx) => (
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

            {/* AI Advice */}
            <div className="glass rounded-3xl p-6 glow-indigo md:col-span-2 light-theme:glass-light border border-gray-800/40 space-y-5">
              
              {/* Warnings */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-455 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Budget Warnings Alerts
                </h4>
                <div className="space-y-1.5">
                  {activePlan.ai?.warnings && activePlan.ai.warnings.map((w, idx) => (
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
                  Personalized Financial Advice
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {activePlan.ai?.recommendations && activePlan.ai.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-3 rounded-2xl bg-gray-955 border border-gray-900 text-xs text-gray-300 light-theme:bg-gray-50 light-theme:border-gray-202 light-theme:text-gray-700">
                      <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 3: PLANNER HISTORY LIST */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Action header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-550" />
              <input
                type="text"
                placeholder="Search plans by month..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-950 border border-gray-850 rounded-2xl text-white placeholder-gray-650 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 light-theme:bg-white light-theme:border-gray-205 light-theme:text-gray-900"
              />
            </div>

            {compareIds.length === 2 && (
              <button
                onClick={handleRunComparison}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
              >
                <Layers className="h-4 w-4" />
                Compare Selected Months
              </button>
            )}
          </div>

          {historyLoading && (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-7 w-7 text-indigo-400 animate-spin" />
            </div>
          )}

          {!historyLoading && historyPlans.length === 0 && (
            <div className="text-center py-20 glass rounded-3xl light-theme:glass-light">
              <FileText className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-550">No previous plans found in database history.</p>
            </div>
          )}

          {!historyLoading && historyPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* History list left grid */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {historyPlans.map((planItem) => (
                    <div
                      key={planItem.id}
                      onClick={() => handleOpenPlanDetails(planItem.id)}
                      className={`p-5 rounded-3xl border text-xs space-y-4 hover:border-indigo-500 cursor-pointer transition-all ${
                        selectedPlanDetails?.id === planItem.id
                          ? 'bg-indigo-500/5 border-indigo-500'
                          : 'bg-gray-955/40 border-gray-900 light-theme:bg-gray-50/50 light-theme:border-gray-202'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-sm text-white light-theme:text-gray-900">{planItem.month_selection} Plan</h4>
                          <span className="text-[10px] text-gray-550">{new Date(planItem.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(planItem.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleCompareId(planItem.id);
                            }}
                            className="rounded border-gray-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Compare</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                        <div className="p-2 rounded-xl bg-gray-950/40 border border-gray-900/60 light-theme:bg-gray-105">
                          <span className="text-[9px] text-gray-550 block uppercase">Income</span>
                          <span className="font-bold text-white light-theme:text-gray-850">{formatAmount(planItem.monthly_income, baseCurrency)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-950/40 border border-gray-900/60 light-theme:bg-gray-105">
                          <span className="text-[9px] text-gray-550 block uppercase">Score</span>
                          <span className="font-bold text-indigo-400">{planItem.health_score || 0}/100</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-850 light-theme:border-gray-202">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Goal: {planItem.financial_goal}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlan(planItem.id);
                          }}
                          className="p-1 text-gray-600 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* History Details Right pane */}
              <div className="md:col-span-1">
                {selectedPlanDetails ? (
                  <div className="glass rounded-3xl p-6 border border-gray-800/40 light-theme:glass-light space-y-6">
                    <div>
                      <h3 className="text-md font-bold text-white light-theme:text-gray-900">{selectedPlanDetails.monthSelection} Details</h3>
                      <p className="text-[10px] text-gray-550 mt-0.5">Budget allocations and AI advisor insights.</p>
                    </div>

                    {/* Circular Score */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-950/20 border border-gray-900 light-theme:bg-gray-50 light-theme:border-gray-202">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="24" className="stroke-gray-800 light-theme:stroke-gray-200 fill-transparent" strokeWidth="4" />
                          <circle cx="32" cy="32" r="24" className={`fill-transparent ${getScoreBgColor(healthScore)}`} strokeWidth="4" strokeDasharray={2*Math.PI*24} strokeDashoffset={2*Math.PI*24 - (healthScore / 100) * (2*Math.PI*24)} />
                        </svg>
                        <div className="absolute text-xs font-black text-white light-theme:text-gray-900">{healthScore}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Health score Label</span>
                        <span className={`font-bold text-xs ${getScoreTextColor(healthScore)}`}>{selectedPlanDetails.ai?.scoreLabel}</span>
                      </div>
                    </div>

                    {/* Quick limits */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-2xl bg-gray-950/20 border border-gray-900 light-theme:bg-gray-50">
                        <span className="text-[9px] text-gray-550 block">DAILY SPENDING CAP</span>
                        <span className="font-bold text-white light-theme:text-gray-900">{formatAmount(selectedPlanDetails.ai?.dailyLimit || 0, baseCurrency)}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-950/20 border border-gray-900 light-theme:bg-gray-50">
                        <span className="text-[9px] text-gray-555 block">ALLOCATED TOTAL</span>
                        <span className="font-bold text-indigo-400">{formatAmount(selectedPlanDetails.totalAllocated || 0, baseCurrency)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActivePlan(selectedPlanDetails);
                        setActiveTab('plan');
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="h-4 w-4" />
                      View Full AI Dashboard
                    </button>

                  </div>
                ) : (
                  <div className="glass rounded-3xl p-10 border border-gray-800/40 text-center text-gray-500 light-theme:glass-light">
                    <Info className="h-7 w-7 text-gray-650 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs">Select any plan from the history list to inspect limits details.</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 4: COMPARE PLANS VIEW */}
      {activeTab === 'compare' && comparisonResult && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-white light-theme:text-gray-900">
              Comparing {comparisonResult.plan1.month} vs {comparisonResult.plan2.month}
            </h3>
            <button
              onClick={() => setActiveTab('history')}
              className="px-4 py-2 border border-gray-800 bg-gray-950 text-gray-400 hover:text-white rounded-xl text-xs transition-all light-theme:border-gray-205 light-theme:bg-white"
            >
              Back to History
            </button>
          </div>

          <div className="glass rounded-3xl p-6 glow-indigo border border-gray-800/40 light-theme:glass-light space-y-4">
            <div className="grid grid-cols-4 gap-4 text-xs font-bold uppercase tracking-wider text-gray-500 pb-2 border-b border-gray-850">
              <span className="col-span-1">Category name</span>
              <span className="col-span-1 text-right">{comparisonResult.plan1.month} (₹)</span>
              <span className="col-span-1 text-right">{comparisonResult.plan2.month} (₹)</span>
              <span className="col-span-1 text-right">Variance delta (₹)</span>
            </div>

            <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
              {comparisonResult.categories.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 text-xs items-center p-2 hover:bg-gray-950/20 rounded-xl transition-all light-theme:hover:bg-gray-50">
                  <span className="font-bold text-gray-300 light-theme:text-gray-700 col-span-1">{item.name}</span>
                  <span className="text-right text-gray-400 col-span-1">{formatAmount(item.p1Amount, baseCurrency)}</span>
                  <span className="text-right text-gray-400 col-span-1">{formatAmount(item.p2Amount, baseCurrency)}</span>
                  <span className={`text-right font-extrabold col-span-1 ${
                    item.diff > 0
                      ? 'text-rose-455'
                      : item.diff < 0
                        ? 'text-emerald-405'
                        : 'text-gray-500'
                  }`}>
                    {item.diff > 0 ? `+${formatAmount(item.diff, baseCurrency)}` : formatAmount(item.diff, baseCurrency)}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default BudgetPlanner;
