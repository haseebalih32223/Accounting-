import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const navGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    activePaths: ['/'],
    exact: true,
  },
  {
    id: 'vouchers',
    label: 'Vouchers',
    activePaths: ['/vouchers'],
    items: [
      { label: 'All Vouchers', path: '/vouchers' },
      { label: 'New Journal Voucher', path: '/vouchers/new' },
    ],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    activePaths: ['/sales', '/purchases', '/expenses'],
    items: [
      { label: 'Sales Invoices', path: '/sales' },
      { label: 'New Sales Invoice', path: '/sales/new' },
      { label: 'Purchase Invoices', path: '/purchases' },
      { label: 'New Purchase Invoice', path: '/purchases/new' },
      { label: 'Expenses', path: '/expenses' },
    ],
  },
  {
    id: 'ledgers',
    label: 'Ledgers',
    activePaths: ['/accounts', '/bank-cash', '/receivables', '/payables', '/contacts'],
    items: [
      { label: 'Chart of Accounts', path: '/accounts' },
      { label: 'Bank & Cash', path: '/bank-cash' },
      { label: 'Receivables', path: '/receivables' },
      { label: 'Payables', path: '/payables' },
      { label: 'Customers & Suppliers', path: '/contacts' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    activePaths: ['/reports'],
    items: [
      { label: 'All Reports', path: '/reports' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Tax',
    activePaths: ['/payroll', '/tax'],
    items: [
      { label: 'Payroll', path: '/payroll' },
      { label: 'Tax / GST', path: '/tax' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    activePaths: ['/settings'],
  },
];

export default function TopNav() {
  const { user, logout } = useAuth();
  const { settings } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function isGroupActive(group) {
    if (group.exact) return location.pathname === group.path;
    if (group.path) return location.pathname.startsWith(group.path);
    return group.activePaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  }

  function handleNavClick(group) {
    if (group.path) {
      navigate(group.path);
      setOpenMenu(null);
    } else {
      setOpenMenu(openMenu === group.id ? null : group.id);
    }
  }

  function handleItemClick(path) {
    navigate(path);
    setOpenMenu(null);
  }

  return (
    <div
      className="h-16 bg-[#F5F5F0] border-b border-[#EBEBEB] px-6 flex items-center justify-between sticky top-0 z-50"
      ref={navRef}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <div className="w-3.5 h-3.5 rounded-full bg-[#B8F53A]" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#1A1A1A]" />
        </div>
        <span className="font-bold text-[#1A1A1A] text-[15px] tracking-tight">AccountPro</span>
        {settings.company_name && (
          <span className="text-[11px] text-[#AAAAAA] hidden xl:block">{settings.company_name}</span>
        )}
      </div>

      {/* ── Nav Pills ── */}
      <nav className="flex items-center gap-0.5">
        {navGroups.map(group => {
          const active = isGroupActive(group);
          const isOpen = openMenu === group.id;
          return (
            <div key={group.id} className="relative">
              {/* Sliding active pill background */}
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-[#1A1A1A] rounded-full"
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  />
                )}
                <button
                  onClick={() => handleNavClick(group)}
                  className={`relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors duration-150
                    ${active
                      ? 'text-white'
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#EBEBEB]'
                    }`}
                >
                  {group.label}
                  {group.items && (
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex' }}
                    >
                      <ChevronDown size={12} />
                    </motion.span>
                  )}
                </button>
              </div>

              {/* Animated Dropdown */}
              <AnimatePresence>
                {group.items && isOpen && (
                  <motion.div
                    key={`dropdown-${group.id}`}
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{   opacity: 0, y: -4,  scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#EBEBEB] py-2 z-50"
                  >
                    {group.items.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleItemClick(item.path)}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Right: Bell + User ── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className="w-9 h-9 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors"
        >
          <Bell size={16} />
        </motion.button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#B8F53A] flex items-center justify-center text-xs font-bold text-[#1A1A1A] flex-shrink-0">
            {initials}
          </div>
          <div className="hidden lg:block">
            <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight">{user?.name || 'User'}</div>
            <div className="text-[10px] text-[#AAAAAA] capitalize leading-tight">{user?.role || ''}</div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={logout}
          className="w-8 h-8 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center text-[#AAAAAA] hover:text-[#FF4444] hover:border-[#FF4444] transition-colors"
          title="Logout"
        >
          <LogOut size={13} />
        </motion.button>
      </div>
    </div>
  );
}
