import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, Tag, FileText, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const TransactionForm = ({ isOpen, onClose, onSubmit, editingTransaction }) => {
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState('expense'); // 'income' or 'expense'
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [loadingCats, setLoadingCats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    setLoadingCats(true);
    try {
      const response = await axios.get('/categories');
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Fetch categories failed:', err);
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Load editing transaction data
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type || 'expense');
      setFormData({
        title: editingTransaction.title || '',
        amount: editingTransaction.amount || '',
        category_id: editingTransaction.category_id || '',
        date: editingTransaction.date || new Date().toISOString().split('T')[0],
        description: editingTransaction.description || ''
      });
    } else {
      // Reset
      setType('expense');
      setFormData({
        title: '',
        amount: '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    }
    setErrors({});
  }, [editingTransaction, isOpen]);

  // Filter categories by selected type (income/expense)
  const filteredCategories = categories.filter(c => c.type === type);

  // Auto-select first category of the filtered type if category_id becomes invalid or is empty
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const isCurrentIdValid = filteredCategories.some(c => c.id === parseInt(formData.category_id));
      if (!isCurrentIdValid) {
        setFormData(prev => ({ ...prev, category_id: filteredCategories[0].id.toString() }));
      }
    } else {
      setFormData(prev => ({ ...prev, category_id: '' }));
    }
  }, [type, categories]);

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

    if (!formData.category_id) {
      newErrors.category_id = 'Category selection is required';
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        type,
        category_id: parseInt(formData.category_id)
      });
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
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal content container */}
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
              {editingTransaction ? 'Modify Transaction' : 'Record Transaction'}
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

            {/* Segmented Type Toggle Selector (Income vs Expense) */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-gray-955 border border-gray-800 light-theme:bg-gray-100 light-theme:border-gray-200">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-md shadow-rose-550/5'
                    : 'text-gray-400 hover:text-gray-300 light-theme:text-gray-600'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Expense Outflow
              </button>
              
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-550/5'
                    : 'text-gray-400 hover:text-gray-300 light-theme:text-gray-600'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Income Inflow
              </button>
            </div>

            {/* Transaction Title */}
            <div>
              <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                Transaction Details / Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={type === 'expense' ? 'e.g. Amazon Cloud Server' : 'e.g. Freelance Consulting Contract'}
                className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 px-4 text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 light-theme:placeholder-gray-400 ${
                  errors.title ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                }`}
              />
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

              {/* Category selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 light-theme:text-gray-600 mb-1">
                  Category Link
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Tag className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    disabled={loadingCats}
                    className={`w-full rounded-2xl border bg-gray-950/50 py-2.5 pl-9 pr-4 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 ${
                      errors.category_id ? 'border-rose-500 focus:ring-rose-500' : 'border-gray-800'
                    }`}
                  >
                    {loadingCats ? (
                      <option>Loading categories...</option>
                    ) : filteredCategories.length === 0 ? (
                      <option value="">No categories found</option>
                    ) : (
                      filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {errors.category_id && <span className="text-xs text-rose-400 mt-1 block">{errors.category_id}</span>}
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
                Memo / Notes
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
                  placeholder="Record payment methods, check numbers, or recurring details..."
                  className="w-full rounded-2xl border border-gray-800 bg-gray-950/50 py-2.5 pl-9 pr-4 text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-linear-to-r from-indigo-600 to-indigo-550 py-3 font-semibold text-white hover:from-indigo-500 hover:to-indigo-455 active:scale-98 transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  'Saving Ledger Record...'
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {editingTransaction ? 'Update Ledger' : 'Commit to Ledger'}
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

export default TransactionForm;
