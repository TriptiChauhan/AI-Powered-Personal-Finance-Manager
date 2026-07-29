import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  BrainCircuit,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle2,
  TrendingUp,
  Activity,
  Lightbulb,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const AiAdvisor = ({ expensesCount }) => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'habits', 'forecast', 'budgets'

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const response = await axios.get('/ai/insights');
      setInsights(response.data);
    } catch (err) {
      console.error('AI insight retrieval failed:', err);
      setError(err.response?.data?.message || 'Could not compute AI budget recommendation.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [expensesCount]);

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 70) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />;
    }
  };

  const getRecommendationStyle = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-rose-500/5 border-rose-500/15 text-rose-200/90';
      case 'success':
        return 'bg-emerald-500/5 border-emerald-500/15 text-emerald-200/90';
      default:
        return 'bg-indigo-500/5 border-indigo-500/15 text-indigo-200/90';
    }
  };

  return (
    <div className="glass rounded-3xl p-6 glow-indigo relative overflow-hidden light-theme:glass-light">
      {/* Background glow overlay */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800/50 pb-4 mb-5 light-theme:border-gray-200 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-650">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-semibold text-white light-theme:text-gray-900 flex items-center gap-1.5">
            AI Financial Advisor
            <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
          </h3>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Refresh button */}
          <button
            onClick={() => fetchInsights(true)}
            disabled={loading || refreshing}
            className="rounded-xl border border-gray-800 p-2 text-gray-400 hover:text-white hover:bg-gray-800/40 transition-all disabled:opacity-50 light-theme:border-gray-205 light-theme:hover:bg-gray-100 light-theme:text-gray-600"
            title="Refresh Insights"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-gray-500">AI is auditing transaction registers...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
          {error}
        </div>
      ) : insights ? (
        <div className="space-y-5">
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-1 bg-gray-950/60 p-1 rounded-2xl border border-gray-800/50 light-theme:bg-gray-100 light-theme:border-gray-202">
            {[
              { id: 'overview', label: 'Overview', icon: ShieldCheck },
              { id: 'habits', label: 'Habits & Leaks', icon: Activity },
              { id: 'forecast', label: 'Forecast', icon: TrendingUp },
              { id: 'budgets', label: 'Tips & Budgets', icon: Lightbulb }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white light-theme:text-gray-650 light-theme:hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-5"
              >
                {/* Dashboard Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Score Card */}
                  <div className={`rounded-2xl border p-4 flex items-center justify-between ${getScoreColor(insights.financialHealthScore)}`}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Health Index</p>
                      <p className="text-2xl font-extrabold mt-1">{insights.financialHealthScore} <span className="text-sm font-normal text-gray-500">/ 100</span></p>
                    </div>
                    <ShieldCheck className="h-10 w-10 opacity-70" />
                  </div>

                  {/* Savings projection card */}
                  <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 flex items-center justify-between text-teal-400">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Projected Savings</p>
                      <p className="text-2xl font-extrabold mt-1">
                        +{formatAmount(insights.projectedSavings, baseCurrency)}
                        <span className="text-xs font-normal text-gray-500 block">estimated monthly saving</span>
                      </p>
                    </div>
                    <TrendingDown className="h-10 w-10 opacity-70" />
                  </div>
                </div>

                {/* AI Summary Text */}
                <div className="rounded-2xl bg-gray-950/40 p-4 border border-gray-800/40 text-sm leading-relaxed text-gray-300 light-theme:bg-gray-50 light-theme:border-gray-200 light-theme:text-gray-750">
                  <span className="font-semibold text-indigo-400 light-theme:text-indigo-650">Summary Analysis:</span> {insights.summary}
                </div>

                {/* Actionable Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Quick Recommendations</h4>
                  {insights.recommendations && insights.recommendations.length > 0 ? (
                    insights.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 rounded-2xl border p-3.5 text-xs font-sans leading-relaxed ${getRecommendationStyle(rec.type)}`}
                      >
                        {getRecommendationIcon(rec.type)}
                        <div>
                          <span className="font-semibold text-white light-theme:text-gray-900 block mb-0.5">{rec.category}</span>
                          <span className="light-theme:text-gray-700">{rec.message}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">No general suggestions available at this time.</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'habits' && (
              <motion.div
                key="habits"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-5"
              >
                {/* Spending Habits Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spending Habits & Triggers</h4>
                  <div className="space-y-2">
                    {insights.spendingHabits && insights.spendingHabits.length > 0 ? (
                      insights.spendingHabits.map((habit, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-2xl border border-gray-800/40 bg-gray-950/20 text-xs text-gray-300 light-theme:border-gray-200 light-theme:bg-gray-50 light-theme:text-gray-700">
                          <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span>{habit}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">No habit trends compiled yet.</p>
                    )}
                  </div>
                </div>

                {/* Leakage Check Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Unnecessary Leakage Audits
                  </h4>
                  <div className="space-y-2">
                    {insights.unnecessarySpending && insights.unnecessarySpending.length > 0 ? (
                      insights.unnecessarySpending.map((leak, i) => (
                        <div key={i} className="p-3 rounded-2xl border border-rose-500/10 bg-rose-500/5 text-xs flex justify-between items-start gap-3">
                          <div>
                            <span className="font-semibold text-white light-theme:text-gray-900 block mb-0.5">{leak.item}</span>
                            <span className="text-[11px] text-gray-400 block">{leak.message}</span>
                          </div>
                          <span className="font-extrabold text-rose-400 shrink-0">
                            {formatAmount(leak.amount, baseCurrency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>No convenience leakages or duplicate subscriptions detected in recent audits!</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'forecast' && (
              <motion.div
                key="forecast"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-5"
              >
                {/* Predictions Card */}
                <div className="p-5 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Next Month Prediction</h4>
                      <p className="text-3xl font-black text-white light-theme:text-indigo-950 mt-1">
                        {insights.monthlyPrediction ? formatAmount(insights.monthlyPrediction.amount, baseCurrency) : formatAmount(0, baseCurrency)}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                      insights.monthlyPrediction?.confidence === 'high'
                        ? 'text-emerald-450 border-emerald-500/20 bg-emerald-500/10'
                        : insights.monthlyPrediction?.confidence === 'medium'
                        ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                        : 'text-gray-400 border-gray-800 bg-gray-900'
                    }`}>
                      {insights.monthlyPrediction?.confidence || 'low'} Confidence
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed light-theme:text-gray-700">
                    {insights.monthlyPrediction?.message || 'Ledger histories are expanding. Forecast curves will initialize shortly.'}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'budgets' && (
              <motion.div
                key="budgets"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-5"
              >
                {/* Budget Adjustments Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recommended Category Budgets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.budgetRecommendations && insights.budgetRecommendations.length > 0 ? (
                      insights.budgetRecommendations.map((bRec, i) => (
                        <div key={i} className="p-3.5 rounded-2xl border border-gray-800/40 bg-gray-950/20 text-xs space-y-2.5 light-theme:border-gray-202 light-theme:bg-gray-50">
                          <span className="font-bold text-white light-theme:text-gray-900 block">{bRec.category}</span>
                          <div className="flex justify-between items-center text-[11px] text-gray-400">
                            <span>Current: {formatAmount(bRec.currentSpent, baseCurrency)}</span>
                            <span className="text-indigo-400 font-bold">Suggested Limit: {formatAmount(bRec.recommendedLimit, baseCurrency)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-550 col-span-2">No category-specific budget limits to recommend yet.</p>
                    )}
                  </div>
                </div>

                {/* Savings suggestions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actionable Savings Tips</h4>
                  <div className="space-y-2">
                    {insights.savingsSuggestions && insights.savingsSuggestions.length > 0 ? (
                      insights.savingsSuggestions.map((sSugg, i) => (
                        <div key={i} className="p-3.5 rounded-2xl border border-teal-500/10 bg-teal-500/5 text-xs flex justify-between items-start gap-4">
                          <div>
                            <span className="font-bold text-teal-300 block mb-0.5">{sSugg.title}</span>
                            <span className="text-gray-300 light-theme:text-gray-700 leading-relaxed block">{sSugg.message}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md border border-teal-550/20 bg-teal-500/10 text-teal-400 font-bold shrink-0">
                            Save {formatAmount(sSugg.potentialSavings, baseCurrency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">Savings options are expanding. Keep adding transactions.</p>
                    )}
                  </div>
                </div>

                {/* General financial tips */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Smart Financial Tips</h4>
                  <div className="space-y-2">
                    {insights.financialTips && insights.financialTips.map((tip, i) => (
                      <div key={i} className="flex gap-2.5 items-start p-3 rounded-2xl bg-gray-900/20 border border-gray-800/40 text-xs text-gray-350 light-theme:bg-gray-50 light-theme:border-gray-202 light-theme:text-gray-700">
                        <Lightbulb className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        <div className="text-center text-sm text-gray-550 py-6">No advisory content available. Try reloading.</div>
      )}
    </div>
  );
};

export default AiAdvisor;
