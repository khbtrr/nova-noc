import { api } from './api';
import { DeviceMetrics, MetricsHistoryData, InterfaceTraffic, DHCPLease, Route } from '@/types/metrics';

export const metricsApi = {
  getMetrics: async (deviceId: string | number): Promise<DeviceMetrics> => {
    const res = await api.get(`/metrics/${deviceId}`);
    return res.data;
  },

  getMetricsHistory: async (deviceId: string | number, timeRange: string = '1h'): Promise<MetricsHistoryData> => {
    const res = await api.get(`/metrics/${deviceId}/history`, { params: { range: timeRange } });
    return res.data;
  },

  getInterfaces: async (deviceId: string | number): Promise<InterfaceTraffic[]> => {
    const res = await api.get(`/metrics/${deviceId}/interfaces`);
    return res.data;
  },

  getDHCPLeases: async (deviceId: string | number): Promise<DHCPLease[]> => {
    const res = await api.get(`/metrics/${deviceId}/dhcp`);
    return res.data;
  },

  getRoutes: async (deviceId: string | number): Promise<Route[]> => {
    const res = await api.get(`/metrics/${deviceId}/routes`);
    return res.data;
  },
};
