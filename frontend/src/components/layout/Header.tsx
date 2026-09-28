import React from 'react';
import { Bell, Search, Activity, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlertStore } from '@/stores/alertStore';
import { useAuthStore } from '@/stores/authStore';

interface HeaderProps {
  isWsConnected?: boolean;
}

export default function Header({ isWsConnected = false }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useAlertStore();
  const { user } = useAuthStore();
  
  const getPageTitle = () => {
    switch (true) {
      case location.pathname === '/': return 'Network Overview & Monitoring';
      case location.pathname.startsWith('/devices/'): return 'Detail Perangkat Jaringan';
      case location.pathname === '/devices': return 'Manajemen Perangkat';
      case location.pathname === '/topology': return 'Topologi Jaringan';
      case location.pathname === '/alerts': return 'Alert & Insiden';
      case location.pathname === '/ai': return 'NOVA NOC Diagnostics';
      case location.pathname === '/settings': return 'Pengaturan Sistem';
      default: return 'NOVA NOC';
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-100">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Real-time Telemetry Indicator */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-[11px] font-mono"
          title={isWsConnected ? 'Telemetri Real-time Terhubung' : 'Mencoba Menyambungkan ke Server...'}
        >
          <span className={`h-2 w-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className={isWsConnected ? 'text-emerald-400' : 'text-amber-400'}>
            {isWsConnected ? 'LIVE' : 'SYNCING'}
          </span>
        </div>

        {/* Notification Bell */}
        <button 
          onClick={() => navigate('/alerts')}
          className="relative rounded-xl p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
          title="Lihat Alert"
          aria-label="Lihat notifikasi alert"
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
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium uppercase ${isAdmin ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {user?.role || 'admin'}
          </span>
        </div>
      </div>
    </header>
  );
}

