import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  AlertCircle,
  Check,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Download,
  FileText,
  Bell,
  RefreshCw,
  Clock,
  PieChart as PieIcon
} from 'lucide-react';
import { CardSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import AiAdvisor from '../components/AiAdvisor';
import TransactionForm from '../components/TransactionForm';

const Dashboard = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
    savingsRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch recent transactions (first page, limit 5)
      const txResponse = await axios.get('/transactions?page=1&limit=5');
      setTransactions(txResponse.data.transactions || []);

      // 2. Fetch ALL transactions to calculate overall statistics
      const allTxResponse = await axios.get('/transactions?page=1&limit=10000');
      const allTxs = allTxResponse.data.transactions || [];

      let totalIncome = 0;
      let totalExpenses = 0;
      allTxs.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'income') totalIncome += amt;
        else totalExpenses += amt;
      });

      const netSavings = totalIncome - totalExpenses;
      const rate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      setSummaryStats({
        income: totalIncome,
        expenses: totalExpenses,
        balance: netSavings,
        savingsRate: rate
      });

      // 3. Fetch budgets to show circular goals
      const budgetResponse = await axios.get('/budgets');
      setBudgets(budgetResponse.data.budgets || []);

      // 4. Fetch reminders to show alerts
      const reminderResponse = await axios.get('/reminders');
      setReminders(reminderResponse.data.reminders || []);

    } catch (err) {
      console.error('Fetch dashboard details failed:', err);
      setError('Could not calculate dashboard analytics. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTransaction) {
        await axios.put(`/transactions/${editingTransaction.id}`, formData);
        triggerNotification('Transaction updated successfully.', 'success');
      } else {
        await axios.post('/transactions', formData);
        triggerNotification('Transaction logged successfully.', 'success');
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Save transaction failed:', err);
      const msg = err.response?.data?.message || 'Action failed.';
      triggerNotification(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction from your ledger?')) return;
    try {
      await axios.delete(`/transactions/${id}`);
      triggerNotification('Transaction deleted.', 'info');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      triggerNotification('Delete transaction failed.', 'error');
    }
  };

  const handleEditClick = (tx) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  // CSV Export utility
  const exportToCSV = async () => {
    try {
      const response = await axios.get('/transactions?page=1&limit=10000');
      const txs = response.data.transactions || [];
      if (txs.length === 0) {
        triggerNotification('No transactions available to export.', 'error');
        return;
      }

      const headers = ['ID', 'Title', 'Type', 'Amount', 'Category', 'Date', 'Description'];
      const csvRows = [headers.join(',')];

      txs.forEach(t => {
        const values = [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          t.type,
          t.amount,
          `"${t.category_name}"`,
          t.date,
          `"${(t.description || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `AuraFinance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification('CSV report downloaded successfully.', 'success');
    } catch (err) {
      console.error('CSV export failed:', err);
      triggerNotification('Could not export CSV registry.', 'error');
    }
  };

  // Print PDF Trigger
  const triggerPDFPrint = () => {
    window.print();
  };

  // Budget utilization percent
  const utilizationRate = summaryStats.income > 0 ? (summaryStats.expenses / summaryStats.income) * 100 : 0;

  // Alerts calculations
  const pendingReminders = reminders.filter(r => r.status === 'pending' || r.status === 'overdue');
  const overdueReminders = reminders.filter(r => r.status === 'overdue');

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
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

      {/* Greeting Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Fintech Portal</h1>
          <p className="text-sm text-gray-550 mt-1">Real-time ledger analytics & predictive budget optimizations.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center p-3 rounded-2xl border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-650"
            title="Export CSV"
          >
            <Download className="h-5 w-5" />
          </button>
          
          {/* Print PDF */}
          <button
            onClick={triggerPDFPrint}
            className="flex items-center justify-center p-3 rounded-2xl border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-655"
            title="Download PDF Report"
          >
            <FileText className="h-5 w-5" />
          </button>

          <button
            onClick={handleAddNewClick}
            className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-550 px-5 py-3.5 font-semibold text-white shadow-xl shadow-indigo-600/15 active:scale-98 transition-all"
          >
            <PlusCircle className="h-5 w-5" />
            Log Transaction
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-6 text-gray-900 font-sans">
        <h1 className="text-2xl font-black">AuraFinance Dashboard Report</h1>
        <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()} for user {user?.username} ({user?.email})</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2 print:hidden">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Bill Reminders Notification Alert Box */}
      {!loading && pendingReminders.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs flex items-center justify-between gap-3 text-amber-400 print:hidden">
          <div className="flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 animate-bounce" />
            <span>
              {overdueReminders.length > 0 
                ? `Alert: You have ${overdueReminders.length} overdue bill payments requiring immediate settlement.`
                : `Info: You have ${pendingReminders.length} upcoming bill payments scheduled this month.`}
            </span>
          </div>
          <Link to="/reminders" className="font-bold flex items-center gap-0.5 hover:underline text-indigo-400">
            View Bills
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            {/* Total Income */}
            <div className="glass rounded-3xl p-5 glow-teal light-theme:glass-light flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cumulative Inflow</p>
                <p className="text-2xl font-extrabold mt-1 text-emerald-450">
                  +{formatAmount(summaryStats.income, baseCurrency)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 light-theme:bg-emerald-50 light-theme:text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="glass rounded-3xl p-5 glow-indigo light-theme:glass-light flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cumulative Outflow</p>
                <p className="text-2xl font-extrabold mt-1 text-rose-450">
                  -{formatAmount(summaryStats.expenses, baseCurrency)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 light-theme:bg-rose-50 light-theme:text-rose-600">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>

            {/* Remaining Balance */}
            <div className="glass rounded-3xl p-5 glow-teal light-theme:glass-light flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Remaining Balance</p>
                <p className={`text-2xl font-extrabold mt-1 ${summaryStats.balance >= 0 ? 'text-white light-theme:text-gray-950' : 'text-rose-400'}`}>
                  {summaryStats.balance < 0 ? '-' : ''}{formatAmount(Math.abs(summaryStats.balance), baseCurrency)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-650">
                <Scale className="h-6 w-6" />
              </div>
            </div>

            {/* Savings Rate */}
            <div className="glass rounded-3xl p-5 glow-indigo light-theme:glass-light flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Savings Index</p>
                <p className={`text-2xl font-extrabold mt-1 ${summaryStats.savingsRate >= 15 ? 'text-teal-400' : 'text-amber-400'}`}>
                  {summaryStats.savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 light-theme:bg-cyan-50 light-theme:text-cyan-600">
                <Percent className="h-6 w-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Budget Utilization Progress Card */}
      {!loading && (
        <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-550">Active Budget Consumption</span>
            <span className="text-xs font-bold text-gray-300 light-theme:text-gray-700">
              {utilizationRate.toFixed(1)}% of Incomes Exhausted
            </span>
          </div>
          <div className="h-3 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800/40 light-theme:bg-gray-200 light-theme:border-transparent">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, utilizationRate)}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                utilizationRate > 85
                  ? 'bg-rose-500'
                  : utilizationRate > 65
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 print:hidden">
            {utilizationRate > 85
              ? 'Warning: Outflows have consumed almost all registered income buffers.'
              : utilizationRate > 0
              ? 'Safe Zone: Expenditure velocity is well aligned with incoming resources.'
              : 'Add transactions to trace utilization indexes.'}
          </p>
        </div>
      )}

      {/* Budget Goals circular indicators section */}
      {!loading && budgets.length > 0 && (
        <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
          <div className="flex justify-between items-center border-b border-gray-800/40 pb-4 mb-4 light-theme:border-gray-202">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white light-theme:text-gray-900 flex items-center gap-1.5">
              <PieIcon className="h-4.5 w-4.5 text-indigo-400" />
              Category Budget Progress Goals
            </h3>
            <span className="text-xs text-gray-550 print:hidden">Limits per month</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 pt-2">
            {budgets.map(b => {
              const radius = 22;
              const circ = 2 * Math.PI * radius;
              const offset = circ - (Math.min(100, b.percentage) / 100) * circ;
              const isOver = b.amount_spent > b.amount_limit;

              return (
                <div key={b.id} className="flex flex-col items-center p-3 rounded-2xl bg-gray-950/20 border border-gray-900/50 light-theme:bg-gray-50 light-theme:border-gray-202/50 text-center">
                  <div className="relative flex items-center justify-center mb-2.5">
                    {/* SVG Circle Gauge */}
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        className="stroke-gray-800 light-theme:stroke-gray-200 fill-transparent"
                        strokeWidth="3.5"
                      />
                      <motion.circle
                        cx="28"
                        cy="28"
                        r={radius}
                        className={`fill-transparent ${isOver ? 'stroke-rose-500' : 'stroke-indigo-550'}`}
                        strokeWidth="3.5"
                        strokeDasharray={circ}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.8 }}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white light-theme:text-gray-900">
                      {b.percentage.toFixed(0)}%
                    </span>
                  </div>

                  <span className="text-xs font-bold text-gray-300 light-theme:text-gray-800 truncate max-w-full">
                    {b.category_name}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    {formatAmount(b.amount_spent, baseCurrency)} / {formatAmount(b.amount_limit, baseCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Advice Advisor Panel */}
      <div className="print:hidden">
        <AiAdvisor expensesCount={summaryStats.income + summaryStats.expenses} />
      </div>

      {/* Recent Transactions Section */}
      <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
        <div className="flex justify-between items-center border-b border-gray-800/40 pb-4 mb-4 light-theme:border-gray-202">
          <h3 className="text-lg font-semibold text-white light-theme:text-gray-900">Recent Transactions</h3>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-all font-semibold print:hidden"
          >
            Open Registry Ledger
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <TableSkeleton rows={3} />
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-550">
            No logged events. Click "+ Log Transaction" to populate your dashboard ledger.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div
                key={tx.id}
                onClick={() => handleEditClick(tx)}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-800/50 bg-gray-950/20 hover:bg-gray-900/30 transition-all cursor-pointer light-theme:border-gray-200/50 light-theme:bg-gray-50/50 light-theme:hover:bg-gray-100/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      tx.type === 'income'
                        ? 'text-emerald-455 border-emerald-500/10 bg-emerald-500/5'
                        : 'text-rose-455 border-rose-500/10 bg-rose-500/5'
                    }`}
                  >
                    {tx.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white light-theme:text-gray-900">{tx.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-550">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {tx.date}
                      </span>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded-md border border-gray-800 text-[10px] light-theme:border-gray-250">
                        {tx.category_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-extrabold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-white light-theme:text-gray-950'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, baseCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popover form */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingTransaction={editingTransaction}
      />
    </div>
  );
};

export default Dashboard;
