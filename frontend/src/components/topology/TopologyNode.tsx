import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Globe, Router, Server, Wifi, HardDrive } from 'lucide-react';
import { TopologyNodeData } from '@/services/topologyApi';

export type { TopologyNodeData };
export type TopologyFlowNode = Node<TopologyNodeData>;

export const TopologyNode = memo(({ data, selected }: NodeProps<TopologyFlowNode>) => {
  const status = (data.status || 'DISCOVERED').toUpperCase();

  const getStatusBadge = () => {
    if (status === 'ONLINE') {
      return {
        dot: 'bg-emerald-400',
        border: selected ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-emerald-500/50 hover:border-emerald-400',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        text: 'ONLINE',
      };
    }
    if (status === 'OFFLINE') {
      return {
        dot: 'bg-rose-500',
        border: selected ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-rose-500/50 hover:border-rose-400',
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        text: 'OFFLINE',
      };
    }
    return {
      dot: 'bg-sky-400',
      border: selected ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-slate-700/80 hover:border-sky-400/60',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      text: 'DISCOVERED',
    };
  };

  const getTierIcon = () => {
    switch (data.tier) {
      case 'wan':
        return <Globe className="h-5 w-5 text-cyan-400" />;
      case 'core':
        return <Router className="h-5 w-5 text-cyan-400" />;
      case 'switch':
        return <Server className="h-5 w-5 text-sky-400" />;
      case 'ap':
        return <Wifi className="h-5 w-5 text-emerald-400" />;
      default:
        return <HardDrive className="h-5 w-5 text-slate-400" />;
    }
  };

  const getTierLabel = () => {
    switch (data.tier) {
      case 'wan':
        return 'WAN UPLINK';
      case 'core':
        return 'CORE ROUTER';
      case 'switch':
        return 'SWITCH DISTRIBUSI';
      case 'ap':
        return 'ACCESS POINT';
      default:
        return 'INFRASTRUCTURE';
    }
  };

  const st = getStatusBadge();

  return (
    <div
      className={`relative min-w-[200px] max-w-[230px] rounded-xl bg-slate-900/95 border-2 p-3 shadow-xl transition-all duration-200 cursor-pointer ${st.border}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-950 hover:!scale-125 transition-transform"
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
            {getTierIcon()}
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
              {getTierLabel()}
            </span>
            <h4 className="text-xs font-bold text-slate-100 truncate max-w-[130px]" title={data.label}>
              {data.label}
            </h4>
          </div>
        </div>

        <span className={`flex h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${st.dot}`} />
      </div>

      <div className="space-y-1 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">IP:</span>
          <span className="truncate max-w-[130px]">{data.host || 'N/A'}</span>
        </div>
        {data.board && (
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-400">Model:</span>
            <span className="truncate max-w-[130px] text-slate-300" title={data.board}>
              {data.board}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${st.badgeBg}`}>
          {st.text}
        </span>
        {data.interface && (
          <span className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]" title={data.interface}>
            {data.interface}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-950 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

TopologyNode.displayName = 'TopologyNode';
