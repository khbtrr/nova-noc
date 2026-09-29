import { api } from './api';
import { Device, CreateDeviceDTO, UpdateDeviceDTO, SnoozeDeviceDTO } from '@/types/device';

export const deviceApi = {
  getDevices: async (): Promise<Device[]> => {
    const res = await api.get('/devices');
    return res.data;
  },
  
  getDevice: async (id: string | number): Promise<Device> => {
    const res = await api.get(`/devices/${id}`);
    return res.data;
  },
  
  createDevice: async (data: CreateDeviceDTO): Promise<Device> => {
    const res = await api.post('/devices', data);
    return res.data;
  },
  
  updateDevice: async (id: string | number, data: UpdateDeviceDTO | Partial<Device>): Promise<Device> => {
    const res = await api.put(`/devices/${id}`, data);
    return res.data;
  },
  
  deleteDevice: async (id: string): Promise<void> => {
    await api.delete(`/devices/${id}`);
  },
  
  testDevice: async (data: Partial<CreateDeviceDTO>): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/devices/test', data);
    return res.data;
  },

  snoozeDevice: async (id: string | number, data: SnoozeDeviceDTO): Promise<Device> => {
    const res = await api.post(`/devices/${id}/snooze`, data);
    return res.data;
  },

  unsnoozeDevice: async (id: string | number): Promise<Device> => {
    const res = await api.post(`/devices/${id}/unsnooze`);
    return res.data;
  }
};
