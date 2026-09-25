import { api } from './api';

export interface RemediationLogItem {
  id: number;
  device_id: number;
  device_name?: string;
  device_host?: string;
  action_type: 'FLUSH_DNS' | 'RESTART_INTERFACE' | 'RUN_DIAGNOSTICS' | 'ACKNOWLEDGE';
  target: string;
  trigger_channel: 'TELEGRAM' | 'DASHBOARD';
  executed_by: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  output_details: string;
  created_at: string;
}

export interface RemediationRequest {
  device_id: number;
  action_type: 'FLUSH_DNS' | 'RESTART_INTERFACE' | 'RUN_DIAGNOSTICS' | 'ACKNOWLEDGE';
  target?: string;
  executed_by?: string;
}

export const remediationApi = {
  execute: async (req: RemediationRequest): Promise<{ success: boolean; log_id: number; message: string }> => {
    const res = await api.post('/remediation/execute', req);
    return res.data;
  },

  getLogs: async (limit: number = 50): Promise<RemediationLogItem[]> => {
    const res = await api.get('/remediation/logs', { params: { limit } });
    return res.data;
  },

  getDeviceLogs: async (deviceId: string | number, limit: number = 30): Promise<RemediationLogItem[]> => {
    const res = await api.get(`/remediation/logs/${deviceId}`, { params: { limit } });
    return res.data;
  }
};
