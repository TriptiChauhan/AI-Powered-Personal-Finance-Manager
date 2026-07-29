import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  Bell,
  Calendar,
  DollarSign,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  Repeat,
  Tag
} from 'lucide-react';

const Reminders = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [activeTab, setActiveTab] = useState('reminders'); // 'reminders' or 'recurring'
  const [reminders, setReminders] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Reminders Form State
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [reminderData, setReminderData] = useState({
    title: '',
    amount: '',
    due_date: ''
  });

  // Recurring Form State
  const [isRecurringFormOpen, setIsRecurringFormOpen] = useState(false);
  const [recurringData, setRecurringData] = useState({
    title: '',
    amount: '',
    category_id: '',
    frequency: 'monthly',
    next_due_date: '',
    description: ''
  });

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [remResponse, recResponse, catResponse] = await Promise.all([
        axios.get('/reminders'),
        axios.get('/recurring'),
        axios.get('/categories')
      ]);
      setReminders(remResponse.data.reminders || []);
      setRecurrings(recResponse.data.recurringExpenses || []);
      setCategories(catResponse.data.categories || []);
    } catch (err) {
      console.error('Fetch reminders or recurring list failed:', err);
      setError('Could not retrieve billing registry. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/reminders', reminderData);
      triggerNotification('Reminder set successfully.', 'success');
      setReminderData({ title: '', amount: '', due_date: '' });
      setIsReminderFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification(err.response?.data?.message || 'Failed to log reminder.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/recurring', recurringData);
      triggerNotification('Recurring subscription set successfully.', 'success');
      setRecurringData({ title: '', amount: '', category_id: '', frequency: 'monthly', next_due_date: '', description: '' });
      setIsRecurringFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification(err.response?.data?.message || 'Failed to log subscription.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await axios.put(`/reminders/${id}`, { status: 'paid' });
      triggerNotification('Bill marked as paid.', 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification('Could not update reminder status.', 'error');
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await axios.delete(`/reminders/${id}`);
      triggerNotification('Reminder deleted.', 'info');
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification('Failed to delete reminder.', 'error');
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('Cancel this recurring subscription?')) return;
    try {
      await axios.delete(`/recurring/${id}`);
      triggerNotification('Recurring subscription cancelled.', 'info');
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification('Failed to cancel subscription.', 'error');
    }
  };

  return (
    <div className="space-y-6">
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
                : notification.type === 'info'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Bills & Subscriptions</h1>
          <p className="text-sm text-gray-550 mt-1">Track fixed commitments, upcoming bills, and automatic calendar allocations.</p>
        </div>
        <button
          onClick={() => (activeTab === 'reminders' ? setIsReminderFormOpen(true) : setIsRecurringFormOpen(true))}
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-550 px-5 py-3.5 font-semibold text-white shadow-xl shadow-indigo-600/15 active:scale-98 transition-all"
        >
          <PlusCircle className="h-5 w-5" />
          {activeTab === 'reminders' ? 'Set Bill Reminder' : 'Set Recurring Subscription'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-800/60 pb-px light-theme:border-gray-205">
        <button
          onClick={() => setActiveTab('reminders')}
          className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reminders'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-white light-theme:hover:text-gray-900'
          }`}
        >
          <Bell className="h-4.5 w-4.5" />
          Bill Reminders
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'recurring'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-white light-theme:hover:text-gray-900'
          }`}
        >
          <Repeat className="h-4.5 w-4.5" />
          Recurring Subscriptions
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl light-theme:glass-light">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-gray-550">Compiling financial contract registers...</p>
        </div>
      ) : activeTab === 'reminders' ? (
        /* REMINDERS LIST */
        reminders.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-3xl p-6 text-sm text-gray-500 light-theme:border-gray-200">
            No active reminders scheduled. Set a reminder to trace upcoming utility bills.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map(rem => (
              <div
                key={rem.id}
                className="glass rounded-3xl p-5 glow-indigo light-theme:glass-light flex flex-col justify-between border border-gray-800/40 relative overflow-hidden"
              >
                {/* Due status badge */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      rem.status === 'paid'
                        ? 'text-emerald-450 border-emerald-500/10 bg-emerald-500/5'
                        : rem.status === 'overdue'
                        ? 'text-rose-455 border-rose-500/10 bg-rose-500/5'
                        : 'text-amber-500 border-amber-500/10 bg-amber-500/5'
                    }`}
                  >
                    {rem.status}
                  </span>
                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-1 text-gray-550 hover:text-rose-455 transition-all hover:bg-rose-500/5 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-white light-theme:text-gray-900 mb-1">{rem.title}</h4>
                  <p className="text-2xl font-black text-white light-theme:text-gray-950">
                    {formatAmount(rem.amount, baseCurrency)}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-gray-800/40 light-theme:border-gray-202">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Due {rem.due_date}
                  </span>

                  {rem.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkAsPaid(rem.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* RECURRING EXPENSES LIST */
        recurrings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-3xl p-6 text-sm text-gray-500 light-theme:border-gray-200">
            No recurring contracts configured. Add items like Netflix, Rent, or Gym below.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurrings.map(rec => (
              <div
                key={rec.id}
                className="glass rounded-3xl p-5 glow-indigo light-theme:glass-light flex flex-col justify-between border border-gray-800/40 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1"
                        style={{
                          borderColor: `${rec.category_color}25`,
                          backgroundColor: `${rec.category_color}10`,
                          color: rec.category_color
                        }}>
                    <Tag className="h-3 w-3" />
                    {rec.category_name}
                  </span>
                  
                  <button
                    onClick={() => handleDeleteRecurring(rec.id)}
                    className="p-1 text-gray-550 hover:text-rose-455 transition-all hover:bg-rose-500/5 rounded-lg"
                    title="Cancel Subscription"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-white light-theme:text-gray-900 mb-1">{rec.title}</h4>
                  <p className="text-2xl font-black text-white light-theme:text-gray-950">
                    {formatAmount(rec.amount, baseCurrency)}{' '}
                    <span className="text-xs font-semibold text-gray-500 lowercase">/ {rec.frequency}</span>
                  </p>
                  {rec.description && (
                    <p className="text-xs text-gray-550 mt-2 line-clamp-2">{rec.description}</p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-gray-800/40 light-theme:border-gray-202 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Next due: {rec.next_due_date}
                  </span>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-400">
                    Auto-charge
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* POPUP FOR REMINDER FORM */}
      <AnimatePresence>
        {isReminderFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass rounded-3xl p-6 glow-indigo relative border border-gray-850 light-theme:glass-light"
            >
              <button
                onClick={() => setIsReminderFormOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-800/30 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-white light-theme:text-gray-900 mb-5 flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-400" />
                Add Bill Reminder
              </h3>

              <form onSubmit={handleReminderSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Bill Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electric Bill, Rent, Internet"
                    value={reminderData.title}
                    onChange={e => setReminderData({ ...reminderData, title: e.target.value })}
                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Amount Due</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-semibold text-indigo-400">
                      {formatAmount(0, baseCurrency)[0]}
                    </span>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={reminderData.amount}
                      onChange={e => setReminderData({ ...reminderData, amount: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Due Date</label>
                  <input
                    type="date"
                    required
                    value={reminderData.due_date}
                    onChange={e => setReminderData({ ...reminderData, due_date: e.target.value })}
                    className="w-full px-4 py-3 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Setting up...' : 'Log Bill Reminder'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP FOR RECURRING FORM */}
      <AnimatePresence>
        {isRecurringFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass rounded-3xl p-6 glow-indigo relative border border-gray-850 light-theme:glass-light"
            >
              <button
                onClick={() => setIsRecurringFormOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-800/30 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-white light-theme:text-gray-900 mb-5 flex items-center gap-2">
                <Repeat className="h-5 w-5 text-indigo-400" />
                Add Recurring Expense
              </h3>

              <form onSubmit={handleRecurringSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Subscription Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix, Rent, Office Space"
                    value={recurringData.title}
                    onChange={e => setRecurringData({ ...recurringData, title: e.target.value })}
                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Billing Cost</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-sm font-semibold text-indigo-400">
                        {formatAmount(0, baseCurrency)[0]}
                      </span>
                      <input
                        type="number"
                        required
                        step="any"
                        min="0.01"
                        placeholder="0.00"
                        value={recurringData.amount}
                        onChange={e => setRecurringData({ ...recurringData, amount: e.target.value })}
                        className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Frequency</label>
                    <select
                      value={recurringData.frequency}
                      onChange={e => setRecurringData({ ...recurringData, frequency: e.target.value })}
                      className="w-full px-4 py-3 text-sm text-white border border-gray-800 bg-gray-955 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                    >
                      <option value="daily" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Daily</option>
                      <option value="weekly" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Weekly</option>
                      <option value="monthly" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Monthly</option>
                      <option value="yearly" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Category</label>
                    <select
                      required
                      value={recurringData.category_id}
                      onChange={e => setRecurringData({ ...recurringData, category_id: e.target.value })}
                      className="w-full px-4 py-3 text-sm text-white border border-gray-800 bg-gray-955 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                    >
                      <option value="" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Select...</option>
                      {categories
                        .filter(c => c.type === 'expense')
                        .map(c => (
                          <option key={c.id} value={c.id} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Next Due Date</label>
                    <input
                      type="date"
                      required
                      value={recurringData.next_due_date}
                      onChange={e => setRecurringData({ ...recurringData, next_due_date: e.target.value })}
                      className="w-full px-4 py-3 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Memo Description</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Account number, billing reference..."
                    value={recurringData.description}
                    onChange={e => setRecurringData({ ...recurringData, description: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Setting up...' : 'Log Subscription contract'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reminders;
