import React from 'react';
import { Server, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDevices } from '@/hooks/useDevices';
import { useAlertStore } from '@/stores/alertStore';
import { useAI } from '@/hooks/useAI';

export default function OverviewPanel() {
  const { devices } = useDevices();
  const { unreadCount } = useAlertStore();
  const { healthScores } = useAI();

  const total = devices?.length ?? 0;
  const online = devices?.filter((d: any) => d.status?.toUpperCase() === 'ONLINE').length ?? 0;
  const offline = devices?.filter((d: any) => d.status?.toUpperCase() === 'OFFLINE').length ?? 0;
  const rawScore = healthScores?.overall_health_score;
  const scoreDisplay = rawScore != null ? `${rawScore}%` : '-';

  const stats = [
    { label: 'Total Perangkat', value: total, icon: Server, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Online / Aktif', value: online, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Offline / Down', value: offline, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Alert Aktif', value: unreadCount, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Health Score Sistem', value: scoreDisplay, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{stat.label}</p>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-2xl font-bold mt-1 text-slate-100">{stat.value}</h3>
              </div>
            </div>
            <div className={`p-3 rounded-xl border border-slate-800/80 ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
