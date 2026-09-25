import { create } from 'zustand';
import { Device } from '@/types/device';

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  setDevices: (devices: Device[]) => void;
  selectDevice: (device: Device | null) => void;
  updateDeviceStatus: (id: string, status: Device['status']) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDevice: null,
  setDevices: (devices) => set({ devices }),
  selectDevice: (device) => set({ selectedDevice: device }),
  updateDeviceStatus: (id, status) => set((state) => ({
    devices: state.devices.map(d => d.id === id ? { ...d, status } : d),
    selectedDevice: state.selectedDevice?.id === id ? { ...state.selectedDevice, status } : state.selectedDevice
  }))
}));
