import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Server, Network, Wifi, CheckCircle2, Radio, HardDrive } from 'lucide-react';
import { TopologyNodeData } from '@/services/topologyApi';

interface TopologyNodeProps {
  data: TopologyNodeData;
  selected?: boolean;
}

export const TopologyNode = memo(({ data, selected }: TopologyNodeProps) => {
  const { label, host, tier, vendor, board, is_monitored, status, interface: iface } = data;

  const getTierConfig = () => {
    switch (tier) {
      case 'wan':
        return {
          icon: <Globe className="h-5 w-5 text-cyan-400" />,
          bgColor: 'bg-cyan-950/40 border-cyan-500/50',
          selectedBorder: 'border-cyan-400 shadow-cyan-500/30',
          badgeText: 'ISP / Gateway',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
      case 'core':
        return {
          icon: <Server className="h-5 w-5 text-emerald-400" />,
          bgColor: 'bg-emerald-950/40 border-emerald-500/50',
          selectedBorder: 'border-emerald-400 shadow-emerald-500/30',
          badgeText: 'Core Router',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'switch':
        return {
          icon: <Network className="h-5 w-5 text-sky-400" />,
          bgColor: 'bg-sky-950/40 border-sky-500/40',
          selectedBorder: 'border-sky-400 shadow-sky-500/30',
          badgeText: 'Switch',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        };
      case 'ap':
      default:
        return {
          icon: <Wifi className="h-5 w-5 text-purple-400" />,
          bgColor: 'bg-purple-950/40 border-purple-500/40',
          selectedBorder: 'border-purple-400 shadow-purple-500/30',
          badgeText: 'Access Point',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        };
    }
  };

  const config = getTierConfig();

  return (
    <div
      className={`relative min-w-[210px] max-w-[240px] rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer ${
        config.bgColor
      } ${selected ? `ring-2 ring-cyan-400 ${config.selectedBorder}` : 'hover:border-slate-600'}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !bg-cyan-400 !border-2 !border-slate-900"
      />

      {/* Header: Icon + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-800">
          {config.icon}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.badgeColor}`}>
            {config.badgeText}
          </span>
          {is_monitored ? (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Monitored
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
              Discovered
            </span>
          )}
        </div>
      </div>

      {/* Device Name & IP */}
      <div className="mt-2.5">
        <h4 className="text-xs font-bold text-slate-100 truncate title" title={label}>
          {label}
        </h4>
        <p className="text-[11px] font-mono text-cyan-300/90 mt-0.5 truncate">
          {host && host !== 'N/A' ? host : '(No Direct IP)'}
        </p>
      </div>

      {/* Footer: Hardware & Uplink Interface */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="truncate max-w-[110px]" title={board || vendor}>
          {board || vendor || 'Generic'}
        </span>
        {iface && (
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] font-mono text-slate-300 truncate max-w-[80px]" title={iface}>
            {iface}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-cyan-400 !border-2 !border-slate-900"
      />
    </div>
  );
});

TopologyNode.displayName = 'TopologyNode';
