import { api } from './api';
import { DeviceMetrics, Metric, InterfaceTraffic, DHCPLease, Route } from '@/types/metrics';

export const metricsApi = {
  getMetrics: async (deviceId: string): Promise<DeviceMetrics> => {
    const res = await api.get(`/metrics/${deviceId}`);
    return res.data;
  },
  
  getMetricsHistory: async (deviceId: string, timeRange: string = '1h'): Promise<Metric[]> => {
    const res = await api.get(`/metrics/${deviceId}/history`, { params: { range: timeRange } });
    return res.data;
  },
  
  getInterfaces: async (deviceId: string): Promise<InterfaceTraffic[]> => {
    const res = await api.get(`/metrics/${deviceId}/interfaces`);
    return res.data;
  },
  
  getDHCPLeases: async (deviceId: string): Promise<DHCPLease[]> => {
    const res = await api.get(`/metrics/${deviceId}/dhcp`);
    return res.data;
  },
  
  getRoutes: async (deviceId: string): Promise<Route[]> => {
    const res = await api.get(`/metrics/${deviceId}/routes`);
    return res.data;
  }
};
