import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, Tag, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  'Food',
  'Housing',
  'Utilities',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Health',
  'Other'
];

const ExpenseForm = ({ isOpen, onClose, onSubmit, editingExpense }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load editing values if available
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        title: editingExpense.title || '',
        amount: editingExpense.amount || '',
        category: editingExpense.category || 'Food',
        date: editingExpense.date || new Date().toISOString().split('T')[0],
        description: editingExpense.description || ''
      });
    } else {
      // Reset form
      setFormData({
        title: '',
        amount: '',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    }
    setErrors({});
  }, [editingExpense, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    const amt = parseFloat(formData.amount);
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(amt) || amt <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ server: err.message || 'Action failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gray-900 p-6 shadow-2xl border border-gray-800 light-theme:bg-white light-theme:border-gray-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-4 light-theme:border-gray-200">
            <h2 className="text-xl font-semibold text-white light-theme:text-gray-900">
              {editingExpense ? 'Modify Expense' : 'Log New Expense'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white light-theme:hover:bg-gray-100 light-theme:hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {errors.server && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errors.server}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Transaction Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Weekly Grocery Run"
                  className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 light-theme:placeholder-gray-400 ${
                    errors.title ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                  }`}
                />
              </div>
              {errors.title && <span className="text-xs text-rose-400 mt-1 block">{errors.title}</span>}
            </div>

            {/* Amount and Category */}
            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                  Amount ($)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 light-theme:placeholder-gray-400 ${
                      errors.amount ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                    }`}
                  />
                </div>
                {errors.amount && <span className="text-xs text-rose-400 mt-1 block">{errors.amount}</span>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                  Category
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Tag className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-gray-800 bg-gray-950/50 py-2.5 pl-9 pr-4 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Transaction Date
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 pl-9 pr-4 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 ${
                    errors.date ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                  }`}
                />
              </div>
              {errors.date && <span className="text-xs text-rose-400 mt-1 block">{errors.date}</span>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Description (Optional)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute top-3 left-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Notes, store location, or other details..."
                  className="w-full rounded-2xl border border-gray-800 bg-gray-950/50 py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 light-theme:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-linear-to-r from-indigo-600 to-indigo-500 py-3 font-semibold text-white hover:from-indigo-500 hover:to-indigo-400 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  'Saving Details...'
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {editingExpense ? 'Update Transaction' : 'Save Transaction'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExpenseForm;
