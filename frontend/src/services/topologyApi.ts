import { api } from './api';

export interface TopologyNodeData {
  id: string | number;
  label: string;
  host: string;
  mac: string;
  tier: 'wan' | 'core' | 'switch' | 'ap' | string;
  device_type: string;
  vendor: string;
  board: string;
  status: string;
  is_monitored: boolean;
  interface: string;
  is_custom?: boolean;
}

export interface TopologyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TopologyNodeData;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
  style?: Record<string, any>;
  data?: {
    media_type?: 'fiber' | 'ethernet' | 'wan' | 'wireless';
    speed?: string;
  };
}

export interface TopologySummary {
  total_nodes: number;
  wan_count: number;
  core_count: number;
  switch_count: number;
  ap_count: number;
  edges_count: number;
  is_custom_layout?: boolean;
  last_scan: string;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  summary: TopologySummary;
}

export interface PromoteDeviceDTO {
  label: string;
  host: string;
  vendor?: string;
  board?: string;
  tier?: string;
  interface?: string;
}

export const topologyApi = {
  getTopology: async (): Promise<TopologyResponse> => {
    const res = await api.get('/topology');
    return res.data;
  },

  scanTopology: async (): Promise<{ status: string; message: string; data: TopologyResponse }> => {
    const res = await api.post('/topology/scan');
    return res.data;
  },

  saveTopology: async (payload: { nodes: TopologyNode[]; edges: TopologyEdge[] }): Promise<{ status: string; message: string; data: TopologyResponse }> => {
    const res = await api.post('/topology/save', payload);
    return res.data;
  },

  resetTopology: async (): Promise<{ status: string; message: string; data: TopologyResponse }> => {
    const res = await api.post('/topology/reset');
    return res.data;
  },

  promoteNeighbor: async (dto: PromoteDeviceDTO): Promise<{ status: string; message: string; device: any }> => {
    const res = await api.post('/topology/promote', dto);
    return res.data;
  }
};
