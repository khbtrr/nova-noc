import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network,
  RefreshCw,
  Search,
  Server,
  Router,
  Wifi,
  Globe,
  ShieldCheck,
  Edit3,
  Save,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { topologyApi, TopologyResponse, TopologyNodeData } from '@/services/topologyApi';
import { TopologyNode, TopologyFlowNode } from '@/components/topology/TopologyNode';
import { NodeDetailDrawer } from '@/components/topology/NodeDetailDrawer';
import { AddTopologyNodeModal } from '@/components/topology/AddTopologyNodeModal';
import { EditEdgeModal } from '@/components/topology/EditEdgeModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';

const nodeTypes = {
  customTopology: TopologyNode,
  topologyNode: TopologyNode,
};

const TIER_EDGE_STYLES: Record<string, { stroke: string; strokeWidth: number; animated: boolean }> = {
  wan: { stroke: '#06b6d4', strokeWidth: 2, animated: true },
  core: { stroke: '#06b6d4', strokeWidth: 2.5, animated: true },
  switch: { stroke: '#38bdf8', strokeWidth: 1.5, animated: false },
  ap: { stroke: '#10b981', strokeWidth: 1.5, animated: false },
};

export const TopologyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<TopologyFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { data: topologyData, isLoading, isFetching } = useQuery<TopologyResponse>({
    queryKey: ['topology-graph'],
    queryFn: () => topologyApi.getTopology(),
    refetchInterval: isEditMode ? false : 30000,
  });

  useEffect(() => {
    if (topologyData && !hasUnsavedChanges) {
      setNodes((topologyData.nodes || []) as TopologyFlowNode[]);
      setEdges((topologyData.edges || []) as Edge[]);
    }
  }, [topologyData, hasUnsavedChanges, setNodes, setEdges]);

  const refreshMutation = useMutation({
    mutationFn: () => topologyApi.scanTopology(),
    onSuccess: (res) => {
      const newData = res.data;
      queryClient.setQueryData(['topology-graph'], newData);
      if (!hasUnsavedChanges) {
        setNodes((newData.nodes || []) as TopologyFlowNode[]);
        setEdges((newData.edges || []) as Edge[]);
      }
      toast.success(res.message || 'Topologi jaringan berhasil diperbarui');
    },
    onError: () => {
      toast.error('Gagal melakukan pemindaian topologi');
    },
  });

  const saveLayoutMutation = useMutation({
    mutationFn: () => topologyApi.saveTopology({ nodes, edges }),
    onSuccess: (res) => {
      const savedData = res.data;
      queryClient.setQueryData(['topology-graph'], savedData);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      toast.success(res.message || 'Susunan topologi kustom berhasil disimpan ke database');
    },
    onError: () => {
      toast.error('Gagal menyimpan susunan topologi');
    },
  });

  const resetLayoutMutation = useMutation({
    mutationFn: () => topologyApi.resetTopology(),
    onSuccess: (res) => {
      const baselineData = res.data;
      queryClient.setQueryData(['topology-graph'], baselineData);
      setNodes((baselineData.nodes || []) as TopologyFlowNode[]);
      setEdges((baselineData.edges || []) as Edge[]);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      toast.success(res.message || 'Topologi berhasil dikembalikan ke susunan fisik standar');
    },
    onError: () => {
      toast.error('Gagal mereset topologi');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (nodeData: TopologyNodeData) =>
      topologyApi.promoteNeighbor({
        label: nodeData.label,
        host: nodeData.host,
        vendor: nodeData.vendor,
        board: nodeData.board,
        tier: nodeData.tier,
        interface: nodeData.interface,
      }),
    onSuccess: () => {
      toast.success('Perangkat berhasil didaftarkan ke sistem monitoring NOVA');
      setSelectedNode(null);
      refreshMutation.mutate();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal mendaftarkan perangkat');
    },
  });

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isEditMode) return;
      const targetNode = nodes.find((n) => n.id === params.target);
      const tier = String(targetNode?.data?.tier || 'switch');
      const styleConf = TIER_EDGE_STYLES[tier] || TIER_EDGE_STYLES.switch;

      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        source: params.source || '',
        target: params.target || '',
        animated: styleConf.animated,
        label: 'Custom Link',
        style: { stroke: styleConf.stroke, strokeWidth: styleConf.strokeWidth },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
      toast.info('Garis koneksi berhasil ditambahkan');
    },
    [isEditMode, nodes, setEdges]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (!isEditMode) return;
      setSelectedEdge(edge);
      setIsEdgeModalOpen(true);
    },
    [isEditMode]
  );

  const handleSaveEdgeDetails = useCallback(
    (edgeId: string, updated: { label: string; stroke: string; strokeWidth: number; animated: boolean }) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                label: updated.label,
                animated: updated.animated,
                style: { stroke: updated.stroke, strokeWidth: updated.strokeWidth },
              }
            : e
        )
      );
      setHasUnsavedChanges(true);
      toast.success('Detail kabel koneksi berhasil diperbarui');
    },
    [setEdges]
  );

  const handleDeleteEdgeFromModal = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setHasUnsavedChanges(true);
      toast.info('Garis koneksi dihapus');
    },
    [setEdges]
  );

  const handleNodeDragStop = useCallback(() => {
    if (isEditMode) {
      setHasUnsavedChanges(true);
    }
  }, [isEditMode]);

  const handleAddCustomNode = (newNodeData: {
    label: string;
    host: string;
    tier: string;
    vendor: string;
    board: string;
    interfaceName: string;
    parentNodeId: string;
  }) => {
    const newId = `custom-${newNodeData.tier}-${Date.now()}`;
    const parentNode = nodes.find((n) => n.id === newNodeData.parentNodeId);
    const posX = parentNode ? parentNode.position.x + (Math.random() * 160 - 80) : 900;
    const posY = parentNode ? parentNode.position.y + 180 : 500;

    const createdNode: TopologyFlowNode = {
      id: newId,
      type: 'customTopology',
      position: { x: Math.round(posX), y: Math.round(posY) },
      data: {
        id: newId,
        label: newNodeData.label,
        host: newNodeData.host,
        mac: '',
        tier: newNodeData.tier,
        device_type: newNodeData.tier,
        vendor: newNodeData.vendor,
        board: newNodeData.board,
        status: 'ONLINE',
        is_monitored: false,
        interface: newNodeData.interfaceName,
      },
    };

    setNodes((nds) => [...nds, createdNode]);

    if (newNodeData.parentNodeId) {
      const styleConf = TIER_EDGE_STYLES[newNodeData.tier] || TIER_EDGE_STYLES.switch;
      const createdEdge: Edge = {
        id: `edge-${newNodeData.parentNodeId}-${newId}`,
        source: newNodeData.parentNodeId,
        target: newId,
        animated: styleConf.animated,
        label: newNodeData.interfaceName,
        style: { stroke: styleConf.stroke, strokeWidth: styleConf.strokeWidth },
      };
      setEdges((eds) => [...eds, createdEdge]);
    }

    setHasUnsavedChanges(true);
    toast.success(`Node "${newNodeData.label}" berhasil ditambahkan ke kanvas`);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    const targetId = nodes.find(
      (n) => n.data?.id === selectedNode.id || n.data?.label === selectedNode.label
    )?.id;
    if (!targetId) return;

    setNodes((nds) => nds.filter((n) => n.id !== targetId));
    setEdges((eds) => eds.filter((e) => e.source !== targetId && e.target !== targetId));
    setSelectedNode(null);
    setHasUnsavedChanges(true);
    toast.info('Node dan garis koneksinya telah dihapus dari kanvas');
  };

  const { filteredNodes, filteredEdges } = useMemo(() => {
    const allowedIds = new Set<string>();

    const fNodes = nodes.filter((node) => {
      const data = node.data || ({} as TopologyNodeData);
      const matchesTier = tierFilter === 'ALL' || String(data.tier || '').toUpperCase() === tierFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (data.label && data.label.toLowerCase().includes(q)) ||
        (data.host && data.host.toLowerCase().includes(q)) ||
        (data.board && data.board.toLowerCase().includes(q)) ||
        (data.interface && data.interface.toLowerCase().includes(q));

      if (matchesTier && matchesSearch) {
        allowedIds.add(node.id);
        return true;
      }
      return false;
    });

    const fEdges = edges.filter(
      (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target)
    );

    return { filteredNodes: fNodes, filteredEdges: fEdges };
  }, [nodes, edges, tierFilter, searchQuery]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as TopologyNodeData);
  }, []);

  const summary = topologyData?.summary;

  return (
    <div className="space-y-4 h-[calc(100vh-7.5rem)] flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                  Peta Topologi Hierarki Jaringan
                </h1>
                {summary?.is_custom_layout && (
                  <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px]">
                    CUSTOM LAYOUT
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Topologi Berlapis: Dual-WAN Uplink, Core Router, Main Aggregation Switch, Distribution Switch, dan Access Point
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary && (
            <div className="hidden xl:flex items-center gap-2 mr-2">
              <Badge variant="outline" className="bg-slate-950/80 border-slate-800 text-slate-300 gap-1.5 py-1 px-2.5">
                <Globe className="h-3 w-3 text-cyan-400" /> WAN: {summary.wan_count ?? 2}
              </Badge>
              <Badge variant="outline" className="bg-slate-950/80 border-slate-800 text-slate-300 gap-1.5 py-1 px-2.5">
                <Router className="h-3 w-3 text-cyan-400" /> Core: {summary.core_count}
              </Badge>
              <Badge variant="outline" className="bg-slate-950/80 border-slate-800 text-slate-300 gap-1.5 py-1 px-2.5">
                <Server className="h-3 w-3 text-sky-400" /> Switch: {summary.switch_count}
              </Badge>
              <Badge variant="outline" className="bg-slate-950/80 border-slate-800 text-slate-300 gap-1.5 py-1 px-2.5">
                <Wifi className="h-3 w-3 text-emerald-400" /> AP: {summary.ap_count}
              </Badge>
            </div>
          )}

          {isAdmin && (
            <>
              <Button
                size="sm"
                variant={isEditMode ? 'default' : 'outline'}
                onClick={() => setIsEditMode(!isEditMode)}
                className={
                  isEditMode
                    ? 'min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'
                    : 'min-h-[44px] border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                }
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                {isEditMode ? 'Keluar Mode Edit' : 'Mode Edit Topologi'}
              </Button>

              {isEditMode && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(true)}
                    className="min-h-[44px] border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Node
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => saveLayoutMutation.mutate()}
                    disabled={saveLayoutMutation.isPending}
                    className="min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saveLayoutMutation.isPending ? 'Menyimpan...' : 'Simpan Susunan'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Reset susunan kustom dan kembalikan ke topologi fisik bawaan?')) {
                        resetLayoutMutation.mutate();
                      }
                    }}
                    disabled={resetLayoutMutation.isPending}
                    className="min-h-[44px] border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Default
                  </Button>
                </>
              )}
            </>
          )}

          {!isEditMode && (
            <Button
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending || isFetching}
              className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${(refreshMutation.isPending || isFetching) ? 'animate-spin' : ''}`} />
              Scan Ulang
            </Button>
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>
              <strong>Mode Edit Aktif:</strong> Geser kartu perangkat untuk mengatur posisi, tarik titik konektor antar perangkat untuk menyambung kabel baru, atau <strong>klik garis kabel</strong> untuk mengubah nama port/warna/menghapus koneksi.
            </span>
          </div>
          {selectedNode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteSelectedNode}
              className="min-h-[38px] text-xs border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Hapus Node "{selectedNode.label}"
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'ALL', label: 'Semua Layer' },
            { key: 'WAN', label: 'WAN / ISP' },
            { key: 'CORE', label: 'Core Router' },
            { key: 'SWITCH', label: 'Switch Distribusi' },
            { key: 'AP', label: 'Access Point' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTierFilter(tab.key)}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                tierFilter === tab.key
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari perangkat, IP, model, atau port..."
            className="w-full min-h-[40px] pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
        </div>
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-inner">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm font-mono">Memetakan hierarki fisik jaringan...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={isEditMode ? onNodesChange : undefined}
            onEdgesChange={isEditMode ? onEdgesChange : undefined}
            onConnect={onConnect}
            onEdgeClick={handleEdgeClick}
            onNodeDragStop={handleNodeDragStop}
            nodesDraggable={isEditMode}
            nodesConnectable={isEditMode}
            elementsSelectable={true}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.15}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="#1e293b"
            />
            <Controls className="!bg-slate-900 !border-slate-800 !rounded-lg overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-800" />
            <MiniMap
              nodeColor={(n) => {
                const status = n.data?.status;
                if (status === 'ONLINE') return '#10b981';
                if (status === 'OFFLINE') return '#f43f5e';
                return '#38bdf8';
              }}
              maskColor="rgba(2, 6, 23, 0.75)"
              className="!bg-slate-900/90 !border-slate-800 !rounded-lg"
            />
          </ReactFlow>
        )}

        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[11px] space-y-1.5 hidden sm:block">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Legenda Hierarki
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Termonitor & Online
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Termonitor & Offline
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Terdeteksi Otomatis (MNDP/CDP/LLDP)
          </div>
        </div>
      </div>

      <NodeDetailDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onPromote={(nodeData) => promoteMutation.mutate(nodeData)}
        isPromoting={promoteMutation.isPending}
      />

      <AddTopologyNodeModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingNodes={nodes}
        onAddNode={handleAddCustomNode}
      />

      <EditEdgeModal
        open={isEdgeModalOpen}
        edge={selectedEdge}
        onClose={() => {
          setIsEdgeModalOpen(false);
          setSelectedEdge(null);
        }}
        onSave={handleSaveEdgeDetails}
        onDelete={handleDeleteEdgeFromModal}
      />
    </div>
  );
};
export default TopologyPage;
