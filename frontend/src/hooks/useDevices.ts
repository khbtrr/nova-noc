import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi } from '@/services/deviceApi';
import { CreateDeviceDTO, Device } from '@/types/device';

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceDTO) => deviceApi.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deviceApi.deleteDevice(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useDevices = () => {
  const query = useQuery({
    queryKey: ['devices'],
    queryFn: deviceApi.getDevices,
  });

  const createMutation = useCreateDevice();
  const deleteMutation = useDeleteDevice();

  return {
    ...query,
    devices: (query.data as Device[]) || [],
    createDevice: createMutation.mutateAsync,
    deleteDevice: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useDevice = (id: string | number) => {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceApi.getDevice(String(id)),
    enabled: !!id,
  });
};
