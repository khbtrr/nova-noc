import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ShieldAlert, CheckCircle2, Sparkles, RefreshCw, Terminal, Zap } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useDeviceMetrics, useActiveAnomalies } from '@/hooks/useMetrics';
import { remediationApi } from '@/services/remediationApi';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface TrafficPoint {
  time: string;
  rx: number;
  tx: number;
}

export const TrafficChart: React.FC = () => {
  const { devices } = useDevices();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const primaryDevice = devices.find((d) => d.status?.toUpperCase() === 'ONLINE') || devices[0];
  const { metrics } = useDeviceMetrics(primaryDevice?.id || '');
  const { activeAnomalies, resolveAnomaly } = useActiveAnomalies();
  const [data, setData] = useState<TrafficPoint[]>([]);
  const [execAction, setExecAction] = useState<string | null>(null);

  const handleQuickRemediation = async (deviceId: number, actionType: string, target: string = 'global') => {
    setExecAction(`${deviceId}-${actionType}`);
    try {
      const res = await remediationApi.executeAction({
        device_id: deviceId,
        action_type: actionType,
        target,
      });
      if (res.success) {
        toast.success(`[NOVA Act] ${res.message}`);
        if (actionType === 'ACKNOWLEDGE') {
          resolveAnomaly(deviceId);
        }
      } else {
        toast.error(`[NOVA Act] ${res.message}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengeksekusi aksi remediasi.');
    } finally {
      setExecAction(null);
    }
  };

  useEffect(() => {
    if (!metrics) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const rxMbps = Number(((metrics.rx_kbps || 0) / 1000).toFixed(2));
    const txMbps = Number(((metrics.tx_kbps || 0) / 1000).toFixed(2));

    setData((prev) => {
      const next = [...prev, { time: timeLabel, rx: rxMbps, tx: txMbps }];
      return next.length > 20 ? next.slice(next.length - 20) : next;
    });
  }, [metrics]);

  return (
    <Card className="bg-slate-900 border-slate-800/80 col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Throughput Jaringan Real-Time (Mbps)
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            {primaryDevice
              ? `Trafik agregat langsung dari ${primaryDevice.name} (${primaryDevice.host})`
              : 'Menunggu perangkat terhubung'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">RX (Unduh)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span className="text-slate-300">TX (Unggah)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeAnomalies.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeAnomalies.map((anom) => (
              <div
                key={anom.id}
                className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-slate-200 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      NOVA Sight: {anom.type === 'TRAFFIC_SPIKE' ? 'Lonjakan Trafik Abnormal' : 'Penurunan Trafik Drastis'}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {anom.device_name} • {anom.current_mbps} Mbps (Baseline: {anom.baseline_mbps} Mbps)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => resolveAnomaly(anom.device_id)}
                    className="text-[11px] font-medium px-3 py-1.5 min-h-[36px] rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Tandai Selesai
                  </button>
                </div>
                <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 whitespace-pre-line leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 mb-1">
                    <Sparkles className="h-3 w-3" /> Analisis Akar Masalah (RCA):
                  </div>
                  {anom.rca_analysis}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" /> NOVA Act (Tindakan Mitigasi Cepat):
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={execAction !== null}
                        onClick={() => handleQuickRemediation(anom.device_id, 'FLUSH_DNS')}
                        className="text-[11px] font-mono px-3 py-1.5 min-h-[36px] rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${execAction === `${anom.device_id}-FLUSH_DNS` ? 'animate-spin' : ''}`} />
                        Flush DNS Cache
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={execAction !== null}
                      onClick={() => handleQuickRemediation(anom.device_id, 'RUN_DIAGNOSTICS')}
                      className="text-[11px] font-mono px-3 py-1.5 min-h-[36px] rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Terminal className={`h-3 w-3 ${execAction === `${anom.device_id}-RUN_DIAGNOSTICS` ? 'animate-pulse' : ''}`} />
                      Uji Jalur Ping
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={execAction !== null}
                        onClick={() => handleQuickRemediation(anom.device_id, 'ACKNOWLEDGE')}
                        className="text-[11px] font-mono px-3 py-1.5 min-h-[36px] rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Acknowledge Insiden
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="h-[280px] w-full pt-2">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400 border border-dashed border-slate-800 rounded-lg">
              Mengumpulkan sampel telemetri trafik...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="rx" name="RX (Mbps)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRx)" />
                <Area type="monotone" dataKey="tx" name="TX (Mbps)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
