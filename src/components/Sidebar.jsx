import { NavLink } from 'react-router-dom';
import {
  BarChart3, BookOpen, Calculator, CreditCard, FileText, Landmark,
  LayoutDashboard, LogOut, Receipt, Settings, ShoppingBag, TrendingDown, TrendingUp, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const menuGroups = [
  {
    title: 'MAIN',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { path: '/accounts', label: 'Accounts', icon: BookOpen },
    ],
  },
  {
    title: 'TRANSACTIONS',
    items: [
      { path: '/vouchers', label: 'Vouchers', icon: FileText },
      { path: '/sales', label: 'Sales', icon: Receipt },
      { path: '/purchases', label: 'Purchases', icon: ShoppingBag },
      { path: '/expenses', label: 'Expenses', icon: CreditCard },
    ],
  },
  {
    title: 'LEDGERS',
    items: [
      { path: '/bank-cash', label: 'Bank & Cash', icon: Landmark },
      { path: '/receivables', label: 'Receivables', icon: TrendingUp },
      { path: '/payables', label: 'Payables', icon: TrendingDown },
    ],
  },
  {
    title: 'HR & TAX',
    items: [
      { path: '/payroll', label: 'Payroll', icon: Users },
      { path: '/tax', label: 'Tax / GST', icon: Calculator },
      { path: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { settings } = useApp();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="w-56 bg-white flex flex-col h-screen overflow-hidden fixed left-0 top-0 bottom-0 z-40 border-r border-gray-100 shadow-sm">
      {/* Logo */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm">
            A
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">AccountPro</div>
            <div className="text-[10px] text-gray-400 truncate max-w-[110px]">
              {settings.company_name || 'My Company'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold text-gray-400 px-2 mb-1 tracking-widest uppercase">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-green-500 text-white font-medium shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={15} className="shrink-0" />
                        <span className="flex-1 text-[13px]">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-gray-800 truncate">{user?.name || 'User'}</div>
            <div className="text-[10px] text-gray-400 capitalize">{user?.role || 'viewer'}</div>
          </div>
          <button
            onClick={logout}
            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
