import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { user } = useAuth();
  const { settings } = useApp();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Search */}
      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:bg-white transition-colors"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <Bell size={17} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200"></div>

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700 leading-tight">{user?.name || 'User'}</div>
            <div className="text-[11px] text-gray-400 capitalize">{user?.role || ''}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}
