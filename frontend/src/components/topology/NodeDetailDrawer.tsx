import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TopologyNodeData, topologyApi } from '@/services/topologyApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Server, Network, Wifi, Globe, ShieldPlus, ExternalLink, Copy, Check, Radio } from 'lucide-react';

interface NodeDetailDrawerProps {
  nodeData: TopologyNodeData | null;
  onClose: () => void;
  onPromoteSuccess: () => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  nodeData,
  onClose,
  onPromoteSuccess,
}) => {
  const navigate = useNavigate();
  const [isPromoting, setIsPromoting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [promotedDevice, setPromotedDevice] = useState<any>(null);

  if (!nodeData) return null;

  const { label, host, mac, tier, vendor, board, is_monitored, status, interface: iface, id } = nodeData;
  const isMonitoredEffective = is_monitored || !!promotedDevice;
  const effectiveDeviceId = promotedDevice?.id || id;

  const handleCopyIP = () => {
    if (host && host !== 'N/A') {
      navigator.clipboard.writeText(host);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success('Alamat IP disalin ke clipboard');
    }
  };

  const handlePromote = async () => {
    if (!host || host === 'N/A') {
      toast.error('Perangkat ini tidak memiliki alamat IP langsung untuk dimonitor.');
      return;
    }

    setIsPromoting(true);
    try {
      const res = await topologyApi.promoteNeighbor({
        label,
        host,
        vendor,
        board,
        tier,
        interface: iface,
      });
      toast.success(res.message || `Perangkat ${label} berhasil ditambahkan ke monitoring!`);
      if (res.device) {
        setPromotedDevice(res.device);
      }
      onPromoteSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mempromosikan perangkat');
    } finally {
      setIsPromoting(false);
    }
  };

  const getTierIcon = () => {
    switch (tier) {
      case 'wan':
        return <Globe className="h-5 w-5 text-cyan-400" />;
      case 'core':
        return <Server className="h-5 w-5 text-emerald-400" />;
      case 'switch':
        return <Network className="h-5 w-5 text-sky-400" />;
      case 'ap':
      default:
        return <Wifi className="h-5 w-5 text-purple-400" />;
    }
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 sm:w-96 z-50 animate-in slide-in-from-right-5 duration-200">
      <Card className="h-full flex flex-col border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <CardHeader className="p-4 border-b border-slate-800/80 flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
              {getTierIcon()}
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-100 truncate max-w-[200px]" title={label}>
                {label}
              </CardTitle>
              <CardDescription className="text-xs capitalize text-slate-400">
                {tier === 'wan' ? 'Gateway ISP' : tier === 'core' ? 'Core Router' : tier === 'switch' ? 'Switch Jaringan' : 'Access Point'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-slate-400">Status Monitoring:</span>
            {isMonitoredEffective ? (
              <Badge variant="success" className="text-[10px] flex items-center gap-1">
                <Radio className="h-3 w-3 animate-pulse" /> Monitored Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] text-slate-300">
                Discovered (MNDP/LLDP)
              </Badge>
            )}
          </div>

          {/* Device Telemetry / Attributes */}
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1 font-medium">Alamat IP:</span>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-md border border-slate-800 font-mono text-cyan-300">
                <span>{host || 'N/A'}</span>
                {host && host !== 'N/A' && (
                  <button
                    type="button"
                    onClick={handleCopyIP}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Salin IP"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {mac && (
              <div>
                <span className="text-slate-400 block text-[11px] mb-1 font-medium">MAC Address:</span>
                <div className="bg-slate-900 px-3 py-2 rounded-md border border-slate-800 font-mono text-slate-300">
                  {mac}
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400 block text-[11px] mb-1 font-medium">Platform / Vendor:</span>
              <div className="bg-slate-900 px-3 py-2 rounded-md border border-slate-800 text-slate-200">
                {vendor || 'Unknown'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1 font-medium">Model / Board Name:</span>
              <div className="bg-slate-900 px-3 py-2 rounded-md border border-slate-800 text-slate-200">
                {board || 'Standard'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1 font-medium">Interface Uplink Terdeteksi:</span>
              <div className="bg-slate-900 px-3 py-2 rounded-md border border-slate-800 font-mono text-cyan-400">
                {iface || 'Local'}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="p-4 border-t border-slate-800/80 flex flex-col gap-2">
          {isMonitoredEffective ? (
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
              onClick={() => {
                if (typeof effectiveDeviceId === 'number') {
                  navigate(`/devices/${effectiveDeviceId}`);
                } else {
                  navigate('/devices');
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Buka Detail Metrik Perangkat
            </Button>
          ) : (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              disabled={isPromoting || !host || host === 'N/A'}
              onClick={handlePromote}
            >
              <ShieldPlus className="h-3.5 w-3.5 mr-1.5" />
              {isPromoting ? 'Mendaftarkan...' : 'Pantau Perangkat Ini (Promote)'}
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-slate-800 text-slate-400 hover:text-white text-xs"
            onClick={onClose}
          >
            Tutup Panel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
