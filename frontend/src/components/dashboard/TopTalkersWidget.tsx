import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { flowApi } from '@/services/flowApi';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpRight, Laptop, Globe, Server, Activity } from 'lucide-react';

export default function TopTalkersWidget() {
  const navigate = useNavigate();

  const { data: topTalkers = [], isLoading } = useQuery({
    queryKey: ['flow-top-talkers', '5m', 5],
    queryFn: () => flowApi.getTopTalkers('5m', 5),
    refetchInterval: 5000,
  });

  const { data: status } = useQuery({
    queryKey: ['flow-status'],
    queryFn: () => flowApi.getStatus(),
    refetchInterval: 10000,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
      <CardHeader className="p-4 pb-2 border-b border-slate-800/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Top Talkers (5m Terakhir)
              {status?.is_running && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </CardTitle>
            <p className="text-[11px] text-slate-400">Klien pemakai bandwidth tertinggi via NetFlow</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/traffic-flow')}
          className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2"
        >
          Detail
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {isLoading && topTalkers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <Activity className="h-4 w-4 animate-spin text-cyan-500" />
            <span>Memuat aliran paket NetFlow...</span>
          </div>
        ) : topTalkers.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
            <Server className="h-6 w-6 text-slate-600 mb-1" />
            <p className="text-slate-400 font-medium">Belum ada paket NetFlow terdeteksi</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Port UDP 2055 siap menerima aliran dari MikroTik</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/traffic-flow')}
              className="mt-3 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white h-7"
            >
              Panduan Konfigurasi MikroTik
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topTalkers.slice(0, 5).map((talker, index) => (
              <div
                key={talker.ip}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-slate-800 text-[10px] font-mono font-semibold text-slate-400">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        {talker.ip}
                      </span>
                      {talker.is_local ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          LAN
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-800 text-slate-400 border-slate-700">
                          WAN
                        </Badge>
                      )}
                    </div>
                    {talker.hostname && talker.hostname !== talker.ip && (
                      <p className="text-[10px] text-cyan-400 truncate flex items-center gap-1">
                        <Laptop className="h-2.5 w-2.5 shrink-0" />
                        {talker.hostname}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-slate-100">
                    {talker.mbps > 0 ? `${talker.mbps.toFixed(2)} Mbps` : formatBytes(talker.bytes)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, talker.percent_share))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {talker.percent_share.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
