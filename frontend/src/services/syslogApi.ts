import { api } from './api';
import { PaginatedSyslog, SyslogStats, SyslogFilter } from '@/types/syslog';

export const syslogApi = {
  getSyslogs: async (filter: SyslogFilter = {}): Promise<PaginatedSyslog> => {
    const res = await api.get('/syslog', { params: filter });
    return res.data;
  },

  getStats: async (): Promise<SyslogStats> => {
    const res = await api.get('/syslog/stats');
    return res.data;
  },

  clearSyslogs: async (): Promise<{ message: string }> => {
    const res = await api.delete('/syslog/clear');
    return res.data;
  }
};
