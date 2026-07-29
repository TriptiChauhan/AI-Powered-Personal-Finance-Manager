import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  Layers,
  Search,
  Sliders,
  Award,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Send,
  HelpCircle,
  RefreshCw,
  PlusCircle,
  Trash2,
  Edit2,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  X,
  FileText,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { CardSkeleton } from '../components/SkeletonLoader';

const MoneyManager = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'INR';

  // Tabs: 'dashboard', 'registry', 'ai_advisor'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Inputs
  const [transactionType, setTransactionType] = useState('expense'); // 'income' or 'expense'
  const [amount, setAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedPmId, setSelectedPmId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [notes, setNotes] = useState('');

  // Dropdown Lists
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Modals for Custom Additions
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');

  const [showAddPmModal, setShowAddPmModal] = useState(false);
  const [newPmName, setNewPmName] = useState('');

  // Transaction details modal
  const [selectedTxDetails, setSelectedTxDetails] = useState(null);

  // Edit State
  const [editingTx, setEditingTx] = useState(null);

  // Aggregates & Charts
  const [stats, setStats] = useState({
    currentBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    savings: 0,
    monthlySpending: 0,
    recentTransactions: [],
    categoryBreakdown: [],
    monthlyTrend: [],
    weeklyTrend: []
  });

  // History Lists & Filters
  const [transactions, setTransactions] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterAmount, setFilterAmount] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');

  // AI Advisor
  const [aiReport, setAiReport] = useState(null);

  // AI Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: `Namaste ${user?.username || 'User'}! I am AuraAI, your wealth advisor. I can analyze your transaction registries, category bounds, and payment methods to optimize your balance. Ask me anything!`
    }
  ]);
  const chatEndRef = useRef(null);

  const fetchDropdowns = async () => {
    try {
      const [catRes, pmRes] = await Promise.all([
        axios.get('/money/categories'),
        axios.get('/money/payment-methods')
      ]);
      setCategories(catRes.data.categories || []);
      setPaymentMethods(pmRes.data.paymentMethods || []);

      // Autofill defaults
      const firstExpCat = catRes.data.categories?.find(c => c.type === 'expense');
      if (firstExpCat) setSelectedCatId(firstExpCat.id);
      
      const firstPm = pmRes.data.paymentMethods?.[0];
      if (firstPm) setSelectedPmId(firstPm.id);
    } catch (err) {
      console.error('[Money Manager] Dropdowns load failed:', err);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await axios.get('/money/dashboard');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('[Money Manager] Stats fetch failed:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/money/transactions', {
        params: {
          page: historyPage,
          limit: 10,
          search: searchQuery,
          type: filterType,
          categoryId: filterCategory,
          paymentMethodId: filterPayment,
          startDate: filterStartDate,
          endDate: filterEndDate,
          month: filterMonth,
          year: filterYear,
          amount: filterAmount,
          sortBy,
          sortOrder
        }
      });
      if (response.data.success) {
        setTransactions(response.data.transactions);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err) {
      console.error('[Money Manager] Logs fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'registry') {
      fetchHistory();
    }
  }, [
    activeTab,
    historyPage,
    searchQuery,
    filterType,
    filterCategory,
    filterPayment,
    filterMonth,
    filterYear,
    filterStartDate,
    filterEndDate,
    filterAmount,
    sortBy,
    sortOrder
  ]);

  // Adjust categories automatically when transaction type toggles
  useEffect(() => {
    if (categories.length > 0) {
      const targetCat = categories.find(c => c.type === transactionType);
      if (targetCat) {
        setSelectedCatId(targetCat.id);
      }
    }
  }, [transactionType]);

  // Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const response = await axios.post('/money/categories', {
        name: newCatName.trim(),
        type: newCatType
      });
      if (response.data.success) {
        const created = response.data.category;
        setCategories(prev => [...prev, created]);
        setSelectedCatId(created.id);
        setNewCatName('');
        setShowAddCatModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category.');
    }
  };

  // Create Payment Method
  const handleCreatePaymentMethod = async (e) => {
    e.preventDefault();
    if (!newPmName.trim()) return;

    try {
      const response = await axios.post('/money/payment-methods', {
        name: newPmName.trim()
      });
      if (response.data.success) {
        const created = response.data.paymentMethod;
        setPaymentMethods(prev => [...prev, created]);
        setSelectedPmId(created.id);
        setNewPmName('');
        setShowAddPmModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create payment method.');
    }
  };

  // Submit Transaction
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please provide a valid transaction amount.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        amount,
        categoryId: selectedCatId,
        paymentMethodId: selectedPmId,
        date,
        time,
        notes
      };

      if (editingTx) {
        await axios.put(`/money/transaction/${editingTx.id}`, {
          ...payload,
          type: transactionType
        });
        setEditingTx(null);
      } else {
        const endpoint = transactionType === 'income' ? '/money/income' : '/money/expense';
        await axios.post(endpoint, payload);
      }

      setAmount('');
      setNotes('');
      fetchStats();
      if (activeTab === 'registry') {
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving transaction details.');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleStartEdit = (tx) => {
    setEditingTx(tx);
    setTransactionType(tx.type);
    setAmount(tx.amount);
    setDate(tx.date.substring(0, 10));
    setTime(tx.time ? tx.time.substring(0, 5) : '12:00');
    setNotes(tx.notes || '');
    setSelectedCatId(tx.category_id || '');
    setSelectedPmId(tx.payment_method_id || '');
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm('Delete this transaction record?')) return;
    setLoading(true);
    try {
      await axios.delete(`/money/transaction/${id}?type=${transactionType}`);
      fetchStats();
      if (activeTab === 'registry') {
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setAdvisorLoading(true);
    try {
      const response = await axios.post('/money/ai/analyze');
      setAiReport(response.data.report);
    } catch (err) {
      console.error(err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleSendChatMessage = async (msgText) => {
    const textToSend = msgText || chatInput;
    if (!textToSend.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await axios.post('/money/ai/chat', { question: textToSend });
      setChatHistory(prev => [...prev, { sender: 'ai', text: response.data.answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'Error compiling response.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Amount (INR)', 'Category', 'Payment Method', 'Notes'];
    const csvRows = [headers.join(',')];
    transactions.forEach(t => {
      csvRows.push([
        t.date,
        t.time || 'N/A',
        t.type.toUpperCase(),
        t.amount,
        `"${t.category}"`,
        t.payment_method,
        `"${t.notes || ''}"`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Statement</title>
          <style>
            body { font-family: sans-serif; padding: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .income { color: #10b981; font-weight: bold; }
            .expense { color: #ef4444; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Transaction Statement</h2>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td>${t.time || 'N/A'}</td>
                  <td>${t.type.toUpperCase()}</td>
                  <td>${t.category}</td>
                  <td>${t.payment_method}</td>
                  <td class="${t.type}">₹${t.amount}</td>
                  <td>${t.notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#eab308', '#06b6d4', '#d946ef', '#a855f7', '#f97316'];
  const presetQuestions = ["Can I buy a phone this month?", "Where am I overspending?", "How much should I save?", "Where should I invest?"];

  // Radial Variables
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const healthScore = aiReport?.financialHealthScore || 0;
  const strokeOffset = circ - (healthScore / 100) * circ;

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 50) return 'stroke-yellow-500';
    return 'stroke-rose-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white transition-colors duration-200">
      
      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-center gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Balance</span>
            <Wallet className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          <span className={`text-2xl font-black ${stats.currentBalance < 0 ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
            {formatAmount(stats.currentBalance, baseCurrency)}
          </span>
        </div>

        {/* Income */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 flex flex-col justify-center gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Income</span>
            <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatAmount(stats.totalIncome, baseCurrency)}
          </span>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 flex flex-col justify-center gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Expenses</span>
            <TrendingDown className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatAmount(stats.totalExpenses, baseCurrency)}
          </span>
        </div>

        {/* Savings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 flex flex-col justify-center gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Savings</span>
            <PiggyBank className="h-4.5 w-4.5 text-cyan-500" />
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {formatAmount(stats.savings, baseCurrency)}
          </span>
        </div>
      </div>

      {/* TABS HEADERS */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-950 border border-gray-250 dark:border-gray-850 p-1 rounded-2xl">
          {['dashboard', 'registry', 'ai_advisor'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all capitalize ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SKELETON LOADERS */}
      {statsLoading && activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton className="lg:col-span-2 h-72" />
          <CardSkeleton className="h-72" />
        </div>
      )}

      {/* A. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && !statsLoading && (
        <div className="space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expenses Chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs lg:col-span-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Monthly Income vs Outflows</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#111' }} className="dark:!bg-gray-950 dark:!border-gray-800 dark:!color-white" />
                    <Legend />
                    <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses Distribution */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs lg:col-span-1 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Categories Share</h3>
              <div className="h-64 w-full flex items-center justify-center relative">
                {stats.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {stats.categoryBreakdown.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-gray-500">No expense records.</span>
                )}
              </div>
            </div>
          </div>

          {/* Weekly bar & Recents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly trends */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Weekly Outlays (Last 7 Days)</h3>
              <div className="h-60 w-full">
                {stats.weeklyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                      <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-500">
                    No logs found.
                  </div>
                )}
              </div>
            </div>

            {/* Recent list */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent transaction registers</h3>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 dark:text-white">{tx.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">
                          {tx.date} &bull; {tx.payment_method}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-gray-500">
                    No transactions registered yet.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* B. LEDGER & REGISTRY VIEW */}
      {activeTab === 'registry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Forms */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-950 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2.5 flex items-center gap-1.5">
                <Sliders className="h-4.5 w-4.5 text-indigo-500" />
                {editingTx ? 'Modify Transaction Log' : 'Record Outlays / Inflows'}
              </h3>

              {!editingTx && (
                <div className="flex bg-gray-100 dark:bg-gray-950 p-1 rounded-xl border border-gray-200 dark:border-gray-850">
                  <button
                    onClick={() => setTransactionType('expense')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      transactionType === 'expense'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    onClick={() => setTransactionType('income')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                      transactionType === 'income'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Income
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
                
                {/* Amount */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-indigo-500">₹</span>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 text-xs bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">
                    <span>Category</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatType(transactionType);
                        setShowAddCatModal(true);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                    >
                      + Add New
                    </button>
                  </div>
                  <select
                    value={selectedCatId}
                    onChange={e => setSelectedCatId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    {categories
                      .filter(c => c.type === transactionType)
                      .map(c => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Payment Method dropdown */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">
                    <span>Payment Method</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPmModal(true)}
                      className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                    >
                      + Add New
                    </button>
                  </div>
                  <select
                    value={selectedPmId}
                    onChange={e => setSelectedPmId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    {paymentMethods.map(p => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-gray-955 text-gray-900 dark:text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase">Notes / Remarks</label>
                  <textarea
                    placeholder="Enter notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-98"
                  >
                    {editingTx ? 'Update Record' : 'Record Transaction'}
                  </button>
                  {editingTx && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTx(null);
                        setAmount('');
                        setNotes('');
                      }}
                      className="px-4 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>

              </form>

            </div>
          </div>

          {/* Logs History Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-5">
              
              {/* Search & Export Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs notes, categories..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setHistoryPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 rounded-xl text-gray-900 dark:text-white placeholder-gray-405 dark:placeholder-gray-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all bg-white dark:bg-gray-950"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all bg-white dark:bg-gray-950"
                  >
                    <Printer className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Filters Pane */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                
                {/* Type filter */}
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">TYPE</span>
                  <select
                    value={filterType}
                    onChange={e => { setFilterType(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 p-2 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">All Types</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expense Only</option>
                  </select>
                </div>

                {/* Category filter */}
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">CATEGORY</span>
                  <select
                    value={filterCategory}
                    onChange={e => { setFilterCategory(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 p-2 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                {/* Month filter */}
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">MONTH</span>
                  <select
                    value={filterMonth}
                    onChange={e => { setFilterMonth(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 p-2 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">All Months</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Payment filter */}
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">PAYMENT</span>
                  <select
                    value={filterPayment}
                    onChange={e => { setFilterPayment(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 p-2 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">All Payments</option>
                    {paymentMethods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Amount and Dates Filter collapse */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] font-bold text-gray-505 dark:text-gray-400 pt-1">
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">EXACT AMOUNT (₹)</span>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={filterAmount}
                    onChange={e => { setFilterAmount(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-805 p-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">START DATE</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={e => { setFilterStartDate(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 p-1.5 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <span className="uppercase text-[9px] text-gray-400 block">END DATE</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={e => { setFilterEndDate(e.target.value); setHistoryPage(1); }}
                    className="w-full bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-805 p-1.5 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* History list logs */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 flex justify-between items-center text-xs group hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                      <div className="space-y-1 flex-1 pr-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-gray-950 dark:text-white">{tx.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {tx.date} &bull; {tx.time ? tx.time.substring(0, 5) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                          Payment: {tx.payment_method} {tx.notes && `| Remarks: "${tx.notes}"`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, baseCurrency)}
                        </span>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => setSelectedTxDetails(tx)}
                            className="p-1.5 text-gray-450 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-200/50 dark:bg-gray-900 rounded-lg"
                            title="View Details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(tx)}
                            className="p-1.5 text-gray-450 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-200/50 dark:bg-gray-900 rounded-lg"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 text-gray-450 hover:text-rose-600 dark:hover:text-rose-500 bg-gray-200/50 dark:bg-gray-900 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-xs text-gray-500">
                    No transactions matched search criteria.
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Page {historyPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      disabled={historyPage === 1}
                      className="p-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setHistoryPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={historyPage === totalPages}
                      className="p-2 bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* C. AI ADVISOR VIEW */}
      {activeTab === 'ai_advisor' && (
        <div className="space-y-6">
          {/* Analyze banner */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-md font-bold text-gray-950 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                <BrainCircuit className="h-5 w-5 text-indigo-500 animate-pulse" />
                AI Wallet Advisory Coach
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Generates budget score summaries, weekly planners, and custom savings checkmarks.</p>
            </div>
            
            <button
              onClick={handleGenerateReport}
              disabled={advisorLoading}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {advisorLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Advice...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                  Request AI Audit Report
                </>
              )}
            </button>
          </div>

          {/* Advisor report */}
          {aiReport && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* health radial score */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 flex flex-col items-center justify-between text-center shadow-xs">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Financial Score</h4>
                  <div className="relative flex items-center justify-center my-2">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r={radius} className="stroke-gray-105 dark:stroke-gray-800 fill-transparent" strokeWidth="5" />
                      <circle cx="48" cy="48" r={radius} className={`fill-transparent ${getScoreBgColor(healthScore)}`} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={strokeOffset} />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-black text-gray-950 dark:text-white">{healthScore}</span>
                      <span className="text-[9px] text-gray-500">/ 100</span>
                    </div>
                  </div>
                  <span className={`font-bold text-xs ${getScoreTextColor(healthScore)}`}>
                    {aiReport.scoreLabel || 'Healthy'}
                  </span>
                </div>

                {/* Motivations */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 text-gray-600 dark:text-gray-200 flex flex-col justify-center gap-3 relative overflow-hidden md:col-span-2 shadow-xs">
                  <div className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 bg-indigo-500/10 rounded-full blur-2xl" />
                  <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                    <Award className="h-4.5 w-4.5 animate-pulse" />
                    Wealth Coach Advice
                  </span>
                  <p className="text-base font-medium leading-relaxed italic text-gray-900 dark:text-white">
                    "{aiReport.motivation || aiReport.summary}"
                  </p>
                </div>

              </div>

              {/* daily limits */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 text-center flex flex-col justify-center items-center shadow-xs">
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Daily Cap Limit</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatAmount(aiReport.dailyLimit || 0, baseCurrency)}
                  </span>
                </div>
                {aiReport.weeklyLimits && Object.keys(aiReport.weeklyLimits).map((weekKey, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 text-center flex flex-col justify-center items-center shadow-xs">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">{weekKey} Limit</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatAmount(aiReport.weeklyLimits[weekKey], baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* recommendations & warnings checklists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* weekly check list */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-950 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                    Monthly Checklist
                  </h3>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {aiReport.weeklyPlan && aiReport.weeklyPlan.map((weekData, idx) => (
                      <div key={idx} className="relative pl-5 border-l border-gray-200 dark:border-gray-800 text-xs space-y-2">
                        <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-indigo-600 border border-white dark:border-gray-950" />
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs">{weekData.week}</h4>
                        <div className="space-y-1.5 text-gray-500 dark:text-gray-400">
                          {weekData.tasks && weekData.tasks.map((task, tIdx) => (
                            <div key={tIdx} className="flex items-start gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* warnings & playbook advice */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs md:col-span-2 space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Budget Warnings
                    </h4>
                    <div className="space-y-1.5">
                      {aiReport.warnings && aiReport.warnings.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-rose-200 dark:border-rose-950/20 bg-rose-50 dark:bg-rose-950/5 text-xs text-rose-800 dark:text-rose-300">
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Lightbulb className="h-4 w-4" />
                      Personalized wealth suggestions
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {aiReport.recommendations && aiReport.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-2 items-start p-3 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 text-xs text-gray-700 dark:text-gray-300">
                          <ChevronRight className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Context advisor Q&A Chat */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
              <BrainCircuit className="h-5 w-5 text-indigo-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-gray-950 dark:text-white">Ask AuraAI advisor</h3>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Contextual wallet playbooks Q&A</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 p-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-300 rounded-tl-none'
                  }`}>
                    <div className="space-y-1.5 whitespace-pre-line">
                      {msg.text.split('\n').map((line, lIdx) => {
                        if (line.startsWith('### ')) {
                          return <h4 key={lIdx} className="font-extrabold text-gray-900 dark:text-white mt-1 first:mt-0">{line.replace('### ', '')}</h4>;
                        }
                        return <p key={lIdx}>{line}</p>;
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-start">
                  <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-none flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-500 animate-spin" />
                    <span className="text-[10px] text-gray-500">AuraAI is auditing data...</span>
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
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-gray-300 dark:border-gray-800 hover:border-indigo-500 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all whitespace-nowrap shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex items-center gap-2 border border-gray-300 dark:border-gray-805 bg-white dark:bg-gray-955 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  type="text"
                  placeholder="Ask advisor (e.g. Can I afford a trip?)..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
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

      {/* MODALS SECTION */}

      {/* Add Custom Category Modal */}
      <AnimatePresence>
        {showAddCatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-850 rounded-3xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2.5">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Create Custom Category</h4>
                <button onClick={() => setShowAddCatModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Subscriptions, Gym"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Type</label>
                  <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="expense">Expense Category</option>
                    <option value="income">Income Category</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold rounded-xl transition-all shadow-md"
                >
                  Save Category
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Payment Method Modal */}
      <AnimatePresence>
        {showAddPmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-955 border border-gray-250 dark:border-gray-850 rounded-3xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2.5">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Create Custom Payment Channel</h4>
                <button onClick={() => setShowAddPmModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreatePaymentMethod} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Payment Method Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sodexo, Paytm Wallet"
                    value={newPmName}
                    onChange={e => setNewPmName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold rounded-xl transition-all shadow-md"
                >
                  Save Payment Method
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTxDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-850 rounded-3xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2.5">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Transaction Registry Info</h4>
                <button onClick={() => setSelectedTxDetails(null)} className="text-gray-500 hover:text-gray-955 dark:hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                  <span className="font-bold">Date & Time:</span>
                  <span className="text-gray-950 dark:text-white">{selectedTxDetails.date} at {selectedTxDetails.time || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                  <span className="font-bold">Transaction Type:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                    selectedTxDetails.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>{selectedTxDetails.type}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                  <span className="font-bold">Category:</span>
                  <span className="text-gray-950 dark:text-white font-bold">{selectedTxDetails.category}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                  <span className="font-bold">Payment Method:</span>
                  <span className="text-gray-950 dark:text-white">{selectedTxDetails.payment_method}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                  <span className="font-bold">Amount:</span>
                  <span className={`font-black text-sm ${selectedTxDetails.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ₹{selectedTxDetails.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold block">Remarks / Notes:</span>
                  <p className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-805 rounded-xl italic">
                    "{selectedTxDetails.notes || 'No description provided.'}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTxDetails(null)}
                className="w-full py-2.5 bg-gray-200 dark:bg-gray-850 hover:bg-gray-300 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold rounded-xl transition-all"
              >
                Close details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MoneyManager;
