import { api } from './api';

export interface DeviceHealth {
  device_id: number;
  device_name: string;
  host: string;
  health_score: number;
  status: string;
  cpu_load: number;
  memory_usage: number;
}

export interface NetworkAnalysisResponse {
  overall_health_score: number;
  summary: string;
  recommendations: string[];
  devices: DeviceHealth[];
}

export interface SingleDeviceAnalysisResponse {
  device_id: number;
  health_score: number;
  analysis: string;
}

export const aiApi = {
  analyzeNetwork: async (): Promise<NetworkAnalysisResponse> => {
    const res = await api.post('/ai/analyze');
    return res.data;
  },

  analyzeDevice: async (deviceId: string | number): Promise<SingleDeviceAnalysisResponse> => {
    const res = await api.post(`/ai/analyze/${deviceId}`);
    return res.data;
  },

  chat: async (message: string, deviceId?: number): Promise<{ reply: string }> => {
    const res = await api.post('/ai/chat', { message, device_id: deviceId });
    return res.data;
  },

  getHealthScores: async (): Promise<{ overall_health_score: number; devices: DeviceHealth[]; recommendations: string[] }> => {
    const res = await api.get('/ai/health-score');
    return res.data;
  }
};
