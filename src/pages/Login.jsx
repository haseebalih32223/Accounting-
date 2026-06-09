import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    const result = await login(form.username, form.password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(184,245,58,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(184,245,58,0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-4">
            <div className="w-5 h-5 rounded-full bg-[#B8F53A]" />
            <div className="w-5 h-5 rounded-full bg-[#1A1A1A]" />
          </div>
          <h1 className="text-[32px] font-bold text-[#1A1A1A] tracking-tight">AccountPro</h1>
          <p className="text-[#AAAAAA] mt-1 text-[13px]">Professional Accounting Software</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-[#EBEBEB]">
          <h2 className="text-[18px] font-semibold text-[#1A1A1A] mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="Enter username"
                className="w-full bg-[#F5F5F0] border border-transparent rounded-xl px-4 py-3 text-[#1A1A1A] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#B8F53A] focus:bg-white focus:shadow-[0_0_0_3px_rgba(184,245,58,0.15)] transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full bg-[#F5F5F0] border border-transparent rounded-xl px-4 py-3 pr-11 text-[#1A1A1A] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#B8F53A] focus:bg-white focus:shadow-[0_0_0_3px_rgba(184,245,58,0.15)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B8F53A] hover:bg-[#A8E52A] disabled:opacity-50 text-[#1A1A1A] font-bold py-3 rounded-full transition-all active:scale-95 text-[14px] mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 p-3.5 bg-[#F5F5F0] rounded-2xl">
            <p className="text-[11px] text-[#AAAAAA] font-semibold mb-1.5">Default Credentials</p>
            <p className="text-[12px] text-[#6B6B6B]">Username: <span className="text-[#1A1A1A] font-mono font-medium">admin</span></p>
            <p className="text-[12px] text-[#6B6B6B]">Password: <span className="text-[#1A1A1A] font-mono font-medium">admin123</span></p>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#AAAAAA] mt-5">
          AccountPro v1.0 · 100% Offline · Data stored locally
        </p>
      </div>
    </div>
  );
}
