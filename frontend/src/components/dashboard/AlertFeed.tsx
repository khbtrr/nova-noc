import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertTriangle, CheckCircle2, Bell } from 'lucide-react';

export default function AlertFeed() {
  const { activeAlerts, acknowledgeAlert } = useAlerts();

  const alerts = activeAlerts.length > 0 ? activeAlerts : [
    {
      id: 1,
      device_name: 'MikroTik CCR2004',
      severity: 'INFO',
      message: 'Sistem monitoring NOVA NOC berhasil terhubung dan memantau interface real-time.',
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      is_acknowledged: false,
    }
  ];

  const getSeverityStyle = (sev: string = 'INFO') => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL') return 'border-l-red-500 bg-red-500/5 text-red-400';
    if (s === 'WARNING') return 'border-l-amber-500 bg-amber-500/5 text-amber-400';
    return 'border-l-cyan-500 bg-cyan-500/5 text-cyan-400';
  };

  return (
    <Card className="flex flex-col border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
            <Bell className="h-4 w-4 text-amber-400" />
            Live Alert Feed
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
              {alerts.filter((a: any) => !a.is_acknowledged && !a.acknowledged).length} aktif
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[280px] w-full">
          <div className="flex flex-col divide-y divide-slate-800/80">
            {alerts.map((alert: any) => {
              const timeStr = alert.created_at || alert.timestamp || new Date().toISOString();
              let relativeTime = 'baru saja';
              try {
                relativeTime = formatDistanceToNow(new Date(timeStr), { addSuffix: true });
              } catch {}

              const isAck = Boolean(alert.is_acknowledged || alert.acknowledged);

              return (
                <div 
                  key={alert.id} 
                  className={`p-3.5 border-l-4 ${getSeverityStyle(alert.severity)} hover:bg-slate-800/30 transition-colors group`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200 truncate">
                          {alert.device_name || `Perangkat #${alert.device_id}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 uppercase font-mono font-medium text-slate-300">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{alert.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {relativeTime}
                      </span>
                      {!isAck ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="h-6 px-2 text-[10px] text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 border border-cyan-500/20"
                        >
                          Acknowledge
                        </Button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ack
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
