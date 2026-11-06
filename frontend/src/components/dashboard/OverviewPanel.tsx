import React from 'react';
import { Server, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Device } from '@/types/device';

interface OverviewPanelProps {
  devices: Device[];
  activeAlertsCount: number;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({ devices, activeAlertsCount }) => {
  const total = devices.length;
  const online = devices.filter((d) => d.status?.toUpperCase() === 'ONLINE').length;
  const offline = devices.filter((d) => d.status?.toUpperCase() === 'OFFLINE').length;

  const avgCpu = total > 0
    ? Math.round(devices.reduce((acc, d) => acc + (d.cpu_load || 0), 0) / total)
    : 0;

  const stats = [
    {
      label: 'Total Perangkat',
      value: total,
      sub: 'Node terdaftar',
      icon: Server,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Node Online',
      value: online,
      sub: `${total ? Math.round((online / total) * 100) : 0}% ketersediaan`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Node Offline',
      value: offline,
      sub: offline > 0 ? 'Perlu perhatian' : 'Semua sistem normal',
      icon: XCircle,
      color: offline > 0 ? 'text-rose-400' : 'text-slate-400',
      bg: offline > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/50 border-slate-700/50',
    },
    {
      label: 'Peringatan Aktif',
      value: activeAlertsCount,
      sub: 'Insiden belum selesai',
      icon: AlertTriangle,
      color: activeAlertsCount > 0 ? 'text-amber-400' : 'text-emerald-400',
      bg: activeAlertsCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Rata-rata Beban CPU',
      value: `${avgCpu}%`,
      sub: 'Di seluruh perangkat aktif',
      icon: Activity,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="bg-slate-900 border-slate-800/80 shadow-lg">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold font-mono text-slate-100">{stat.value}</p>
              <p className="text-[11px] text-slate-400">{stat.sub}</p>
            </div>
            <div className={`p-3 rounded-xl border ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
