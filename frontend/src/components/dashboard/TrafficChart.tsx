import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatLocalTime } from '@/lib/utils';
import { useDevices } from '@/hooks/useDevices';
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';
import { aiApi } from '@/services/aiApi';
import { ArrowDownUp, AlertTriangle } from 'lucide-react';

export default function TrafficChart() {
  const { devices } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const activeDeviceId = selectedDeviceId || (devices?.[0]?.id ? String(devices[0].id) : '');

  const { data: metricsHistory } = useQuery({
    queryKey: ['traffic-history', activeDeviceId],
    queryFn: () => (activeDeviceId ? metricsApi.getMetricsHistory(activeDeviceId, '1h') : Promise.resolve([])),
    enabled: Boolean(activeDeviceId),
    refetchInterval: 15000,
  });

  const { data: activeAnomalies = [] } = useQuery({
    queryKey: ['active-anomalies'],
    queryFn: () => aiApi.getActiveAnomalies(),
    refetchInterval: 10000,
  });

  const currentAnomaly = activeAnomalies.find((a: any) => String(a.device_id) === String(activeDeviceId));

  const chartData = useMemo(() => {
    if (metricsHistory && Array.isArray((metricsHistory as any).timestamps)) {
      const hist = metricsHistory as any;
      return hist.timestamps.map((t: string, idx: number) => ({
        time: formatLocalTime(t, true),
        rx: Number((Number(hist.rx?.[idx] ?? 0) / 1000).toFixed(2)),
        tx: Number((Number(hist.tx?.[idx] ?? 0) / 1000).toFixed(2)),
      }));
    }
    return [];
  }, [metricsHistory]);

  const hasData = chartData.length > 0;

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/80">
        <div>
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-cyan-400" />
            Trafik Bandwidth Real-Time
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Monitoring throughput transmisi data RX/TX dalam Mbps
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          {currentAnomaly && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Anomali: {currentAnomaly.type === 'TRAFFIC_SPIKE' ? 'Lonjakan Trafik' : 'Drop Trafik'} ({currentAnomaly.deviation_percent > 0 ? `+${currentAnomaly.deviation_percent}%` : `${currentAnomaly.deviation_percent}%`})</span>
            </div>
          )}

          {devices && devices.length > 0 && (
            <select
              value={activeDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {devices.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.host || d.ip_address})
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col justify-center">
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis 
                axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}}
                tickFormatter={(value) => `${value} Mbps`}
                width={70}
              />
              <Tooltip 
                contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px'}}
                formatter={(value: number) => [`${Number(value).toFixed(2)} Mbps`, undefined]}
              />
              <Area type="monotone" dataKey="rx" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRx)" name="RX (Download)" />
              <Area type="monotone" dataKey="tx" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" name="TX (Upload)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <ArrowDownUp className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">Belum ada aliran telemetri trafik</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeDeviceId 
                ? 'Menunggu polling pertama atau perangkat sedang offline.' 
                : 'Daftarkan perangkat untuk melihat grafik throughput.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
