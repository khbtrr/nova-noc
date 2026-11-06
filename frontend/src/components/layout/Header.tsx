import React, { useState, useEffect } from 'react';
import { Bell, Clock, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Buka menu navigasi"
            className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1.5 rounded-full bg-slate-950 border border-slate-800">
          <span className="relative flex h-2 w-2">
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </span>
          <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
            {isConnected ? 'STREAM AKTIF' : 'TERPUTUS'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-950/60 px-3 py-1.5 rounded-md border border-slate-800/60">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>{time.toUTCString()}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/alerts')}
          aria-label="Lihat peringatan"
          className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 min-h-[44px] px-2 py-1 rounded-lg hover:bg-slate-800/60 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200 leading-none">{user?.username || 'Admin'}</p>
            <p className="text-xs text-slate-400 mt-1 capitalize">{user?.role || 'Administrator'}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
        </button>
      </div>
    </header>
  );
};
