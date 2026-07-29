import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle
} from 'lucide-react';
import { ChartSkeleton } from '../components/SkeletonLoader';

const COLORS = [
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#d946ef', // Fuchsia
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#64748b'  // Slate
];

const Analytics = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('/transactions?page=1&limit=10000');
        setTransactions(response.data.transactions || []);
      } catch (err) {
        console.error('Fetch analytics failed:', err);
        setError('Failed to compute analytics. Verify database is active.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const hasData = transactions.length > 0;

  // 1. Process Income vs Expense by Month (Double Bar Chart)
  const getMonthlyComparisonData = () => {
    const monthsObj = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(t => {
      const dateObj = new Date(t.date);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      if (!monthsObj[monthLabel]) {
        monthsObj[monthLabel] = { name: monthLabel, Income: 0, Expenses: 0 };
      }

      const amt = parseFloat(t.amount);
      if (t.type === 'income') {
        monthsObj[monthLabel].Income += amt;
      } else {
        monthsObj[monthLabel].Expenses += amt;
      }
    });

    return Object.values(monthsObj).slice(-6); // Limit to last 6 months
  };

  // 2. Process Category Distribution (Pie Chart - Expenses Only)
  const getCategoryData = () => {
    const catsObj = {};
    const expenses = transactions.filter(t => t.type === 'expense');

    expenses.forEach(t => {
      const catName = t.category_name || 'Other';
      const amt = parseFloat(t.amount);
      catsObj[catName] = (catsObj[catName] || 0) + amt;
    });

    return Object.keys(catsObj).map(key => ({
      name: key,
      value: parseFloat(catsObj[key].toFixed(2))
    })).sort((a, b) => b.value - a.value);
  };

  // 3. Process Weekly Spending Analysis (Line Chart - Grouped by Day of Week)
  const getWeeklyData = () => {
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysObj = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };

    const now = new Date();
    const currentWeekExpenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const tDate = new Date(t.date);
      const diffTime = Math.abs(now - tDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    currentWeekExpenses.forEach(t => {
      const tDate = new Date(t.date);
      const dayLabel = daysName[tDate.getDay()];
      daysObj[dayLabel] += parseFloat(t.amount);
    });

    return Object.keys(daysObj).map(day => ({
      day,
      Amount: parseFloat(daysObj[day].toFixed(2))
    }));
  };

  // 4. Calculate Top Spending Categories (Ranked List)
  const getTopCategories = () => {
    const cats = getCategoryData();
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return cats.map(cat => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0
    })).slice(0, 5);
  };

  const monthlyComparisonData = getMonthlyComparisonData();
  const categoryData = getCategoryData();
  const weeklyData = getWeeklyData();
  const topCategories = getTopCategories();

  // Summary Metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const balance = totalIncome - totalExpenses;
  const utilization = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-gray-800 bg-gray-950/90 p-3 shadow-xl backdrop-blur-md text-xs light-theme:border-gray-205 light-theme:bg-white/95">
          <p className="font-semibold text-white light-theme:text-gray-900">{payload[0].payload.name || payload[0].payload.day || 'Stat'}</p>
          <div className="mt-1 space-y-1">
            {payload.map((item, i) => (
              <p key={i} style={{ color: item.color }} className="font-extrabold">
                {item.name}: {formatAmount(item.value, baseCurrency)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-gray-550 mt-1">Advanced cash flow visualization matrices and category allocations.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : !hasData ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-3xl p-6 text-sm text-gray-500 light-theme:border-gray-200">
          No ledger statistics found. Record income or expense transactions to load analytics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Visualizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Income vs Expense Comparison Chart */}
            <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 light-theme:text-gray-900">
                Inflow vs Outflow comparison
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Monthly Expense Trend (Area Chart) */}
            <div className="glass rounded-3xl p-6 glow-teal light-theme:glass-light">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 light-theme:text-gray-900">
                Monthly Outflow Velocity
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Category Distribution (Pie Chart) */}
            <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 light-theme:text-gray-900">
                Expenditure Allocations
              </h3>
              <div className="h-72 w-full flex items-center justify-center">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-gray-500">No expense records available to compile.</span>
                )}
              </div>
            </div>

            {/* 4. Weekly Spending Intensity (Line Chart) */}
            <div className="glass rounded-3xl p-6 glow-teal light-theme:glass-light">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 light-theme:text-gray-900">
                Weekly Spending Analysis (Last 7 Days)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Secondary stats grids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Spending Categories List */}
            <div className="glass rounded-3xl p-6 glow-indigo lg:col-span-2 light-theme:glass-light">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 light-theme:text-gray-900">
                Top Spending Channels
              </h3>
              
              {topCategories.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-550">Add expense events to compile top spending categories.</p>
              ) : (
                <div className="space-y-4">
                  {topCategories.map((cat, i) => (
                    <div key={cat.name} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-300 light-theme:text-gray-700 flex items-center gap-2">
                          <span style={{ backgroundColor: COLORS[i % COLORS.length] }} className="h-2.5 w-2.5 rounded-full inline-block" />
                          {cat.name}
                        </span>
                        <span className="text-white font-extrabold light-theme:text-gray-900">
                          {formatAmount(cat.value, baseCurrency)}{' '}
                          <span className="text-xs font-normal text-gray-550">({cat.percentage.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden light-theme:bg-gray-150">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percentage}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cash Flow Diagnostics */}
            <div className="glass rounded-3xl p-6 glow-indigo flex flex-col justify-between light-theme:glass-light">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2 light-theme:text-gray-900">
                  Cash Flow Diagnostics
                </h3>
                <p className="text-xs text-gray-550 leading-relaxed">
                  Your overall budget consumption index checks total cash outflows relative to registered inflow assets.
                </p>
              </div>

              <div className="my-6 text-center">
                <p className="text-4xl font-black text-indigo-400 light-theme:text-indigo-650">{utilization.toFixed(0)}%</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Incomes Consumed</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Inflows Asset:</span>
                  <span className="text-emerald-450 font-bold">+{formatAmount(totalIncome, baseCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Outflows Spent:</span>
                  <span className="text-rose-455 font-bold">-{formatAmount(totalExpenses, baseCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-800 light-theme:border-gray-205">
                  <span className="text-gray-400">Net Surplus:</span>
                  <span className={`font-bold ${balance >= 0 ? 'text-white light-theme:text-gray-950' : 'text-rose-455'}`}>
                    {balance < 0 ? '-' : ''}{formatAmount(Math.abs(balance), baseCurrency)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
