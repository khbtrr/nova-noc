export const STATUS_COLORS = {
  online: 'text-emerald-500',
  offline: 'text-red-500',
  warning: 'text-amber-500',
  unknown: 'text-slate-500',
};

export const SEVERITY_COLORS = {
  critical: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export const METRIC_LABELS = {
  cpu: 'CPU Usage',
  memory: 'Memory Usage',
  temperature: 'Temperature',
  traffic: 'Network Traffic',
};

export const DEFAULT_THRESHOLDS = {
  cpu: 80,
  memory: 85,
  temperature: 70,
};

export const API_ROUTES = {
  AUTH_LOGIN: '/auth/login',
  DEVICES: '/devices',
  METRICS: '/metrics',
  ALERTS: '/alerts',
  AI_CHAT: '/ai/chat',
  AI_ANALYZE: '/ai/analyze',
  AI_HEALTH: '/ai/health-score',
};
