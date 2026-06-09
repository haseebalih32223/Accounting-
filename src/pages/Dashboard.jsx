import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';
import { ArrowUpRight, Plus, Clock } from 'lucide-react';

// Semi-circle arc gauge
function ArcMeter({ percent, size = 190 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;
  const p = Math.min(Math.max(percent || 0, 0), 100);
  const fullCirc = 2 * Math.PI * r;
  const halfCirc = Math.PI * r;
  const progressLen = halfCirc * (p / 100);
  const viewH = size / 2 + 28;

  return (
    <svg width={size} height={viewH} viewBox={`0 0 ${size} ${viewH}`}>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth="14"
        strokeDasharray={`${halfCirc} ${fullCirc}`}
        strokeLinecap="round"
        transform={`rotate(180 ${cx} ${cy})`}
      />
      {p > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="14"
          strokeDasharray={`${progressLen} ${fullCirc}`}
          strokeLinecap="round"
          transform={`rotate(180 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#1A1A1A" fontSize="30" fontWeight="800" fontFamily="DM Mono, monospace">
        {percent}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#6B6B6B" fontSize="11" fontFamily="DM Sans, sans-serif">
        Net Profit Margin
      </text>
    </svg>
  );
}

// Bank progress bar
function BankBar({ name, amount, maxAmount, color = '#B8F53A' }) {
  const pct = maxAmount > 0 ? Math.min(Math.round((amount / maxAmount) * 100), 100) : 0;
  const { formatCurrency } = useApp();
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-medium text-[#1A1A1A]">{name}</span>
        <span className="font-mono text-[13px] text-[#6B6B6B]">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 bg-[#EBEBEB] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <div className="text-[11px] text-[#AAAAAA]">{pct}% of total</div>
    </div>
  );
}

// Custom recharts tooltip
function ChartTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] rounded-2xl px-4 py-3 shadow-lg border border-[#2A2A2A]">
      <p className="text-[#AAAAAA] text-xs mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white text-xs font-mono">
          <span style={{ color: p.fill }}>{p.name}: </span>
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// Stagger helpers
const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1    },
};

function staggerDelay(i) {
  return { duration: 0.3, ease: 'easeOut', delay: i * 0.08 };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useApp();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroStarted, setHeroStarted] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const d = await window.electronAPI.getDashboardData();
      setData(d);
      try {
        const banks = await window.electronAPI.getBankCashData?.();
        if (banks?.accounts) setBankAccounts(banks.accounts);
        else if (Array.isArray(banks)) setBankAccounts(banks);
      } catch (_) {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      // Trigger hero CountUp shortly after data loads
      setTimeout(() => setHeroStarted(true), 150);
    }
  };

  if (loading) {
    return (
      <div className="p-7 space-y-5 max-w-[1600px] mx-auto">
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="row-span-2 skeleton rounded-3xl min-h-[300px]" />
          <div className="skeleton rounded-2xl h-36" />
          <div className="skeleton rounded-2xl h-36" />
          <div className="skeleton rounded-2xl h-36" />
          <div className="skeleton rounded-2xl h-36" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, monthly_data, recent_sales, upcoming_due } = data;
  const netProfitPositive = kpis.net_profit >= 0;
  const profitMargin = kpis.revenue > 0 ? Math.round((kpis.net_profit / kpis.revenue) * 100) : 0;
  const firstName = user?.name?.split(' ')[0] || 'User';

  const barColors = ['#B8F53A', '#4EEAFF', '#FFD600', '#AAAAAA'];

  return (
    <div className="p-7 space-y-5 max-w-[1600px] mx-auto">

      {/* ── ROW 1: Hero + 4 KPI cards ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto' }}>

        {/* Hero Card */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={staggerDelay(0)}
          className="row-span-2 rounded-3xl p-7 flex flex-col justify-between min-h-[300px]"
          style={{ background: 'linear-gradient(140deg, #C8F55A 0%, #EEFF9A 100%)' }}
          whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
        >
          <div>
            <p className="text-[#6B6B6B] text-[13px] font-medium">Welcome back</p>
            <h2 className="text-[28px] font-bold text-[#1A1A1A] leading-tight mt-0.5">Hello, {firstName} 👋</h2>
            <p className="text-[13px] text-[#6B6B6B] mt-1">
              {netProfitPositive
                ? 'Your financial health looks great this month.'
                : 'Expenses are exceeding revenue — review costs.'}
            </p>
          </div>

          <div className="flex justify-center my-3">
            <ArcMeter percent={Math.abs(profitMargin)} size={190} />
          </div>

          {/* Floating Stats with CountUp */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3.5">
              <p className="text-[11px] text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Revenue</p>
              <p className="font-mono font-bold text-[#1A1A1A] text-[15px]">
                {heroStarted
                  ? <CountUp start={0} end={kpis.revenue} duration={1.8} separator="," prefix="Rs. " useEasing />
                  : 'Rs. 0'}
              </p>
              <Badge variant="lime" className="mt-1.5 text-[10px]">This Month</Badge>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3.5">
              <p className="text-[11px] text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Expenses</p>
              <p className="font-mono font-bold text-[#1A1A1A] text-[15px]">
                {heroStarted
                  ? <CountUp start={0} end={kpis.expenses} duration={1.8} separator="," prefix="Rs. " useEasing />
                  : 'Rs. 0'}
              </p>
              <Badge variant="gray" className="mt-1.5 text-[10px]">This Month</Badge>
            </div>
          </div>
        </motion.div>

        {/* KPI 1 — Receivables */}
        <StatCard
          title="Accounts Receivable"
          value={formatCurrency(kpis.receivables)}
          countUp={{ end: kpis.receivables, prefix: 'Rs. ', separator: ',' }}
          badge="Outstanding"
          type="receivable"
          description="Total owed by customers"
          onClick={() => navigate('/receivables')}
          motionProps={{ variants: cardVariants, initial: 'initial', animate: 'animate', transition: staggerDelay(1) }}
        />

        {/* KPI 2 — Net Profit */}
        <StatCard
          title="Net Profit / Loss"
          value={formatCurrency(Math.abs(kpis.net_profit))}
          countUp={{ end: Math.abs(kpis.net_profit), prefix: 'Rs. ', separator: ',' }}
          badge={netProfitPositive ? 'Profit' : 'Loss'}
          type={netProfitPositive ? 'profit' : 'expense'}
          description={netProfitPositive ? 'Revenue is ahead of expenses' : 'Expenses exceed revenue this month'}
          onClick={() => navigate('/reports')}
          motionProps={{ variants: cardVariants, initial: 'initial', animate: 'animate', transition: staggerDelay(2) }}
        />

        {/* KPI 3 — Payables */}
        <StatCard
          title="Accounts Payable"
          value={formatCurrency(kpis.payables)}
          countUp={{ end: kpis.payables, prefix: 'Rs. ', separator: ',' }}
          badge="Due to Suppliers"
          type="payable"
          description="Total outstanding supplier payments"
          onClick={() => navigate('/payables')}
          motionProps={{ variants: cardVariants, initial: 'initial', animate: 'animate', transition: staggerDelay(3) }}
        />

        {/* KPI 4 — Overdue */}
        <StatCard
          title="Overdue Invoices"
          value={formatCurrency(kpis.overdue_amount)}
          countUp={{ end: kpis.overdue_amount, prefix: 'Rs. ', separator: ',' }}
          badge={`${kpis.overdue_count} invoice${kpis.overdue_count !== 1 ? 's' : ''}`}
          type="expense"
          description="Require immediate follow-up"
          onClick={() => navigate('/sales')}
          motionProps={{ variants: cardVariants, initial: 'initial', animate: 'animate', transition: staggerDelay(4) }}
        />
      </div>

      {/* ── ROW 2: Bank & Cash + Upcoming Due + Salary ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Bank & Cash */}
        <motion.div
          variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(2)}
          className="col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB]"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">Bank & Cash Balances</h3>
              <p className="text-[12px] text-[#AAAAAA] mt-0.5">Liquidity overview</p>
            </div>
            <button
              onClick={() => navigate('/bank-cash')}
              className="text-[12px] text-[#6B6B6B] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors"
            >
              Details <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="space-y-5">
            {bankAccounts.length > 0 ? (
              bankAccounts.slice(0, 4).map((acc, i) => (
                <BankBar
                  key={acc.id || i}
                  name={acc.account_name || acc.name || `Account ${i + 1}`}
                  amount={acc.balance || 0}
                  maxAmount={kpis.cash_bank}
                  color={barColors[i % barColors.length]}
                />
              ))
            ) : (
              <BankBar
                name="Total Cash & Bank"
                amount={kpis.cash_bank}
                maxAmount={kpis.cash_bank}
                color="#B8F53A"
              />
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#F5F5F0] flex justify-between items-center">
            <span className="text-[13px] text-[#6B6B6B]">Total Balance</span>
            <span className="font-mono font-bold text-[22px] text-[#1A1A1A]">{formatCurrency(kpis.cash_bank)}</span>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Upcoming Due */}
          <motion.div
            variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(3)}
            className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB] flex-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1A1A1A] text-[14px]">Due in 7 Days</h3>
              <Clock size={15} className="text-[#FFD600]" />
            </div>
            <div className="space-y-3">
              {upcoming_due.slice(0, 3).map(inv => (
                <div key={inv.id} className="flex items-center justify-between">
                  <div className="min-w-0 mr-2">
                    <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{inv.customer_name}</p>
                    <p className="text-[11px] text-[#AAAAAA]">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[13px] font-semibold text-[#FF4444]">{formatCurrency(inv.balance_due)}</p>
                    <StatusBadge status={inv.payment_status} />
                  </div>
                </div>
              ))}
              {upcoming_due.length === 0 && (
                <p className="text-[13px] text-[#AAAAAA] text-center py-3">No upcoming due invoices</p>
              )}
            </div>
          </motion.div>

          {/* Pending Salary */}
          <motion.div
            variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(4)}
            className="bg-[#1A1A1A] rounded-2xl p-5"
            whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.20)' }}
          >
            <p className="text-[11px] text-[#AAAAAA] uppercase tracking-wide mb-1">Pending Salary</p>
            <p className="font-mono font-bold text-[24px] text-white leading-tight">{formatCurrency(kpis.pending_salary)}</p>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">This month</p>
            <button
              onClick={() => navigate('/payroll')}
              className="mt-3 text-[12px] text-[#B8F53A] hover:underline flex items-center gap-1"
            >
              Manage payroll <ArrowUpRight size={11} />
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── ROW 3: Monthly Chart + Recent Invoices ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Monthly P&L Bar Chart */}
        <motion.div
          variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(1)}
          className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB]"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">Monthly Overview</h3>
              <p className="text-[12px] text-[#AAAAAA] mt-0.5">Income vs Expenses — 6 months</p>
            </div>
            <Badge variant="lime">{formatCurrency(kpis.revenue)}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={monthly_data} barCategoryGap="28%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#AAAAAA' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#AAAAAA' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatCurrency={formatCurrency} />} cursor={{ fill: '#F5F5F0' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6B6B6B' }} />
              <Bar dataKey="income" fill="#B8F53A" name="Income" radius={[6, 6, 0, 0]}
                animationBegin={300} animationDuration={1200} animationEasing="ease-out" />
              <Bar dataKey="expense" fill="#1A1A1A" name="Expenses" radius={[6, 6, 0, 0]}
                animationBegin={400} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Sales Table */}
        <motion.div
          variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(2)}
          className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB] overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-[#EBEBEB] flex items-center justify-between">
            <h3 className="font-semibold text-[#1A1A1A]">Recent Sales</h3>
            <button
              onClick={() => navigate('/sales')}
              className="text-[12px] text-[#6B6B6B] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-4 px-6 py-2.5 bg-[#FAFAFA] text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider">
            <span>Invoice</span>
            <span>Customer</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#F5F5F0]">
            {recent_sales.length > 0 ? recent_sales.slice(0, 7).map((inv, index) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
                className="grid grid-cols-4 px-6 py-3 items-center hover:bg-[#F8FFE8] transition-colors cursor-pointer"
                onClick={() => navigate('/sales')}
              >
                <span className="font-mono text-[12px] font-medium text-[#1A1A1A]">{inv.invoice_number}</span>
                <span className="text-[13px] text-[#1A1A1A] truncate pr-2">{inv.customer_name}</span>
                <span className="font-mono text-[13px] font-semibold text-[#1A1A1A] text-right">{formatCurrency(inv.total_amount)}</span>
                <div className="flex justify-end">
                  <StatusBadge status={inv.payment_status} />
                </div>
              </motion.div>
            )) : (
              <div className="flex items-center justify-center h-32 text-[#AAAAAA] text-[13px]">
                No sales invoices yet
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        variants={cardVariants} initial="initial" animate="animate" transition={staggerDelay(3)}
        className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB]"
      >
        <h3 className="font-semibold text-[#1A1A1A] mb-4">Quick Actions</h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'New Sales Invoice', path: '/sales/new', variant: 'lime' },
            { label: 'New Purchase',      path: '/purchases/new', variant: 'dark' },
            { label: 'New Voucher',       path: '/vouchers/new', variant: 'ghost' },
            { label: 'New Expense',       path: '/expenses/new', variant: 'ghost' },
          ].map(({ label, path, variant }) => (
            <motion.button
              key={path}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-full transition-colors
                ${variant === 'lime'  ? 'bg-[#B8F53A] text-[#1A1A1A] hover:bg-[#A8E52A]' : ''}
                ${variant === 'dark'  ? 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]' : ''}
                ${variant === 'ghost' ? 'border border-[#EBEBEB] text-[#6B6B6B] hover:border-[#1A1A1A] hover:text-[#1A1A1A]' : ''}
              `}
            >
              <Plus size={14} /> {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
