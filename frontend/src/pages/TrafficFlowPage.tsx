import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Activity,
  Globe,
  Cpu,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ShieldAlert,
  Layers,
  Network,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { flowApi } from '@/services/flowApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BAR_COLORS = ['#06b6d4', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#14b8a6', '#38bdf8', '#eab308'];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const TrafficFlowPage: React.FC = () => {
  const [windowTime, setWindowTime] = useState<string>('5m');

  const { data: statusData } = useQuery({
    queryKey: ['flow-status'],
    queryFn: () => flowApi.getStatus(),
    refetchInterval: 5000,
  });

  const { data: talkersData, isLoading: loadingTalkers, refetch: refetchAll } = useQuery({
    queryKey: ['flow-top-talkers', windowTime],
    queryFn: () => flowApi.getTopTalkers(windowTime, 15),
    refetchInterval: 5000,
  });

  const { data: destinationsData } = useQuery({
    queryKey: ['flow-top-destinations', windowTime],
    queryFn: () => flowApi.getTopDestinations(windowTime, 10),
    refetchInterval: 5000,
  });

  const { data: protocolsData } = useQuery({
    queryKey: ['flow-protocols', windowTime],
    queryFn: () => flowApi.getProtocols(windowTime),
    refetchInterval: 5000,
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['flow-conversations', windowTime],
    queryFn: () => flowApi.getConversations(windowTime, 25),
    refetchInterval: 5000,
  });

  const talkers = Array.isArray(talkersData) ? talkersData : [];
  const destinations = Array.isArray(destinationsData) ? destinationsData : [];
  const protocols = (Array.isArray(protocolsData) ? protocolsData : []).filter((p) => p.type === 'service');
  const conversations = Array.isArray(conversationsData) ? conversationsData : [];

  const topTalker = talkers[0];
  const topService = protocols[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Analisis Traffic Flow (NetFlow)
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                  statusData?.is_running
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusData?.is_running ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {statusData?.is_running ? `UDP ${statusData.port} Aktif` : 'Listener Offline'}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Visibilitas pengguna bandwidth tertinggi (Top Talkers), protokol aplikasi, dan matriks koneksi IP real-time
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <Clock className="h-3.5 w-3.5 text-slate-400 ml-2 mr-1.5" />
            {(['1m', '5m', '15m', '30m', '1h'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowTime(w)}
                className={`px-3 py-1.5 min-h-[38px] rounded-md text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  windowTime === w
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAll()}
            className="min-h-[44px] bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Segarkan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Throughput Flow</p>
              <p className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                {statusData?.live_throughput_mbps ?? 0} <span className="text-xs font-normal text-slate-400">Mbps</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatBytes(statusData?.total_bytes_processed ?? 0)} total diproses
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Top #1 Klien (Talker)</p>
              <p className="text-lg font-bold text-slate-100 font-mono mt-1 truncate">
                {topTalker ? topTalker.ip : 'Menunggu Data'}
              </p>
              <p className="text-[11px] text-emerald-400 truncate mt-0.5">
                {topTalker ? `${topTalker.hostname} (${topTalker.mbps} Mbps)` : 'Belum ada paket NetFlow'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Protokol Dominan</p>
              <p className="text-lg font-bold text-amber-400 font-mono mt-1 truncate">
                {topService ? topService.name : 'Menunggu Data'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {topService ? `${topService.percent}% dari total trafik` : 'Menunggu aliran paket'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Paket Flow Diterima</p>
              <p className="text-2xl font-bold text-slate-100 font-mono mt-1">
                {statusData?.total_flows_processed?.toLocaleString('id-ID') ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {statusData?.total_packets_received ?? 0} datagram UDP
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Network className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {talkers.length === 0 && !loadingTalkers ? (
        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="py-12 px-6 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-cyan-400 mx-auto opacity-80" />
            <h3 className="text-base font-semibold text-slate-200">
              Menunggu Aliran Paket MikroTik Traffic Flow (NetFlow v5)
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Listener NetFlow NOVA sudah aktif pada port UDP <code className="text-cyan-400">2055</code>. Aktifkan fitur{' '}
              <strong className="text-slate-200">IP Traffic Flow</strong> pada router MikroTik agar NOVA dapat menampilkan
              pengguna bandwidth tertinggi secara langsung:
            </p>
            <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-cyan-300 space-y-1">
              <div>/ip traffic-flow set enabled=yes interfaces=all active-flow-timeout=1m</div>
              <div>/ip traffic-flow target add dst-address=&lt;IP_SERVER_NOVA&gt; port=2055 version=5</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900 border-slate-800/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                  <span>Top Talkers (Konsumsi Bandwidth per IP Klien - Jendela {windowTime})</span>
                  <span className="text-xs font-mono text-cyan-400">{talkers.length} Host Aktif</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  {talkers.slice(0, 10).map((t) => (
                    <div key={t.ip} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                            #{t.rank}
                          </span>
                          <span className="font-mono font-semibold text-slate-100">{t.ip}</span>
                          <span className="text-slate-400 truncate text-[11px]">{t.hostname}</span>
                          {t.is_local && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-mono">
                              LAN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="text-slate-400 text-[11px]">{formatBytes(t.bytes)}</span>
                          <span className="text-cyan-400 font-bold w-20 text-right">{t.mbps} Mbps</span>
                          <span className="text-slate-300 w-12 text-right">{t.percent_share}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, t.percent_share))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  Distribusi Layanan & Port Aplikasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={protocols} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val}%`, 'Proporsi Trafik']}
                      />
                      <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
                        {protocols.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Top Destination Server
                  </p>
                  {destinations.slice(0, 4).map((d) => (
                    <div key={d.ip} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center gap-1.5 truncate">
                        <Globe className="h-3 w-3 text-sky-400 shrink-0" />
                        {d.ip}
                      </span>
                      <span className="text-sky-400">{d.mbps} Mbps ({d.percent_share}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800/80 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Matriks Percakapan Aktif (Source IP ke Destination IP & Layanan)</span>
                <span className="text-xs font-mono text-slate-400">Menampilkan {conversations.length} sesi terbesar</span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">IP Sumber (Klien)</th>
                    <th className="py-3 px-4">Tujuan (Destination IP)</th>
                    <th className="py-3 px-4">Layanan / Port</th>
                    <th className="py-3 px-4 text-right">Volume Data</th>
                    <th className="py-3 px-4 text-right">Kecepatan</th>
                    <th className="py-3 px-4 text-right">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {conversations.map((c) => (
                    <tr key={`${c.rank}-${c.src_ip}-${c.dst_ip}-${c.service}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400">{c.rank}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">{c.src_ip}</div>
                        {c.src_hostname !== '-' && (
                          <div className="text-[10px] text-emerald-400">{c.src_hostname}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{c.dst_ip}</span>
                        </div>
                        {c.dst_hostname !== '-' && (
                          <div className="text-[10px] text-slate-400 pl-5">{c.dst_hostname}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                          {c.service}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-300">{formatBytes(c.bytes)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-cyan-400">{c.mbps} Mbps</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{c.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
export default TrafficFlowPage;
