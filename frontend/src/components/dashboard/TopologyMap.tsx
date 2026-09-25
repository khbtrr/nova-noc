import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Server, Wifi, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { topologyApi } from '@/services/topologyApi';

export const TopologyMap: React.FC = () => {
  const navigate = useNavigate();

  const { data: topologyData } = useQuery({
    queryKey: ['network-topology'],
    queryFn: topologyApi.getTopology,
  });

  const summary = topologyData?.summary;
  const coreNode = topologyData?.nodes?.find((n: any) => n.data?.tier === 'core');
  const coreLabel = coreNode?.data?.label || (summary?.core_count ? 'Core Router Terdeteksi' : 'Belum Terdeteksi');
  const coreHost = coreNode?.data?.host || '-';

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
              <Network className="h-4 w-4 text-cyan-400" />
              Peta Topologi Jaringan Dinamis
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Auto-Discovery via protokol MNDP/LLDP: {summary?.total_nodes ?? 0} perangkat terdeteksi aktif
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/topology')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
          >
            Buka Topologi 3-Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-xl border border-slate-800/80 bg-slate-950 p-5 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* 1. ISP / WAN Gateway */}
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Globe className="h-6 w-6" />
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-200">Gateway ISP</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {summary?.wan_count ? `${summary.wan_count} Uplink Terhubung` : '0 Uplink'}
              </span>
            </div>

            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 to-emerald-500 relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 border border-slate-800">
                  WAN Trunk
                </div>
              </div>
            </div>

            {/* 2. Core Router */}
            <div 
              onClick={() => (coreNode?.data?.id ? navigate(`/devices/${coreNode.data.id}`) : navigate('/topology'))}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 border-2 border-emerald-500/50 text-emerald-400 group-hover:border-emerald-400 group-hover:scale-105 transition-all">
                <Server className="h-7 w-7" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-200 text-center group-hover:text-cyan-400 transition-colors">
                {coreLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{coreHost}</span>
            </div>

            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="h-[2px] w-full bg-slate-700 relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
                  Distribution
                </div>
              </div>
            </div>

            {/* 3. Distribution Switches */}
            <div 
              onClick={() => navigate('/topology')}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-sky-400 group-hover:border-sky-400 group-hover:scale-105 transition-all">
                <Network className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-sky-500"></span>
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-200 text-center group-hover:text-sky-300 transition-colors">
                Switches ({summary?.switch_count ?? 0})
              </span>
              <span className="text-[10px] text-slate-400">Distribusi Layer 2/3</span>
            </div>

            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="h-[2px] w-full bg-slate-800"></div>
            </div>

            {/* 4. Access Points */}
            <div 
              onClick={() => navigate('/topology')}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-purple-400 group-hover:border-purple-400 group-hover:scale-105 transition-all">
                <Wifi className="h-6 w-6" />
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
                Access Points ({summary?.ap_count ?? 0})
              </span>
              <span className="text-[10px] text-slate-400">Wireless Access</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
