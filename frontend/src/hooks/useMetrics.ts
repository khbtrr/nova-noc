import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';

export const useMetrics = (deviceId: string) => {
  return useQuery({
    queryKey: ['metrics', deviceId],
    queryFn: () => metricsApi.getMetrics(deviceId),
    enabled: !!deviceId,
    refetchInterval: 10000, // auto-refetch every 10s
  });
};

export const useMetricsHistory = (deviceId: string, timeRange: string) => {
  return useQuery({
    queryKey: ['metricsHistory', deviceId, timeRange],
    queryFn: () => metricsApi.getMetricsHistory(deviceId, timeRange),
    enabled: !!deviceId,
    refetchInterval: 60000,
  });
};
