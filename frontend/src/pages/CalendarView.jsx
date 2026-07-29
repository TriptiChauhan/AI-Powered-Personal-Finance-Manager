import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/currency';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Repeat,
  X,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const CalendarView = () => {
  const { user } = useAuth();
  const baseCurrency = user?.currency || 'USD';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected day detail panel state
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState({ transactions: [], reminders: [], recurrings: [] });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const startYear = currentDate.getFullYear();
      const startMonth = currentDate.getMonth() + 1;
      
      // Fetch data
      const [txResponse, remResponse, recResponse] = await Promise.all([
        axios.get('/transactions?page=1&limit=10000'),
        axios.get('/reminders'),
        axios.get('/recurring')
      ]);

      setTransactions(txResponse.data.transactions || []);
      setReminders(remResponse.data.reminders || []);
      setRecurrings(recResponse.data.recurringExpenses || []);
    } catch (err) {
      console.error('Fetch calendar data failed:', err);
      setError('Could not retrieve calendar items. Verify server state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // Day of week (0-6)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  const calendarCells = [];

  // 1. Add trailing days of previous month
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Align to Mon starting week
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    const dayVal = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, dayVal);
    calendarCells.push({ date: dateObj, isCurrentMonth: false, label: dayVal });
  }

  // 2. Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    calendarCells.push({ date: dateObj, isCurrentMonth: true, label: i });
  }

  // 3. Add leading days of next month to complete 42 cells (6 rows of 7)
  const totalCellsNeeded = 42;
  const nextMonthCells = totalCellsNeeded - calendarCells.length;
  for (let i = 1; i <= nextMonthCells; i++) {
    const dateObj = new Date(year, month + 1, i);
    calendarCells.push({ date: dateObj, isCurrentMonth: false, label: i });
  }

  const getEventsForDay = (cellDate) => {
    const dateString = cellDate.toISOString().split('T')[0];

    const dayTxs = transactions.filter(t => t.date === dateString);
    const dayRems = reminders.filter(r => r.due_date === dateString);
    const dayRecs = recurrings.filter(rec => rec.next_due_date === dateString);

    return { transactions: dayTxs, reminders: dayRems, recurrings: dayRecs };
  };

  const handleDayClick = (cell) => {
    const events = getEventsForDay(cell.date);
    setSelectedDay(cell.date);
    setDayEvents(events);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white light-theme:text-gray-900 tracking-tight">Financial Calendar</h1>
          <p className="text-sm text-gray-550 mt-1">Audit cash flows, scheduled reminders, and recurring dues in a timeline grid.</p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white rounded-xl hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-655"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-800 bg-gray-955 rounded-xl font-semibold text-white text-sm light-theme:border-gray-250 light-theme:bg-white light-theme:text-gray-900">
            <CalIcon className="h-4 w-4 text-indigo-400" />
            <span>{monthNames[month]} {year}</span>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 border border-gray-800 bg-gray-955/40 text-gray-400 hover:text-white rounded-xl hover:bg-gray-900 transition-all light-theme:border-gray-205 light-theme:bg-white light-theme:text-gray-655"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-455 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl light-theme:glass-light">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-gray-550">Mapping ledger database time coordinates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid Container */}
          <div className="lg:col-span-3 glass rounded-3xl p-5 glow-indigo light-theme:glass-light border border-gray-800/40">
            {/* Days Of Week Headers */}
            <div className="grid grid-cols-7 text-center mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="text-xs font-bold uppercase tracking-wider text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                const events = getEventsForDay(cell.date);
                const hasIncome = events.transactions.some(t => t.type === 'income');
                const hasExpense = events.transactions.some(t => t.type === 'expense');
                const hasReminder = events.reminders.length > 0;
                const hasRecurring = events.recurrings.length > 0;
                
                const isSelected = selectedDay && selectedDay.toDateString() === cell.date.toDateString();
                const isToday = new Date().toDateString() === cell.date.toDateString();

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(cell)}
                    className={`min-h-[70px] sm:min-h-[85px] p-2 rounded-2xl flex flex-col justify-between text-left transition-all border ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/5 text-white'
                        : isToday
                        ? 'border-indigo-500/30 bg-indigo-500/5 text-white'
                        : cell.isCurrentMonth
                        ? 'border-gray-900/50 bg-gray-950/20 text-gray-300 hover:bg-gray-900/20 light-theme:border-gray-200/50 light-theme:bg-gray-50/20 light-theme:text-gray-800 light-theme:hover:bg-gray-100/30'
                        : 'border-transparent text-gray-650 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* Day number */}
                    <span className={`text-xs font-bold ${isToday ? 'bg-indigo-600 text-white flex h-5 w-5 items-center justify-center rounded-full text-[10px]' : ''}`}>
                      {cell.label}
                    </span>

                    {/* Indicators markers */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hasIncome && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Income item logged" />
                      )}
                      {hasExpense && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Expense item logged" />
                      )}
                      {hasReminder && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" title="Bill reminder pending" />
                      )}
                      {hasRecurring && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" title="Recurring subscription due" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Drawer Sidebar */}
          <div className="glass rounded-3xl p-5 glow-indigo light-theme:glass-light border border-gray-800/40 h-fit">
            <h3 className="text-md font-bold text-white light-theme:text-gray-900 border-b border-gray-800/40 pb-3 mb-4 light-theme:border-gray-202">
              Agenda details
            </h3>

            {selectedDay ? (
              <div className="space-y-5">
                <div className="text-xs text-gray-500 font-semibold uppercase flex items-center gap-1.5">
                  <CalIcon className="h-4 w-4 text-indigo-400" />
                  <span>{selectedDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {/* Day Summary Cashflow metrics */}
                <div className="space-y-1.5 rounded-2xl bg-gray-950/40 p-3 border border-gray-800/30 light-theme:bg-gray-50 light-theme:border-gray-202 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Inflow Income:</span>
                    <span className="text-emerald-450 font-bold">
                      +{formatAmount(
                        dayEvents.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                        baseCurrency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Outflow Expense:</span>
                    <span className="text-rose-455 font-bold">
                      -{formatAmount(
                        dayEvents.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                        baseCurrency
                      )}
                    </span>
                  </div>
                </div>

                {/* Event listings */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {/* Reminders section */}
                  {dayEvents.reminders.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        Reminders ({dayEvents.reminders.length})
                      </h4>
                      {dayEvents.reminders.map(rem => (
                        <div key={rem.id} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs">
                          <div className="flex justify-between font-semibold text-white light-theme:text-gray-850">
                            <span>{rem.title}</span>
                            <span>{formatAmount(rem.amount, baseCurrency)}</span>
                          </div>
                          <span className="text-[9px] text-amber-400 capitalize font-bold mt-0.5 block">{rem.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recurring subscription dues */}
                  {dayEvents.recurrings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        Subscriptions ({dayEvents.recurrings.length})
                      </h4>
                      {dayEvents.recurrings.map(rec => (
                        <div key={rec.id} className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-xs">
                          <div className="flex justify-between font-semibold text-white light-theme:text-gray-850">
                            <span>{rec.title}</span>
                            <span>{formatAmount(rec.amount, baseCurrency)}</span>
                          </div>
                          <span className="text-[9px] text-gray-500 capitalize block mt-0.5">Frequency: {rec.frequency}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transactions section */}
                  {dayEvents.transactions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <CalIcon className="h-3 w-3" />
                        Ledger events ({dayEvents.transactions.length})
                      </h4>
                      {dayEvents.transactions.map(tx => (
                        <div key={tx.id} className="p-2.5 rounded-xl bg-gray-900/30 border border-gray-800/40 text-xs flex justify-between items-center light-theme:bg-gray-50 light-theme:border-gray-200">
                          <div>
                            <span className="font-semibold text-white light-theme:text-gray-900 block">{tx.title}</span>
                            <span className="text-[9px] text-gray-500 block">{tx.category_name}</span>
                          </div>
                          <span className={`font-extrabold ${tx.type === 'income' ? 'text-emerald-400' : 'text-white light-theme:text-gray-950'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, baseCurrency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayEvents.transactions.length === 0 &&
                   dayEvents.reminders.length === 0 &&
                   dayEvents.recurrings.length === 0 && (
                     <div className="text-center py-6 text-xs text-gray-550 flex items-center justify-center gap-1">
                       <Info className="h-4 w-4" />
                       No agenda contracts logged.
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-gray-550 flex flex-col items-center gap-2">
                <CalIcon className="h-8 w-8 text-gray-600 mb-1" />
                <span>Select a day cell to examine items agenda ledger.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
