import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Router, Server, Network } from 'lucide-react';
import { Device } from '@/types/device';
import { useNavigate } from 'react-router-dom';

interface TopologyMapProps {
  devices: Device[];
}

export const TopologyMap: React.FC<TopologyMapProps> = ({ devices }) => {
  const navigate = useNavigate();

  const routers = devices.filter((d) => (d.device_type || d.type || '').toUpperCase() === 'MIKROTIK');
  const switches = devices.filter((d) => (d.device_type || d.type || '').toUpperCase() !== 'MIKROTIK');

  const coreRouter = routers[0] || devices[0];
  const downstreamDevices = devices.filter((d) => d.id !== coreRouter?.id);

  return (
    <Card className="bg-slate-900 border-slate-800/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400" />
              Peta Topologi Jaringan
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Hierarki interkoneksi logis dan kesehatan link</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aktif
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Peringatan
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Terputus
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative py-6 px-4 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center min-h-[260px]">
          <div className="flex flex-col items-center z-10">
            <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
              <Globe className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-slate-300 mt-1.5 font-semibold">Uplink WAN / ISP</span>
          </div>

          <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-500 to-emerald-500 my-1" />

          {coreRouter && (
            <button
              type="button"
              onClick={() => navigate(`/devices/${coreRouter.id}`)}
              className="flex flex-col items-center z-10 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl p-1"
            >
              <div
                className={`p-3.5 rounded-xl border-2 transition-all ${
                  coreRouter.status?.toUpperCase() === 'ONLINE'
                    ? 'bg-slate-900 border-emerald-500/60 text-emerald-400 group-hover:border-emerald-400'
                    : 'bg-slate-900 border-rose-500/60 text-rose-400'
                }`}
              >
                <Router className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-slate-100 mt-1.5 group-hover:text-cyan-400">{coreRouter.name}</span>
              <span className="text-[10px] font-mono text-slate-400">{coreRouter.host || coreRouter.ip_address}</span>
            </button>
          )}

          {downstreamDevices.length > 0 && (
            <>
              <div className="w-0.5 h-6 bg-slate-700 my-1" />
              <div className="w-3/4 max-w-lg h-0.5 bg-slate-700" />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4 w-full max-w-2xl">
                {downstreamDevices.map((dev) => {
                  const status = dev.status?.toUpperCase();
                  const borderColor =
                    status === 'ONLINE'
                      ? 'border-emerald-500/40 hover:border-emerald-400 text-emerald-400'
                      : status === 'WARNING'
                        ? 'border-amber-500/40 hover:border-amber-400 text-amber-400'
                        : 'border-rose-500/40 hover:border-rose-400 text-rose-400';

                  return (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => navigate(`/devices/${dev.id}`)}
                      className="flex flex-col items-center p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:bg-slate-800/70 cursor-pointer transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      <div className={`p-2 rounded-lg bg-slate-950 border ${borderColor} mb-1.5`}>
                        <Server className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-200 text-center truncate w-full group-hover:text-cyan-400">
                        {dev.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{dev.host || dev.ip_address}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
