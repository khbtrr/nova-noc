import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi } from '@/services/deviceApi';
import { CreateDeviceDTO, UpdateDeviceDTO, Device } from '@/types/device';

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceDTO) => deviceApi.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateDeviceDTO | Partial<Device> }) =>
      deviceApi.updateDevice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ['device', Number(variables.id)] });
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
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();

  return {
    ...query,
    devices: (query.data as Device[]) || [],
    createDevice: createMutation.mutateAsync,
    updateDevice: updateMutation.mutateAsync,
    deleteDevice: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
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
