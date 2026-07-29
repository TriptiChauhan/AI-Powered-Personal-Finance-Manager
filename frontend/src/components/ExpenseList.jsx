import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, Trash2, Edit3, Calendar, Tag, DollarSign, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Food',
  'Housing',
  'Utilities',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Health',
  'Other'
];

const ExpenseList = ({ expenses, onEdit, onDelete, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount-desc, amount-asc

  // 1. Filter Logic
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All Categories' || exp.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // 2. Sort Logic
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.date) - new Date(b.date);
      case 'amount-desc':
        return parseFloat(b.amount) - parseFloat(a.amount);
      case 'amount-asc':
        return parseFloat(a.amount) - parseFloat(b.amount);
      case 'newest':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'Food':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 light-theme:text-indigo-600 light-theme:bg-indigo-50';
      case 'Housing':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20 light-theme:text-rose-600 light-theme:bg-rose-50';
      case 'Utilities':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20 light-theme:text-amber-600 light-theme:bg-amber-50';
      case 'Transportation':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 light-theme:text-cyan-600 light-theme:bg-cyan-50';
      case 'Entertainment':
        return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20 light-theme:text-fuchsia-600 light-theme:bg-fuchsia-50';
      case 'Shopping':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20 light-theme:text-purple-600 light-theme:bg-purple-50';
      case 'Health':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 light-theme:text-emerald-600 light-theme:bg-emerald-50';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20 light-theme:text-slate-600 light-theme:bg-slate-50';
    }
  };

  return (
    <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
      {/* Controls: Search, Filter, Sort */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-800/40 pb-5 mb-5 light-theme:border-gray-200">
        <h3 className="text-lg font-semibold text-white light-theme:text-gray-900">Transaction Registry</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search details..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm text-white placeholder-gray-600 border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200 light-theme:placeholder-gray-400"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm text-white border border-gray-800 bg-gray-950/40 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent light-theme:bg-gray-50 light-theme:text-gray-900 light-theme:border-gray-200"
            >
              <option value="newest" className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">Newest First</option>
              <option value="oldest" className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">Oldest First</option>
              <option value="amount-desc" className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">Amount: High-Low</option>
              <option value="amount-asc" className="bg-gray-950 text-white light-theme:bg-white light-theme:text-gray-900">Amount: Low-High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense Data Grid / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-gray-550">Loading ledger data...</p>
        </div>
      ) : sortedExpenses.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-550 border border-dashed border-gray-800 rounded-3xl p-6 light-theme:border-gray-200">
          No records match the current criteria. Start adding expenses or refine your filters.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800/60 text-xs font-semibold uppercase tracking-wider text-gray-500 light-theme:border-gray-200">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-sm text-gray-300 light-theme:divide-gray-100 light-theme:text-gray-700">
                {sortedExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-900/20 group transition-all light-theme:hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white light-theme:text-gray-900">{exp.title}</span>
                        {exp.description && (
                          <span className="block text-xs text-gray-550 mt-0.5 truncate max-w-xs">{exp.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeColor(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 light-theme:text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        {exp.date}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-white light-theme:text-gray-950">
                      ${parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(exp)}
                          className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(exp.id)}
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

          {/* Mobile Card Layout View */}
          <div className="md:hidden space-y-3">
            {sortedExpenses.map(exp => (
              <div 
                key={exp.id} 
                className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 space-y-3.5 light-theme:border-gray-200 light-theme:bg-gray-50/50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white light-theme:text-gray-900">{exp.title}</h4>
                    {exp.description && (
                      <p className="text-xs text-gray-550 mt-1">{exp.description}</p>
                    )}
                  </div>
                  <span className="font-extrabold text-white light-theme:text-gray-950">
                    ${parseFloat(exp.amount).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800/40 light-theme:border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full font-medium border ${getCategoryBadgeColor(exp.category)}`}>
                      {exp.category}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {exp.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(exp)}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(exp.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseList;
