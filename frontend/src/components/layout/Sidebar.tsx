import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, Server, ShieldAlert, Bot, Settings, LogOut, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/devices', icon: Server, label: 'Perangkat' },
    { to: '/topology', icon: Network, label: 'Topologi Jaringan' },
    { to: '/alerts', icon: ShieldAlert, label: 'Alert & Insiden' },
    { to: '/ai', icon: Bot, label: 'Asisten Diagnostik' },
    { to: '/settings', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Brand */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800 gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <span className="text-base font-bold tracking-wider text-slate-100 block leading-tight">NOVA</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-medium">NOC Operations & Telemetry</span>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                isActive 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-800 p-3 bg-slate-950/80">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-semibold text-slate-200 leading-none">{user?.username || 'admin'}</p>
            <p className="text-[10px] text-slate-500 mt-1 truncate">{user?.email || 'admin@nova.local'}</p>
          </div>
          <button 
            onClick={logout} 
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" 
            title="Keluar dari Sistem"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
