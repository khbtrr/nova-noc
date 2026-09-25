import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, Clock } from 'lucide-react';

interface HistoricalChartProps {
  deviceId?: string | number;
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ deviceId = 1 }) => {
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'traffic'>('cpu');

  const { data: metricsHistory, isLoading } = useQuery({
    queryKey: ['metrics-history', deviceId, timeRange],
    queryFn: () => metricsApi.getMetricsHistory(String(deviceId), timeRange),
    refetchInterval: 30000,
  });

  // Transform into recharts format
  const chartData = React.useMemo(() => {
    if (metricsHistory && Array.isArray((metricsHistory as any).timestamps)) {
      const hist = metricsHistory as any;
      return hist.timestamps.map((t: string, idx: number) => ({
        time: t,
        cpu: hist.cpu?.[idx] ?? 0,
        memory: hist.memory?.[idx] ?? 0,
        rx: hist.rx?.[idx] ?? 0,
        tx: hist.tx?.[idx] ?? 0,
      }));
    }

    return [];
  }, [metricsHistory]);

  const metricConfig = {
    cpu: {
      dataKey: 'cpu',
      color: '#06b6d4',
      unit: '%',
      label: 'CPU Load',
    },
    memory: {
      dataKey: 'memory',
      color: '#a855f7',
      unit: '%',
      label: 'Memory Usage',
    },
    traffic: {
      dataKey: 'rx',
      color: '#10b981',
      unit: ' Kbps',
      label: 'Traffic Bandwidth',
    },
  }[selectedMetric];

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-cyan-400" />
            Tren Metrik Historis
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Analisis telemetri perangkat jaringan secara komparatif
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Selector */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMetric('cpu')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedMetric === 'cpu' ? 'bg-cyan-500/20 text-cyan-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CPU
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('memory')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedMetric === 'memory' ? 'bg-purple-500/20 text-purple-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RAM
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('traffic')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedMetric === 'traffic' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bandwidth
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeRange === range ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) => [`${value}${metricConfig.unit}`, metricConfig.label]}
                />
                <Area
                  type="monotone"
                  dataKey={metricConfig.dataKey}
                  stroke={metricConfig.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#metricGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 w-full flex flex-col items-center justify-center text-slate-400">
            <Clock className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-300">Belum ada riwayat telemetri perangkat</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data grafik tren akan terisi otomatis seiring interval polling berjalan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
