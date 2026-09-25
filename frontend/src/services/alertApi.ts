import { api } from './api';
import { Alert, AlertRule } from '@/types/alert';

export const alertApi = {
  getAlerts: async (activeOnly: boolean = true): Promise<Alert[]> => {
    const res = await api.get('/alerts', { params: { active_only: activeOnly } });
    return res.data;
  },

  getAlertHistory: async (limit: number = 100): Promise<Alert[]> => {
    const res = await api.get('/alerts/history', { params: { limit } });
    return res.data;
  },

  acknowledgeAlert: async (id: number | string): Promise<Alert> => {
    const res = await api.put(`/alerts/${id}/acknowledge`);
    return res.data;
  },

  getRules: async (): Promise<AlertRule[]> => {
    const res = await api.get('/alerts/rules');
    return res.data;
  },

  createRule: async (rule: Partial<AlertRule>): Promise<AlertRule> => {
    const res = await api.post('/alerts/rules', rule);
    return res.data;
  },

  updateRule: async (id: number | string, rule: Partial<AlertRule>): Promise<AlertRule> => {
    const res = await api.put(`/alerts/rules/${id}`, rule);
    return res.data;
  },

  deleteRule: async (id: number | string): Promise<void> => {
    await api.delete(`/alerts/rules/${id}`);
  }
};
