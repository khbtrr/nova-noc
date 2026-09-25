import React from 'react';
import { Bell, Search, Activity, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlertStore } from '@/stores/alertStore';
import { useAuthStore } from '@/stores/authStore';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useAlertStore();
  const { user } = useAuthStore();
  
  const getPageTitle = () => {
    switch (true) {
      case location.pathname === '/': return 'Network Overview & Monitoring';
      case location.pathname.startsWith('/devices/'): return 'Detail Perangkat Jaringan';
      case location.pathname === '/devices': return 'Manajemen Perangkat';
      case location.pathname === '/alerts': return 'Alert & Insiden';
      case location.pathname === '/ai': return 'NOVA NOC Diagnostics';
      case location.pathname === '/settings': return 'Pengaturan Sistem';
      default: return 'NOVA NOC';
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-100">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button 
          onClick={() => navigate('/alerts')}
          className="relative rounded-xl p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
          title="Lihat Alert"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Pill */}
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-semibold">
            {user?.username ? user.username[0].toUpperCase() : 'A'}
          </div>
          <span className="text-xs font-medium text-slate-300 hidden sm:inline">
            {user?.username || 'admin'}
          </span>
        </div>
      </div>
    </header>
  );
}
