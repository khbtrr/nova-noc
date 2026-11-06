import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Radio } from 'lucide-react';
import { flowApi } from '@/services/flowApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TopTalkersWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: statusData } = useQuery({
    queryKey: ['flow-status'],
    queryFn: () => flowApi.getStatus(),
    refetchInterval: 8000,
  });

  const { data: talkersData, isLoading } = useQuery({
    queryKey: ['flow-top-talkers', '5m', 5],
    queryFn: () => flowApi.getTopTalkers('5m', 5),
    refetchInterval: 8000,
  });

  const talkers = Array.isArray(talkersData) ? talkersData : [];

  return (
    <Card className="bg-slate-900 border-slate-800/80 flex flex-col justify-between h-full">
      <CardHeader className="pb-2 border-b border-slate-800/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-200">
              Top 5 Pengguna Bandwidth
            </CardTitle>
            <p className="text-[11px] text-slate-400">Traffic Flow NetFlow v5 (5 Menit Terakhir)</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Radio className="h-2.5 w-2.5" />
          {statusData?.live_throughput_mbps ?? 0} Mbps
        </span>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400 font-mono">
            Memuat data Top Talkers...
          </div>
        ) : talkers.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-400 font-medium">Menunggu paket NetFlow (UDP 2055)</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Aktifkan <code className="text-cyan-400">/ip traffic-flow</code> pada router MikroTik untuk memantau IP paling aktif.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {talkers.slice(0, 5).map((t) => (
              <div key={t.ip} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 w-4">#{t.rank}</span>
                    <span className="font-mono font-semibold text-slate-200 truncate">{t.ip}</span>
                    <span className="text-[11px] text-slate-400 truncate">{t.hostname}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-cyan-400 font-bold">{t.mbps} Mbps</span>
                    <span className="text-slate-400 text-[10px] w-9 text-right">{t.percent_share}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(4, t.percent_share))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/flow')}
          className="mt-4 w-full py-2 min-h-[44px] rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-cyan-400 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          Buka Analisis Traffic Flow Lengkap
        </button>
      </CardContent>
    </Card>
  );
};
