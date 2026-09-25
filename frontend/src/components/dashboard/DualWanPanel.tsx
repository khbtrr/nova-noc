import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, ArrowDown, ArrowUp, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';
import { useDevices } from '@/hooks/useDevices';

interface DualWanPanelProps {
  deviceId?: string | number;
}

export default function DualWanPanel({ deviceId }: DualWanPanelProps) {
  const { devices } = useDevices();
  
  // Default to first MikroTik device if deviceId not provided
  const targetDevice = deviceId 
    ? devices?.find((d: any) => String(d.id) === String(deviceId))
    : devices?.find((d: any) => d.device_type === 'MIKROTIK');

  const resolvedId = targetDevice?.id ? String(targetDevice.id) : '5';

  const { data: metrics } = useQuery({
    queryKey: ['metrics', resolvedId],
    queryFn: () => metricsApi.getMetrics(resolvedId),
    refetchInterval: 10000,
  });

  const jlmLatency = metrics?.jlm_latency_ms != null ? `${metrics.jlm_latency_ms.toFixed(1)} ms` : '< 1 ms';
  const jlmLoss = metrics?.jlm_packet_loss != null ? `${metrics.jlm_packet_loss.toFixed(0)}%` : '0%';
  const jlmRx = metrics?.jlm_rx_mbps != null ? `${metrics.jlm_rx_mbps.toFixed(2)} Mbps` : '0.00 Mbps';
  const jlmTx = metrics?.jlm_tx_mbps != null ? `${metrics.jlm_tx_mbps.toFixed(2)} Mbps` : '0.00 Mbps';
  const jlmStatus = (metrics?.jlm_status || 'UP').toUpperCase();

  const ionLatency = metrics?.ion_latency_ms != null ? `${metrics.ion_latency_ms.toFixed(1)} ms` : '< 1 ms';
  const ionLoss = metrics?.ion_packet_loss != null ? `${metrics.ion_packet_loss.toFixed(0)}%` : '0%';
  const ionRx = metrics?.ion_rx_mbps != null ? `${metrics.ion_rx_mbps.toFixed(2)} Mbps` : '0.00 Mbps';
  const ionTx = metrics?.ion_tx_mbps != null ? `${metrics.ion_tx_mbps.toFixed(2)} Mbps` : '0.00 Mbps';
  const ionStatus = (metrics?.ion_status || 'UP').toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-100">
            Status Dual-Provider Internet (WAN Uplinks)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Target: {targetDevice?.name || 'Router Core Bitbox'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Provider JLM */}
        <Card className="border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl hover:border-cyan-500/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-100">
                  ISP JLM (Direct Fiber SFP+)
                </CardTitle>
                <p className="text-[11px] font-mono text-slate-400">
                  Port: sfplus1-JLM &bull; GW: 119.18.156.153
                </p>
              </div>
            </div>
            <Badge 
              variant={jlmStatus === 'UP' ? 'success' : 'destructive'} 
              className="text-[10px] font-mono font-semibold"
            >
              {jlmStatus === 'UP' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> UP (Aktif)
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> DOWN
                </span>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Gateway Latency</span>
                <span className="text-base font-bold font-mono text-cyan-300">{jlmLatency}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Loss: {jlmLoss}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Throughput SFP+</span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 mt-1">
                  <ArrowDown className="h-3 w-3" /> {jlmRx}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-blue-400 mt-0.5">
                  <ArrowUp className="h-3 w-3" /> {jlmTx}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tipe Sambungan: Handoff Langsung (No Router ISP)</span>
              <span className="font-mono text-cyan-400 font-medium">Jalur Utama</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Provider ION */}
        <Card className="border-sky-500/20 bg-slate-900/60 backdrop-blur-xl hover:border-sky-500/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-100">
                  ISP ION (Router RB5009)
                </CardTitle>
                <p className="text-[11px] font-mono text-slate-400">
                  Port: ge1-ION &bull; GW: 210.79.164.65
                </p>
              </div>
            </div>
            <Badge 
              variant={ionStatus === 'UP' ? 'success' : 'destructive'} 
              className="text-[10px] font-mono font-semibold"
            >
              {ionStatus === 'UP' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> UP (Standby)
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> DOWN
                </span>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Gateway Latency</span>
                <span className="text-base font-bold font-mono text-sky-300">{ionLatency}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Loss: {ionLoss}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Throughput Uplink</span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 mt-1">
                  <ArrowDown className="h-3 w-3" /> {ionRx}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-blue-400 mt-0.5">
                  <ArrowUp className="h-3 w-3" /> {ionTx}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tipe Sambungan: Melalui Router ION (RB5009)</span>
              <span className="font-mono text-sky-400 font-medium">Jalur Cadangan</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
