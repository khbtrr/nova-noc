import { api } from './api';

export interface WanProfileConfig {
  primary_name: string;
  primary_desc: string;
  primary_interface: string;
  primary_gateway: string;
  secondary_name: string;
  secondary_desc: string;
  secondary_interface: string;
  secondary_gateway: string;
  lan_trunk_interface: string;
}

export interface SystemSettingsData {
  app_name: string;
  default_poll_interval: number;
  telegram_configured: bool | boolean;
  gemini_configured: bool | boolean;
  telegram_chat_id: string;
  debug_mode: boolean;
  wan_profile?: WanProfileConfig;
}

type bool = boolean;

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
