import React from 'react';
import { Device } from '@/types/device';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';

interface DeviceCardProps {
  device: Device;
}

const CircularGauge = ({ value, color, label }: { value?: number | null; color: string; label: string }) => {
  const radius = 18;
  const circumference = radius * 2 * Math.PI;
  const hasValue = value != null;
  const clamped = hasValue ? Math.min(100, Math.max(0, value)) : 0;
  const offset = hasValue ? circumference - (clamped / 100) * circumference : circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg className="h-12 w-12 transform -rotate-90">
          <circle cx="24" cy="24" r={radius} className="stroke-slate-800" strokeWidth="3" fill="transparent" />
          <circle 
            cx="24" cy="24" r={radius} 
            className={cn("transition-all duration-700 ease-in-out", hasValue ? color : "stroke-slate-700")} 
            strokeWidth="3" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-bold text-slate-100">
          {hasValue ? `${Math.round(clamped)}%` : '-'}
        </span>
      </div>
      <span className="text-[10px] font-medium text-slate-400 mt-1">{label}</span>
    </div>
  );
};

export default function DeviceCard({ device }: DeviceCardProps) {
  const navigate = useNavigate();
  const host = device.host || device.ip_address || '127.0.0.1';
  const devType = device.device_type || device.type || 'MIKROTIK';
  const statusStr = String(device.status || 'ONLINE').toUpperCase();

  const { data: metrics } = useQuery({
    queryKey: ['metrics', device.id],
    queryFn: () => metricsApi.getMetrics(String(device.id)),
    refetchInterval: 15000,
  });

  const cpu = metrics?.cpu_load ?? device.cpu_load;
  const mem = metrics?.memory_usage ?? device.memory_usage;
  const uptime = metrics?.uptime ?? device.uptime ?? '-';

  const isOnline = statusStr === 'ONLINE';
  const isWarning = statusStr === 'WARNING';
  const isOffline = statusStr === 'OFFLINE';

  return (
    <Card 
      className="border-slate-800 bg-slate-900/50 backdrop-blur-xl hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.01]"
      onClick={() => navigate(`/devices/${device.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  isOnline ? "bg-emerald-500" : (isWarning ? "bg-amber-500" : "bg-red-500")
                )}></span>
              </span>
              <h4 className="font-semibold text-sm text-slate-100 truncate max-w-[140px]">{device.name}</h4>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{host}</p>
          </div>
          <span className="text-[10px] font-semibold bg-slate-800 text-cyan-400 px-2 py-0.5 rounded uppercase border border-slate-700">
            {String(devType)}
          </span>
        </div>
        
        <div className="flex justify-around items-center my-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <CircularGauge 
            value={cpu} 
            color={cpu && cpu > 80 ? 'stroke-red-500' : 'stroke-cyan-400'} 
            label="CPU Load" 
          />
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <CircularGauge 
            value={mem} 
            color={mem && mem > 85 ? 'stroke-red-500' : 'stroke-purple-400'} 
            label="RAM Usage" 
          />
        </div>
        
        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span className="truncate">Up: {String(uptime)}</span>
          <span className="text-cyan-400 hover:underline">Detail</span>
        </div>
      </CardContent>
    </Card>
  );
}
