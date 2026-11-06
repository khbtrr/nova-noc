import React from 'react';
import { Router, Server, Cpu, HardDrive, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Device } from '@/types/device';
import { formatUptime } from '@/lib/utils';
import { useDeviceMetrics } from '@/hooks/useMetrics';

interface DeviceCardProps {
  device: Device;
  onClick?: (id: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick }) => {
  const { metrics } = useDeviceMetrics(device.id);
  const statusUpper = device.status?.toUpperCase() || 'OFFLINE';
  const isOnline = statusUpper === 'ONLINE';
  const isWarning = statusUpper === 'WARNING';

  const cpu = metrics?.cpu_load ?? device.cpu_load ?? 0;
  const mem = metrics?.memory_usage ?? device.memory_usage ?? 0;
  const uptimeVal = metrics?.uptime ?? device.uptime ?? 0;
  const devType = (device.device_type || device.type || 'SNMP').toUpperCase();
  const hostIp = device.host || device.ip_address || '0.0.0.0';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(String(device.id));
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(String(device.id))}
      onKeyDown={handleKeyDown}
      className="bg-slate-900 border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-cyan-400 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
              {devType === 'MIKROTIK' ? <Router className="h-5 w-5" /> : <Server className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">{device.name}</h4>
              <p className="text-xs font-mono text-slate-400">{hostIp}</p>
            </div>
          </div>

          <Badge variant={isOnline ? 'success' : isWarning ? 'warning' : 'destructive'} className="uppercase text-[10px]">
            <span className="relative flex h-1.5 w-1.5 mr-1.5">
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isOnline ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </span>
            {device.status}
          </Badge>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Beban CPU
              </span>
              <span className="font-mono text-slate-200">{cpu}%</span>
            </div>
            <Progress value={cpu} indicatorClassName={cpu > 80 ? 'bg-rose-500' : cpu > 60 ? 'bg-amber-500' : 'bg-cyan-500'} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-sky-400" /> Memori
              </span>
              <span className="font-mono text-slate-200">{mem}%</span>
            </div>
            <Progress value={mem} indicatorClassName={mem > 85 ? 'bg-rose-500' : 'bg-sky-500'} />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            {typeof uptimeVal === 'number' ? formatUptime(uptimeVal) : uptimeVal || 'N/A'}
          </span>
          <span className="uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{devType}</span>
        </div>
      </CardContent>
    </Card>
  );
};
