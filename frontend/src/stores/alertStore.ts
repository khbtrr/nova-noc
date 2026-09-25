import { create } from 'zustand';
import { Alert } from '@/types/alert';

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string | number) => void;
}

const isAck = (a: Alert) => Boolean(a.is_acknowledged || a.acknowledged);

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) => set({ 
    alerts, 
    unreadCount: alerts.filter(a => !isAck(a)).length 
  }),
  addAlert: (alert) => set((state) => {
    const newAlerts = [alert, ...state.alerts.filter(a => a.id !== alert.id)].slice(0, 100);
    return {
      alerts: newAlerts,
      unreadCount: newAlerts.filter(a => !isAck(a)).length
    };
  }),
  acknowledgeAlert: (id) => set((state) => {
    const newAlerts = state.alerts.map(a => 
      a.id === id ? { ...a, is_acknowledged: true, acknowledged: true } : a
    );
    return {
      alerts: newAlerts,
      unreadCount: newAlerts.filter(a => !isAck(a)).length
    };
  })
}));
