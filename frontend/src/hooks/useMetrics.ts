import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metricsApi } from '@/services/metricsApi';
import { remediationApi } from '@/services/remediationApi';
import { aiApi } from '@/services/aiApi';

export const useMetrics = (deviceId: string | number) => {
  const query = useQuery({
    queryKey: ['metrics', String(deviceId)],
    queryFn: () => metricsApi.getMetrics(deviceId),
    enabled: !!deviceId,
    refetchInterval: 10000,
  });

  return {
    ...query,
    metrics: query.data,
  };
};

export const useDeviceMetrics = (deviceId: string | number) => {
  return useMetrics(deviceId);
};

export const useMetricsHistory = (deviceId: string | number, timeRange: string) => {
  const query = useQuery({
    queryKey: ['metricsHistory', String(deviceId), timeRange],
    queryFn: () => metricsApi.getMetricsHistory(deviceId, timeRange),
    enabled: !!deviceId,
    refetchInterval: 60000,
  });

  return {
    ...query,
    history: query.data,
  };
};

export const useDeviceInterfaces = (deviceId: string | number) => {
  const query = useQuery({
    queryKey: ['deviceInterfaces', String(deviceId)],
    queryFn: () => metricsApi.getInterfaces(deviceId),
    enabled: !!deviceId,
    refetchInterval: 10000,
  });

  return {
    ...query,
    interfaces: query.data || [],
  };
};

export const useDeviceDHCPLeases = (deviceId: string | number) => {
  const query = useQuery({
    queryKey: ['deviceDHCP', String(deviceId)],
    queryFn: () => metricsApi.getDHCPLeases(deviceId),
    enabled: !!deviceId,
    refetchInterval: 30000,
  });

  return {
    ...query,
    dhcpLeases: query.data || [],
  };
};

export const useDeviceRoutes = (deviceId: string | number) => {
  const query = useQuery({
    queryKey: ['deviceRoutes', String(deviceId)],
    queryFn: () => metricsApi.getRoutes(deviceId),
    enabled: !!deviceId,
    refetchInterval: 30000,
  });

  return {
    ...query,
    routes: query.data || [],
  };
};

export const useDeviceRemediationLogs = (deviceId: string | number) => {
  const query = useQuery({
    queryKey: ['deviceRemediationLogs', String(deviceId)],
    queryFn: () => remediationApi.getDeviceLogs(deviceId),
    enabled: !!deviceId,
    refetchInterval: 20000,
  });

  return {
    ...query,
    logs: query.data || [],
  };
};

export const useActiveAnomalies = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['activeAnomalies'],
    queryFn: () => aiApi.getActiveAnomalies(),
    refetchInterval: 15000,
  });

  const resolveMutation = useMutation({
    mutationFn: (deviceId: number) => aiApi.resolveAnomaly(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeAnomalies'] });
    },
  });

  return {
    ...query,
    activeAnomalies: query.data || [],
    resolveAnomaly: resolveMutation.mutate,
  };
};
