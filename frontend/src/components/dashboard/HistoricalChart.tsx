import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Clock } from 'lucide-react';
import { Device } from '@/types/device';
import { useMetricsHistory } from '@/hooks/useMetrics';

interface HistoricalChartProps {
  devices: Device[];
}

const TIME_RANGES = [
  { label: '15M', value: '15m' },
  { label: '1J', value: '1h' },
  { label: '6J', value: '6h' },
  { label: '24J', value: '24h' },
  { label: '7H', value: '7d' },
];

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ devices }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [metricType, setMetricType] = useState<'cpu_mem' | 'traffic' | 'latency' | 'wan_sla' | 'dual_wan'>('cpu_mem');
  const [timeRange, setTimeRange] = useState<string>('1h');

  const activeDeviceId = selectedDeviceId || (devices[0] ? String(devices[0].id) : '');
  const { history, isLoading } = useMetricsHistory(activeDeviceId, timeRange);

  const chartData = React.useMemo(() => {
    if (!history || !history.timestamps) return [];
    return history.timestamps.map((ts, idx) => {
      const dateObj = new Date(ts);
      const timeLabel = timeRange === '7d' || timeRange === '24h'
        ? dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        time: timeLabel,
        cpu: history.cpu?.[idx] ?? 0,
        memory: history.memory?.[idx] ?? 0,
        rx_mbps: Number(((history.rx?.[idx] ?? 0) / 1000).toFixed(2)),
        tx_mbps: Number(((history.tx?.[idx] ?? 0) / 1000).toFixed(2)),
        latency: Number((history.latency?.[idx] ?? 0).toFixed(2)),
        packet_loss: Number((history.packet_loss?.[idx] ?? 0).toFixed(1)),
        wan_latency: Number((history.wan_latency?.[idx] ?? 0).toFixed(2)),
        wan_packet_loss: Number((history.wan_packet_loss?.[idx] ?? 0).toFixed(1)),
        jlm_latency: Number((history.jlm_latency?.[idx] ?? 0).toFixed(2)),
        ion_latency: Number((history.ion_latency?.[idx] ?? 0).toFixed(2)),
      };
    });
  }, [history, timeRange]);

  return (
    <Card className="bg-slate-900 border-slate-800/80">
      <CardHeader className="flex flex-col gap-3 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              Tren Metrik Historis
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Riwayat performa perangkat dari time-series InfluxDB ({timeRange.toUpperCase()})
            </p>
          </div>

          <select
            value={activeDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            aria-label="Pilih perangkat"
            className="min-h-[40px] rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {devices.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name} ({d.host})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-1">
            {[
              { id: 'cpu_mem', label: 'CPU & Memori' },
              { id: 'traffic', label: 'Bandwidth' },
              { id: 'latency', label: 'Ping Lokal' },
              { id: 'wan_sla', label: 'Kualitas WAN' },
              { id: 'dual_wan', label: 'Primary vs Secondary' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMetricType(item.id as any)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded font-medium transition-colors ${
                  metricType === item.id ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <Clock className="h-3.5 w-3.5 text-slate-400 ml-1.5 mr-1" />
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setTimeRange(r.value)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded font-mono text-[11px] transition-colors ${
                  timeRange === r.value
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Memuat data historis...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400 border border-dashed border-slate-800 rounded-lg">
              Belum ada titik data historis untuk perangkat ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {metricType === 'cpu_mem' ? (
                  <>
                    <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="memory" name="Memori (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </>
                ) : metricType === 'traffic' ? (
                  <>
                    <Line type="monotone" dataKey="rx_mbps" name="RX (Mbps)" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="tx_mbps" name="TX (Mbps)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </>
                ) : metricType === 'latency' ? (
                  <>
                    <Line type="monotone" dataKey="latency" name="RTT Server ke Router (ms)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="packet_loss" name="Loss (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </>
                ) : metricType === 'wan_sla' ? (
                  <>
                    <Line type="monotone" dataKey="wan_latency" name="RTT WAN Internet (ms)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wan_packet_loss" name="WAN Packet Loss (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </>
                ) : (
                  <>
                    <Line type="monotone" dataKey="jlm_latency" name="Primary Gateway (ms)" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ion_latency" name="Secondary Gateway (ms)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
