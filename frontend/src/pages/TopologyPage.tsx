import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Connection,
  addEdge,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topologyApi, TopologyNodeData, TopologyNode, TopologyEdge } from '@/services/topologyApi';
import { TopologyNode as CustomTopologyNodeComponent } from '@/components/topology/TopologyNode';
import { NodeDetailDrawer } from '@/components/topology/NodeDetailDrawer';
import { EditEdgeModal, EdgeModalData } from '@/components/topology/EditEdgeModal';
import { AddTopologyNodeModal } from '@/components/topology/AddTopologyNodeModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Network,
  RefreshCw,
  Server,
  Wifi,
  Globe,
  Layers,
  Search,
  PenTool,
  Save,
  RotateCcw,
  PlusCircle,
  Check,
  Cable,
} from 'lucide-react';

const nodeTypes = {
  customTopology: CustomTopologyNodeComponent,
};

export default function TopologyPage() {
  const queryClient = useQueryClient();
  const [selectedNodeData, setSelectedNodeData] = useState<TopologyNodeData | null>(null);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'wan' | 'core' | 'switch' | 'ap'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode Edit toggle
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals state
  const [edgeModalData, setEdgeModalData] = useState<EdgeModalData | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);

  // Query Topology
  const { data: topologyData, isLoading, isRefetching } = useQuery({
    queryKey: ['network-topology'],
    queryFn: topologyApi.getTopology,
    refetchInterval: isEditMode ? false : 30000,
  });

  // Mutations
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

  const saveMutation = useMutation({
    mutationFn: topologyApi.saveTopology,
    onSuccess: (res) => {
      queryClient.setQueryData(['network-topology'], res.data);
      toast.success('Topologi kustom berhasil disimpan secara permanen!');
      setIsEditMode(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal menyimpan topologi kustom');
    },
  });

  const resetMutation = useMutation({
    mutationFn: topologyApi.resetTopology,
    onSuccess: (res) => {
      queryClient.setQueryData(['network-topology'], res.data);
      toast.success('Topologi berhasil dikembalikan ke hierarki fisik standar!');
      setIsEditMode(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal mereset topologi');
    },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Sync React Flow nodes & edges with query data (when not editing)
  useEffect(() => {
    if (topologyData && !isEditMode) {
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
  }, [topologyData, tierFilter, searchQuery, isEditMode, setNodes, setEdges]);

  // Click on a node
  const onNodeClick = useCallback(
    (_: any, node: any) => {
      if (!isEditMode) {
        setSelectedNodeData(node.data);
      }
    },
    [isEditMode]
  );

  // Click on an edge in Edit Mode to modify or delete connection
  const onEdgeClick = useCallback(
    (_: any, edge: Edge) => {
      if (!isEditMode) return;
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);

      setEdgeModalData({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceLabel: sourceNode?.data?.label || edge.source,
        targetLabel: targetNode?.data?.label || edge.target,
        label: typeof edge.label === 'string' ? edge.label : '',
        mediaType: (edge.data as any)?.media_type || 'ethernet',
        animated: edge.animated,
        isNew: false,
      });
      setIsEdgeModalOpen(true);
    },
    [isEditMode, nodes]
  );

  // Drag to connect a new edge
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceNode = nodes.find((n: any) => n.id === connection.source);
      const targetNode = nodes.find((n: any) => n.id === connection.target);

      setEdgeModalData({
        source: connection.source,
        target: connection.target,
        sourceLabel: sourceNode?.data?.label || connection.source,
        targetLabel: targetNode?.data?.label || connection.target,
        label: '',
        mediaType: 'ethernet',
        animated: false,
        isNew: true,
      });
      setIsEdgeModalOpen(true);
    },
    [nodes]
  );

  // Save or update an edge
  const handleSaveEdge = useCallback(
    (edgePayload: {
      id?: string;
      source: string;
      target: string;
      label: string;
      mediaType: 'fiber' | 'ethernet' | 'wan' | 'wireless';
      animated: boolean;
      style: Record<string, any>;
    }) => {
      if (edgePayload.id) {
        // Update existing edge
        setEdges((prev) =>
          prev.map((e) =>
            e.id === edgePayload.id
              ? {
                  ...e,
                  label: edgePayload.label,
                  animated: edgePayload.animated,
                  style: edgePayload.style,
                  data: { ...e.data, media_type: edgePayload.mediaType },
                }
              : e
          )
        );
      } else {
        // Add new edge
        const newEdgeId = `edge-${edgePayload.source}-${edgePayload.target}-${Date.now()}`;
        const newEdge: Edge = {
          id: newEdgeId,
          source: edgePayload.source,
          target: edgePayload.target,
          label: edgePayload.label,
          animated: edgePayload.animated,
          style: edgePayload.style,
          data: { media_type: edgePayload.mediaType },
        };
        setEdges((prev) => addEdge(newEdge, prev));
      }
      setIsEdgeModalOpen(false);
      toast.success(edgePayload.id ? 'Kabel berhasil diperbarui' : 'Kabel baru berhasil dihubungkan');
    },
    [setEdges]
  );

  // Delete an edge
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      setIsEdgeModalOpen(false);
      toast.success('Sambungan kabel diputus');
    },
    [setEdges]
  );

  // Add new node from modal
  const handleAddNewNode = useCallback(
    (newNode: TopologyNode) => {
      setNodes((prev) => [...prev, newNode]);
      toast.success(`Perangkat ${newNode.data.label} berhasil ditambahkan ke kanvas`);
    },
    [setNodes]
  );

  // Handle Save Topology
  const handleSaveTopology = () => {
    saveMutation.mutate({
      nodes: nodes.map((n: any) => ({
        id: n.id,
        type: n.type || 'customTopology',
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : '',
        animated: e.animated,
        style: e.style,
        data: e.data,
      })),
    });
  };

  const summary = topologyData?.summary;
  const isCustomLayout = summary?.is_custom_layout;
  const existingNodeIds = useMemo(() => new Set<string>(nodes.map((n: any) => String(n.id))), [nodes]);

  return (
    <div className="space-y-4 pb-8 flex flex-col h-[calc(100vh-80px)]">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Network className="h-6 w-6 text-cyan-400" />
              Peta Topologi Jaringan
            </h2>
            {isCustomLayout ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Topologi Kustom (The Dude)
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Hierarki Fisik Standar
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hierarki fisik: Dual-WAN &rarr; Router Utama (Bitbox Tera) &rarr; Main Switch CRS317 &rarr; Switch Gedung 1..4, Adm, TIK &rarr; AP Ruang.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <>
              <Button
                size="sm"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || isRefetching}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${scanMutation.isPending || isRefetching ? 'animate-spin' : ''}`} />
                {scanMutation.isPending ? 'Memindai...' : 'Pindai Live'}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setIsEditMode(true);
                  toast.info('Mode Edit Topologi aktif. Anda dapat menggeser node dan menarik/memutus kabel.');
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <PenTool className="h-3.5 w-3.5" />
                Edit Topologi
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddNodeModalOpen(true)}
                className="border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-medium flex items-center gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Tambah Perangkat
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm('Reset topologi ke susunan fisik standar bawaan sistem?')) {
                    resetMutation.mutate();
                  }
                }}
                disabled={resetMutation.isPending}
                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Standar
              </Button>

              <Button
                size="sm"
                onClick={handleSaveTopology}
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Topologi'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  queryClient.invalidateQueries({ queryKey: ['network-topology'] });
                }}
                className="border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                Batal
              </Button>
            </div>
          )}
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
          {/* Mode Indicator Badge */}
          {isEditMode && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md text-xs font-semibold animate-pulse">
              <PenTool className="h-3 w-3" />
              Mode Edit Aktif
            </div>
          )}

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

        {/* Legend & Instructions Panel (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-300">
          {isEditMode ? (
            <div className="flex items-center gap-2 text-cyan-300">
              <Cable className="h-3.5 w-3.5 text-cyan-400" />
              <span>Petunjuk Edit: Tarik handle bulat untuk sambungkan kabel. Klik kabel untuk mengedit/menghapus.</span>
            </div>
          ) : (
            <>
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
                <span className="h-2 w-2 rounded-full bg-purple-400"></span> Tier 4: UniFi AP
              </span>
            </>
          )}
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={isEditMode}
          elementsSelectable={true}
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

        {/* Node Detail Drawer when node clicked in View Mode */}
        <NodeDetailDrawer
          nodeData={selectedNodeData}
          onClose={() => setSelectedNodeData(null)}
          onPromoteSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['network-topology'] });
            queryClient.invalidateQueries({ queryKey: ['devices'] });
          }}
        />

        {/* Edge Customization Modal */}
        <EditEdgeModal
          isOpen={isEdgeModalOpen}
          data={edgeModalData}
          onClose={() => setIsEdgeModalOpen(false)}
          onSave={handleSaveEdge}
          onDelete={handleDeleteEdge}
        />

        {/* Add Node Modal */}
        <AddTopologyNodeModal
          isOpen={isAddNodeModalOpen}
          onClose={() => setIsAddNodeModalOpen(false)}
          onAddNode={handleAddNewNode}
          existingNodeIds={existingNodeIds}
        />
      </div>
    </div>
  );
}
