import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertApi } from '@/services/alertApi';
import { useAlertStore } from '@/stores/alertStore';
import { AlertRule } from '@/types/alert';
import { toast } from 'sonner';

export const useAlerts = () => {
  const queryClient = useQueryClient();
  const { setAlerts } = useAlertStore();

  const alertsQuery = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      try {
        const data = await alertApi.getAlerts(true);
        setAlerts(data);
        return data;
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const historyQuery = useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: async () => {
      try {
        return await alertApi.getAlertHistory();
      } catch {
        return [];
      }
    },
  });

  const rulesQuery = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      try {
        return await alertApi.getRules();
      } catch {
        return [];
      }
    },
  });

  const ackMutation = useMutation({
    mutationFn: alertApi.acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert berhasil di-acknowledge.');
    },
    onError: () => {
      toast.error('Gagal memperbarui status alert.');
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: alertApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Aturan alert berhasil dibuat.');
    },
    onError: () => {
      toast.error('Gagal membuat aturan alert.');
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number | string; rule: Partial<AlertRule> }) =>
      alertApi.updateRule(id, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Aturan threshold berhasil diperbarui.');
    },
    onError: () => {
      toast.error('Gagal memperbarui aturan threshold.');
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: alertApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Aturan alert berhasil dihapus.');
    },
    onError: () => {
      toast.error('Gagal menghapus aturan alert.');
    }
  });

  return {
    activeAlerts: alertsQuery.data || [],
    isLoadingAlerts: alertsQuery.isLoading,
    alertHistory: historyQuery.data || [],
    rules: rulesQuery.data || [],
    acknowledgeAlert: ackMutation.mutate,
    isAcknowledging: ackMutation.isPending,
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
  };
};
