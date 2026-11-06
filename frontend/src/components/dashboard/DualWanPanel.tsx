import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, ShieldCheck, AlertTriangle, ArrowDown, ArrowUp, Activity, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Device } from '@/types/device';
import { useDeviceMetrics } from '@/hooks/useMetrics';
import { settingsApi } from '@/services/settingsApi';

interface DualWanPanelProps {
  devices: Device[];
}

export const DualWanPanel: React.FC<DualWanPanelProps> = ({ devices }) => {
  const coreRouter = devices.find((d) => String(d.device_type).toUpperCase() === 'MIKROTIK') || devices[0];
  const { metrics } = useDeviceMetrics(coreRouter?.id || '');

  const { data: sysSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.getSettings(),
    staleTime: 60000,
  });

  if (!coreRouter) return null;

  const wanProfile = sysSettings?.wan_profile || {
    primary_name: 'ISP JLM',
    primary_desc: 'Primary Fiber Dedicated',
    primary_interface: 'sfplus1-JLM',
    primary_gateway: '119.18.156.153',
    secondary_name: 'ISP ION',
    secondary_desc: 'Secondary Backup Link',
    secondary_interface: 'ge1-ION',
    secondary_gateway: '210.79.164.65',
    lan_trunk_interface: 'sfplus2-SW',
  };

  const jlmStatus = metrics?.jlm_status || 'UP';
  const jlmLatency = metrics?.jlm_latency_ms ?? 0;
  const jlmLoss = metrics?.jlm_packet_loss ?? 0;
  const jlmRx = metrics?.jlm_rx_mbps ?? 0;
  const jlmTx = metrics?.jlm_tx_mbps ?? 0;

  const ionStatus = metrics?.ion_status || 'UP';
  const ionLatency = metrics?.ion_latency_ms ?? 0;
  const ionLoss = metrics?.ion_packet_loss ?? 0;
  const ionRx = metrics?.ion_rx_mbps ?? 0;
  const ionTx = metrics?.ion_tx_mbps ?? 0;

  const isJlmHealthy = jlmStatus === 'UP' && jlmLoss < 25;
  const isIonHealthy = ionStatus === 'UP' && ionLoss < 25;

  const failoverActive = !isJlmHealthy && isIonHealthy;

  return (
    <Card className="bg-slate-900 border-slate-800/80 shadow-lg">
      <CardHeader className="pb-3 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Dual-WAN Uplink & SLA Monitor
              <span className="text-[11px] font-mono font-normal text-slate-400">
                ({coreRouter.name})
              </span>
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Pemantauan kualitas link provider utama ({wanProfile.primary_name}) & cadangan ({wanProfile.secondary_name}) secara berkesinambungan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {failoverActive ? (
            <Badge variant="warning" className="font-mono text-[10px] px-2.5 py-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> FAILOVER KE {wanProfile.secondary_name.toUpperCase()} AKTIF
            </Badge>
          ) : isJlmHealthy && isIonHealthy ? (
            <Badge variant="success" className="font-mono text-[10px] px-2.5 py-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> DUAL-WAN REDUNDANT OK
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-mono text-[10px] px-2.5 py-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> DEGRADASI LINK WAN
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl border transition-all ${
              isJlmHealthy
                ? 'bg-slate-950/70 border-slate-800/90 hover:border-cyan-500/30'
                : 'bg-rose-950/20 border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${isJlmHealthy ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{wanProfile.primary_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      PRIMARY
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Port: <strong className="text-slate-300">{wanProfile.primary_interface}</strong> • GW: {wanProfile.primary_gateway}
                  </span>
                </div>
              </div>
              <Badge variant={isJlmHealthy ? 'success' : 'destructive'} className="font-mono text-[10px]">
                {jlmStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Latensi RTT</span>
                <span className={`text-sm font-bold font-mono ${jlmLatency > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {jlmLatency.toFixed(1)} ms
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Packet Loss</span>
                <span className={`text-sm font-bold font-mono ${jlmLoss > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {jlmLoss.toFixed(0)}%
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Throughput</span>
                <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                  <span className="text-cyan-400 flex items-center">
                    <ArrowDown className="h-3 w-3 mr-0.5" />
                    {jlmRx}M
                  </span>
                  <span className="text-sky-400 flex items-center">
                    <ArrowUp className="h-3 w-3 mr-0.5" />
                    {jlmTx}M
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border transition-all ${
              isIonHealthy
                ? 'bg-slate-950/70 border-slate-800/90 hover:border-sky-500/30'
                : 'bg-rose-950/20 border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${isIonHealthy ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                  <Wifi className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{wanProfile.secondary_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      SECONDARY
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Port: <strong className="text-slate-300">{wanProfile.secondary_interface}</strong> • GW: {wanProfile.secondary_gateway}
                  </span>
                </div>
              </div>
              <Badge variant={isIonHealthy ? 'success' : 'destructive'} className="font-mono text-[10px]">
                {ionStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Latensi RTT</span>
                <span className={`text-sm font-bold font-mono ${ionLatency > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {ionLatency.toFixed(1)} ms
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Packet Loss</span>
                <span className={`text-sm font-bold font-mono ${ionLoss > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {ionLoss.toFixed(0)}%
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase block">Throughput</span>
                <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                  <span className="text-cyan-400 flex items-center">
                    <ArrowDown className="h-3 w-3 mr-0.5" />
                    {ionRx}M
                  </span>
                  <span className="text-sky-400 flex items-center">
                    <ArrowUp className="h-3 w-3 mr-0.5" />
                    {ionTx}M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
