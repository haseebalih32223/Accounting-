import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import TopNav from './components/TopNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChartOfAccounts from './pages/ChartOfAccounts';
import Vouchers, { VoucherForm } from './pages/Vouchers';
import SalesInvoice, { InvoiceForm } from './pages/SalesInvoice';
import PurchaseInvoice, { PurchaseForm } from './pages/PurchaseInvoice';
import Expenses from './pages/Expenses';
import BankCash from './pages/BankCash';
import Receivables from './pages/Receivables';
import Payables from './pages/Payables';
import Payroll from './pages/Payroll';
import Tax from './pages/Tax';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Contacts from './pages/Contacts';

function Layout() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#AAAAAA] text-sm">Loading AccountPro...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<ChartOfAccounts />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/vouchers/new" element={<VoucherForm />} />
        <Route path="/vouchers/edit/:voucherId" element={<VoucherFormRoute />} />
        <Route path="/sales" element={<SalesInvoice />} />
        <Route path="/sales/new" element={<InvoiceForm />} />
        <Route path="/sales/edit/:invoiceId" element={<InvoiceFormRoute />} />
        <Route path="/purchases" element={<PurchaseInvoice />} />
        <Route path="/purchases/new" element={<PurchaseForm />} />
        <Route path="/purchases/edit/:invoiceId" element={<PurchaseFormRoute />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/bank-cash" element={<BankCash />} />
        <Route path="/receivables" element={<Receivables />} />
        <Route path="/payables" element={<Payables />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/tax" element={<Tax />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function VoucherFormRoute() {
  const { useParams } = require('react-router-dom');
  const { voucherId } = useParams();
  return <VoucherForm voucherId={voucherId} />;
}

function InvoiceFormRoute() {
  const { useParams } = require('react-router-dom');
  const { invoiceId } = useParams();
  return <InvoiceForm invoiceId={invoiceId} />;
}

function PurchaseFormRoute() {
  const { useParams } = require('react-router-dom');
  const { invoiceId } = useParams();
  return <PurchaseForm invoiceId={invoiceId} />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: '1px solid #2A2A2A',
                borderRadius: '14px',
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
              },
              success: {
                iconTheme: { primary: '#B8F53A', secondary: '#1A1A1A' },
              },
              error: {
                iconTheme: { primary: '#FF4444', secondary: '#FFFFFF' },
              },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
}
