import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Bell, Bot, Settings, LogOut, Activity, Network, Terminal, BarChart3, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dasbor', path: '/' },
    { icon: Server, label: 'Perangkat', path: '/devices' },
    { icon: Network, label: 'Topologi', path: '/topology' },
    { icon: BarChart3, label: 'Traffic Flow', path: '/flow' },
    { icon: Terminal, label: 'Syslog', path: '/syslog' },
    { icon: Bell, label: 'Peringatan', path: '/alerts' },
    { icon: Bot, label: 'Asisten AI', path: '/ai' },
    { icon: Settings, label: 'Pengaturan', path: '/settings' },
  ];

  const sidebarContent = (
    <aside className="flex flex-col w-64 h-full bg-slate-950 border-r border-slate-800/80 text-slate-300 select-none shrink-0">
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 text-cyan-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-wider text-white">NOVA</span>
            <span className="block text-[10px] text-cyan-400 font-mono tracking-widest uppercase">NOC Platform</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Navigasi
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-full shrink-0">
        {sidebarContent}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu Navigasi">
          <div
            className="fixed inset-0 bg-slate-950/80 transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
