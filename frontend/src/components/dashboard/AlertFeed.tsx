import React from 'react';
import { AlertTriangle, Check, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types/alert';
import { formatDate } from '@/lib/utils';

interface AlertFeedProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, onAcknowledge }) => {
  return (
    <Card className="bg-slate-900 border-slate-800/80 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <CardTitle className="text-base font-semibold text-slate-100">Aliran Peringatan Aktif</CardTitle>
        </div>
        <Badge variant={alerts.length > 0 ? 'destructive' : 'secondary'}>{alerts.length} Aktif</Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <BellOff className="h-8 w-8 mb-2 stroke-1" />
            <p className="text-sm">Tidak ada peringatan aktif</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const sev = alert.severity?.toUpperCase();
            return (
              <div
                key={alert.id}
                className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={sev === 'CRITICAL' ? 'destructive' : sev === 'WARNING' ? 'warning' : 'default'}
                      className="text-[10px] px-2 py-0"
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-200">{alert.device_name || `Device #${alert.device_id}`}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                  <p className="text-[10px] font-mono text-slate-400">{formatDate(alert.created_at)}</p>
                </div>

                {!alert.is_acknowledged && !alert.acknowledged && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAcknowledge(String(alert.id))}
                    aria-label="Konfirmasi peringatan"
                    className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
