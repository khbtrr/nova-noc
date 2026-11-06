import React from 'react';
import { X, Server, Router, Wifi, Globe, ExternalLink, PlusCircle, ShieldCheck, Activity, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { TopologyNodeData } from './TopologyNode';

interface NodeDetailDrawerProps {
  node: TopologyNodeData | null;
  onClose: () => void;
  onPromote: (node: TopologyNodeData) => void;
  isPromoting: boolean;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  onClose,
  onPromote,
  isPromoting,
}) => {
  const navigate = useNavigate();

  if (!node) return null;

  const status = (node.status || 'DISCOVERED').toUpperCase();
  const isOnline = status === 'ONLINE';
  const isOffline = status === 'OFFLINE';

  const getIcon = () => {
    switch (node.tier) {
      case 'wan':
        return <Globe className="h-6 w-6 text-cyan-400" />;
      case 'core':
        return <Router className="h-6 w-6 text-cyan-400" />;
      case 'switch':
        return <Server className="h-6 w-6 text-sky-400" />;
      case 'ap':
        return <Wifi className="h-6 w-6 text-emerald-400" />;
      default:
        return <Network className="h-6 w-6 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            {getIcon()}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
              Detail Node Topologi
            </span>
            <h3 className="text-base font-bold text-slate-100 leading-tight">{node.label}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail node"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1 overflow-y-auto">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Status Operasional</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : isOffline ? 'bg-rose-500' : 'bg-sky-400'
                }`}
              />
              <span className="text-sm font-semibold text-slate-100">
                {isOnline ? 'Aktif & Terpantau' : isOffline ? 'Terputus / Offline' : 'Terdeteksi via Neighbor Discovery'}
              </span>
            </div>
          </div>
          <Badge variant={isOnline ? 'success' : isOffline ? 'destructive' : 'secondary'}>
            {status}
          </Badge>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Informasi Perangkat & Interkoneksi
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <span className="text-[10px] uppercase text-slate-400 block">Alamat IP (Host)</span>
              <span className="text-xs font-mono text-slate-200 font-semibold mt-0.5 block">
                {node.host || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <span className="text-[10px] uppercase text-slate-400 block">Alamat MAC</span>
              <span className="text-xs font-mono text-slate-200 font-semibold mt-0.5 block">
                {node.mac || 'Tidak Tersedia'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <span className="text-[10px] uppercase text-slate-400 block">Vendor / Platform</span>
              <span className="text-xs text-slate-200 font-medium mt-0.5 block">
                {node.vendor || 'Generic'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <span className="text-[10px] uppercase text-slate-400 block">Model / Board</span>
              <span className="text-xs font-mono text-cyan-400 mt-0.5 block truncate">
                {node.board || 'N/A'}
              </span>
            </div>
            <div className="col-span-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <span className="text-[10px] uppercase text-slate-400 block">Interface Uplink / VLAN</span>
              <span className="text-xs font-mono text-emerald-400 mt-0.5 block">
                {node.interface || 'Direct Uplink'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            Status Integrasi NOVA
          </div>
          {node.is_monitored ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              Perangkat ini telah terdaftar secara resmi di dalam database NOVA dan dipantau secara berkala melalui engine telemetri.
            </p>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Perangkat ini ditemukan secara otomatis melalui protokol <strong className="text-slate-200">MikroTik Neighbor Discovery (MNDP/CDP/LLDP)</strong> dari Core Router, namun belum didaftarkan ke dalam daftar polling aktif.
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2">
        {node.is_monitored && typeof node.id === 'number' ? (
          <Button
            onClick={() => navigate(`/devices/${node.id}`)}
            className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            <Activity className="h-4 w-4 mr-2" />
            Buka Halaman Detail & Telemetri
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        ) : node.host && node.host !== 'N/A' && node.tier !== 'wan' ? (
          <Button
            onClick={() => onPromote(node)}
            disabled={isPromoting}
            className="w-full min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {isPromoting ? 'Mendaftarkan...' : 'Daftarkan ke Monitoring NOVA'}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
