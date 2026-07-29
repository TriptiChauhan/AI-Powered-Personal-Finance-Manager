import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  DollarSign,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Check,
  RefreshCw,
  X,
  Download,
  FileText
} from 'lucide-react';
import { TableSkeleton } from '../components/SkeletonLoader';
import TransactionForm from '../components/TransactionForm';

const Transactions = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10); // 10 items per page

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, income, expense
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, or category id
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, amount_desc, amount_asc

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Toast Notify
  const [notification, setNotification] = useState(null);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Categories on mount
  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Fetch categories failed:', err);
    }
  };

  // Fetch Transactions based on current filters and page
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      if (searchTerm.trim() !== '') params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category_id', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);

      const response = await axios.get(`/transactions?${params.toString()}`);
      setTransactions(response.data.transactions || []);
      
      const pg = response.data.pagination || {};
      setTotalPages(pg.totalPages || 1);
      setTotalItems(pg.total || 0);
    } catch (err) {
      console.error('Fetch transactions failed:', err);
      setError('Could not retrieve ledger. Verify server state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Re-fetch transactions when filters or page changes
  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter, categoryFilter, startDate, endDate, sortBy]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
    setPage(1);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTransaction) {
        await axios.put(`/transactions/${editingTransaction.id}`, formData);
        triggerNotification('Transaction updated.', 'success');
      } else {
        await axios.post('/transactions', formData);
        triggerNotification('Transaction logged.', 'success');
      }
      fetchTransactions();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Action failed.';
      triggerNotification(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await axios.delete(`/transactions/${id}`);
      triggerNotification('Transaction deleted.', 'info');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      triggerNotification('Failed to delete transaction.', 'error');
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // CSV Export utility (respecting current filters)
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', 1);
      params.append('limit', 10000); // get all matching records
      
      if (searchTerm.trim() !== '') params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category_id', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);

      const response = await axios.get(`/transactions?${params.toString()}`);
      const txs = response.data.transactions || [];

      if (txs.length === 0) {
        triggerNotification('No transactions found to export.', 'error');
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
      link.setAttribute('download', `Transactions_Registry_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification('CSV exported successfully.', 'success');
    } catch (err) {
      console.error('CSV export error:', err);
      triggerNotification('Export failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Toast Notification */}
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

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Ledger Registry</h1>
          <p className="text-sm text-gray-550 mt-1">Search, filter, and audit your complete financial registry.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* CSV Download */}
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center p-3 rounded-2xl border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-650"
            title="Export CSV"
          >
            <Download className="h-5 w-5" />
          </button>
          
          {/* PDF Report printing */}
          <button
            onClick={() => window.print()}
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
            Add Transaction
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-6 text-gray-900 font-sans">
        <h1 className="text-2xl font-black">AuraFinance Ledger Registry Report</h1>
        <p className="text-xs text-gray-550">Filtered items: {totalItems} total transactions | base currency: {baseCurrency}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2 print:hidden">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Control Panel Card */}
      <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light print:hidden">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Search bar and Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-555" />
              <input
                type="text"
                placeholder="Fuzzy search details or memos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm text-white placeholder-gray-655 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205 light-theme:placeholder-gray-450"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gray-950 text-white border border-gray-800 rounded-2xl font-semibold hover:bg-gray-900 transition-all flex items-center justify-center gap-1.5 light-theme:bg-gray-50 light-theme:text-gray-700 light-theme:border-gray-205 light-theme:hover:bg-gray-100"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>

          {/* Additional Filter Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-550 uppercase mb-1.5">Flow Direction</label>
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 text-xs text-white border border-gray-800 bg-gray-955 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
              >
                <option value="all" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">All Flows</option>
                <option value="income" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Income Inflow</option>
                <option value="expense" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Expense Outflow</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-555 uppercase mb-1.5">Category</label>
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 text-xs text-white border border-gray-800 bg-gray-955 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
              >
                <option value="all" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">
                    {c.name} ({c.type === 'income' ? 'In' : 'Out'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range - Start */}
            <div>
              <label className="block text-xs font-semibold text-gray-555 uppercase mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2 text-xs text-white border border-gray-800 bg-gray-955 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label className="block text-xs font-semibold text-gray-555 uppercase mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2 text-xs text-white border border-gray-800 bg-gray-955 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
              />
            </div>

            {/* Sort Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-555 uppercase mb-1.5">Sorting Clauses</label>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 text-xs text-white border border-gray-800 bg-gray-955 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-205"
              >
                <option value="date_desc" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Date: Newest First</option>
                <option value="date_asc" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Date: Oldest First</option>
                <option value="amount_desc" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Amount: High-Low</option>
                <option value="amount_asc" className="bg-gray-955 text-white light-theme:bg-white light-theme:text-gray-900">Amount: Low-High</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Option */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-gray-500 hover:text-white flex items-center gap-1 transition-all light-theme:hover:text-gray-900"
            >
              <X className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        </form>
      </div>

      {/* Ledger listing */}
      {loading ? (
        <TableSkeleton rows={limit} />
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-3xl p-6 text-sm text-gray-500 light-theme:border-gray-200">
          No transactions match current filters. Add a new record or adjust options.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <div className="overflow-x-auto glass rounded-3xl border border-gray-800/40 p-4 light-theme:glass-light print:border-gray-200 print:shadow-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800/60 text-xs font-semibold uppercase tracking-wider text-gray-500 light-theme:border-gray-202">
                  <th className="py-3 px-4 print:hidden">FLOW</th>
                  <th className="py-3 px-4">Title / Notes</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-sm text-gray-300 light-theme:divide-gray-100 light-theme:text-gray-700">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-900/10 group transition-all light-theme:hover:bg-gray-50/50 print:hover:bg-transparent">
                    {/* Direction Icon indicator */}
                    <td className="py-3.5 px-4 w-12 print:hidden">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                          tx.type === 'income'
                            ? 'text-emerald-455 border-emerald-500/10 bg-emerald-500/5'
                            : 'text-rose-455 border-rose-500/10 bg-rose-500/5'
                        }`}
                      >
                        {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </span>
                    </td>
                    {/* Title / Description */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div>
                        <span className="font-semibold text-white light-theme:text-gray-900">{tx.title}</span>
                        {tx.description && (
                          <span className="block text-xs text-gray-550 mt-0.5 truncate max-w-xs">{tx.description}</span>
                        )}
                      </div>
                    </td>
                    {/* Category with color tag */}
                    <td className="py-3.5 px-4">
                      <span
                        style={{
                          borderColor: `${tx.category_color}25`,
                          backgroundColor: `${tx.category_color}10`,
                          color: tx.category_color
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                      >
                        {tx.category_name}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="py-3.5 px-4 text-gray-400 light-theme:text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-500 print:hidden" />
                        {tx.date}
                      </span>
                    </td>
                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-extrabold">
                      <span className={tx.type === 'income' ? 'text-emerald-400' : 'text-white light-theme:text-gray-950'}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, baseCurrency)}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-3.5 px-4 print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-550/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 border-t border-gray-850 px-2 light-theme:border-gray-200 print:hidden">
              <span className="text-xs text-gray-500">
                Displaying page {page} of {totalPages} ({totalItems} total transactions)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="p-2 border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white rounded-xl hover:bg-gray-900 transition-all disabled:opacity-30 disabled:pointer-events-none light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-650"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        page === pNum
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                          : 'border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900 light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-650'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white rounded-xl hover:bg-gray-900 transition-all disabled:opacity-30 disabled:pointer-events-none light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-650"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popover form modal */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingTransaction={editingTransaction}
      />
    </div>
  );
};

export default Transactions;
