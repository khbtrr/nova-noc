import { api } from './api';
import { TopTalkerItem, ProtocolItem, ConversationItem, FlowStatus } from '@/types/flow';

export const flowApi = {
  getTopTalkers: async (window: string = '5m', limit: number = 20): Promise<TopTalkerItem[]> => {
    const res = await api.get('/flow/top-talkers', { params: { window, limit } });
    return res.data?.data || [];
  },

  getTopDestinations: async (window: string = '5m', limit: number = 20): Promise<TopTalkerItem[]> => {
    const res = await api.get('/flow/top-destinations', { params: { window, limit } });
    return res.data?.data || [];
  },

  getProtocols: async (window: string = '5m'): Promise<ProtocolItem[]> => {
    const res = await api.get('/flow/protocols', { params: { window } });
    return res.data?.data || [];
  },

  getConversations: async (window: string = '5m', limit: number = 20): Promise<ConversationItem[]> => {
    const res = await api.get('/flow/conversations', { params: { window, limit } });
    return res.data?.data || [];
  },

  getStatus: async (): Promise<FlowStatus> => {
    const res = await api.get('/flow/status');
    return res.data;
  }
};
