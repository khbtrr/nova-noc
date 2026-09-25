import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topologyApi, TopologyNodeData } from '@/services/topologyApi';
import { TopologyNode } from '@/components/topology/TopologyNode';
import { NodeDetailDrawer } from '@/components/topology/NodeDetailDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Network,
  RefreshCw,
  Server,
  Wifi,
  Globe,
  Download,
  Filter,
  Layers,
  Search,
  Maximize2,
} from 'lucide-react';

const nodeTypes = {
  customTopology: TopologyNode,
};

export default function TopologyPage() {
  const queryClient = useQueryClient();
  const [selectedNodeData, setSelectedNodeData] = useState<TopologyNodeData | null>(null);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'wan' | 'core' | 'switch' | 'ap'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: topologyData, isLoading, isRefetching } = useQuery({
    queryKey: ['network-topology'],
    queryFn: topologyApi.getTopology,
    refetchInterval: 30000,
  });

  const scanMutation = useMutation({
    mutationFn: topologyApi.scanTopology,
    onSuccess: (res) => {
      queryClient.setQueryData(['network-topology'], res.data);
      toast.success(res.message || 'Pemindaian topologi selesai!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal memindai topologi perangkat');
    },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Sync React Flow nodes & edges with query data
  useEffect(() => {
    if (topologyData) {
      let filteredNodes = topologyData.nodes;

      if (tierFilter !== 'ALL') {
        filteredNodes = filteredNodes.filter((n: any) => n.data.tier === tierFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredNodes = filteredNodes.filter(
          (n: any) =>
            n.data.label.toLowerCase().includes(q) ||
            n.data.host.toLowerCase().includes(q) ||
            (n.data.board && n.data.board.toLowerCase().includes(q))
        );
      }

      const activeNodeIds = new Set(filteredNodes.map((n: any) => n.id));
      const filteredEdges = topologyData.edges.filter(
        (e: any) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
      );

      setNodes(filteredNodes);
      setEdges(filteredEdges);
    }
  }, [topologyData, tierFilter, searchQuery, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNodeData(node.data);
  }, []);

  const summary = topologyData?.summary;

  return (
    <div className="space-y-4 pb-8 flex flex-col h-[calc(100vh-80px)]">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Network className="h-6 w-6 text-cyan-400" />
            Topologi Jaringan Interaktif (3-Tier)
          </h2>
          <p className="text-xs text-slate-400">
            Pemetaan otomatis perangkat fisik via protokol MNDP/LLDP: Core Bitbox, Switch Distribusi, dan Access Points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || isRefetching}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${scanMutation.isPending || isRefetching ? 'animate-spin' : ''}`} />
            {scanMutation.isPending ? 'Memindai Router...' : 'Pindai Ulang (Scan Live)'}
          </Button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        <Card className="p-3 bg-slate-900/50 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Total Perangkat</div>
            <div className="text-base font-bold text-slate-100">{summary?.total_nodes ?? 0} Node</div>
          </div>
        </Card>

        <Card className="p-3 bg-slate-900/50 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Uplink / ISP</div>
            <div className="text-base font-bold text-cyan-400">{summary?.wan_count ?? 0} Gateway</div>
          </div>
        </Card>

        <Card className="p-3 bg-slate-900/50 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Core Router</div>
            <div className="text-base font-bold text-emerald-400">{summary?.core_count ?? 0} Unit</div>
          </div>
        </Card>

        <Card className="p-3 bg-slate-900/50 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Switches</div>
            <div className="text-base font-bold text-sky-400">{summary?.switch_count ?? 0} Unit</div>
          </div>
        </Card>

        <Card className="p-3 bg-slate-900/50 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Wifi className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Access Points</div>
            <div className="text-base font-bold text-purple-400">{summary?.ap_count ?? 0} AP</div>
          </div>
        </Card>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
        {/* Floating Top Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-lg">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari node / IP..."
              className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-36 sm:w-44"
            />
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>

          {/* Tier Filters */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setTierFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                tierFilter === 'ALL'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Semua ({summary?.total_nodes ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('switch')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                tierFilter === 'switch'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Switches ({summary?.switch_count ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('ap')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                tierFilter === 'ap'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              APs ({summary?.ap_count ?? 0})
            </button>
          </div>
        </div>

        {/* Legend Panel (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-300">
          <span className="font-semibold text-slate-400">Legenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400"></span> Tier 1: Gateway ISP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Tier 2: Core Router
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400"></span> Tier 3: Switch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400"></span> Tier 3: UniFi AP
          </span>
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          className="bg-slate-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="#334155"
            className="opacity-40"
          />
          <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 !text-slate-300" />
          <MiniMap
            nodeColor={(node: any) => {
              switch (node.data.tier) {
                case 'wan':
                  return '#06b6d4';
                case 'core':
                  return '#10b981';
                case 'switch':
                  return '#38bdf8';
                case 'ap':
                default:
                  return '#a855f7';
              }
            }}
            maskColor="rgba(2, 6, 23, 0.7)"
            className="!bg-slate-900 !border-slate-800 rounded-lg overflow-hidden"
          />
        </ReactFlow>

        {/* Node Detail Drawer when node clicked */}
        <NodeDetailDrawer
          nodeData={selectedNodeData}
          onClose={() => setSelectedNodeData(null)}
          onPromoteSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['network-topology'] });
            queryClient.invalidateQueries({ queryKey: ['devices'] });
          }}
        />
      </div>
    </div>
  );
}
