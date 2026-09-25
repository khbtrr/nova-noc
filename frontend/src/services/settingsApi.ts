import { api } from './api';

export interface SystemSettingsData {
  app_name: string;
  default_poll_interval: number;
  telegram_configured: boolean;
  gemini_configured: boolean;
  telegram_chat_id: string;
  debug_mode: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<SystemSettingsData> => {
    const res = await api.get('/settings');
    return res.data;
  },

  testTelegram: async (message?: string): Promise<{ status: string; message: string }> => {
    const res = await api.post('/settings/test-telegram', { message });
    return res.data;
  }
};
