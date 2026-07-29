import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

const COLORS = {
  Food: '#6366f1',          // Indigo
  Housing: '#f43f5e',       // Rose
  Utilities: '#eab308',     // Yellow
  Transportation: '#06b6d4',// Cyan
  Entertainment: '#d946ef', // Fuchsia
  Shopping: '#a855f7',      // Purple
  Health: '#10b981',        // Emerald
  Other: '#64748b'          // Slate
};

const DEFAULT_COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#06b6d4', '#eab308', '#a855f7', '#10b981', '#64748b'];

const ChartSummary = ({ expenses }) => {
  // 1. Process Category Data
  const getCategoryData = () => {
    const dataObj = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Other';
      dataObj[cat] = (dataObj[cat] || 0) + parseFloat(exp.amount);
    });

    return Object.keys(dataObj).map(key => ({
      name: key,
      value: parseFloat(dataObj[key].toFixed(2))
    }));
  };

  // 2. Process Timeline Data (Grouped by Date, sorted chronologically)
  const getTimelineData = () => {
    const dataObj = {};
    // Take recent expenses to keep chart clean (last 30 transactions or days)
    expenses.forEach(exp => {
      const dateStr = exp.date; // YYYY-MM-DD
      dataObj[dateStr] = (dataObj[dateStr] || 0) + parseFloat(exp.amount);
    });

    // Convert to array and sort chronologically
    return Object.keys(dataObj)
      .map(key => ({
        date: key,
        amount: parseFloat(dataObj[key].toFixed(2))
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10); // Show last 10 active dates
  };

  const categoryData = getCategoryData();
  const timelineData = getTimelineData();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-gray-800 bg-gray-950/90 p-3 shadow-xl backdrop-blur-md text-xs light-theme:border-gray-200 light-theme:bg-white/95">
          <p className="font-semibold text-white light-theme:text-gray-900">{payload[0].name || 'Spent'}</p>
          <p className="mt-1 text-indigo-400 font-extrabold light-theme:text-indigo-600">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasExpenses = expenses.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Category Distribution (Pie Chart) */}
      <div className="glass rounded-3xl p-6 glow-indigo light-theme:glass-light">
        <div className="flex items-center gap-2 border-b border-gray-800/50 pb-4 mb-4 light-theme:border-gray-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-600">
            <PieIcon className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-semibold text-white light-theme:text-gray-900">Category Spread</h3>
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-gray-500">
              No expense data available. Add expenses to load chart.
            </div>
          )}
        </div>
      </div>

      {/* Spending Trend (Area Chart) */}
      <div className="glass rounded-3xl p-6 glow-teal light-theme:glass-light">
        <div className="flex items-center gap-2 border-b border-gray-800/50 pb-4 mb-4 light-theme:border-gray-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 light-theme:bg-teal-50 light-theme:text-teal-650">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-semibold text-white light-theme:text-gray-900">Spending Velocity</h3>
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          {hasExpenses && timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 10 }} 
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 10 }} 
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#14b8a6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-gray-500">
              No transactional trends. Log expenses over multiple days to populate trend charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartSummary;
