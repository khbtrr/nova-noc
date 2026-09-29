export type SyslogSeverity = 
  | 'EMERGENCY'
  | 'ALERT'
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'NOTICE'
  | 'INFO'
  | 'DEBUG';

export interface SyslogMessage {
  id: number;
  device_id?: number | null;
  device_name?: string | null;
  host: string;
  facility: string;
  severity: SyslogSeverity;
  topic?: string | null;
  message: string;
  timestamp: string;
  created_at: string;
}

export interface SyslogStats {
  total: number;
  emergency: number;
  critical: number;
  error: number;
  warning: number;
  notice: number;
  info: number;
  debug: number;
}

export interface PaginatedSyslog {
  items: SyslogMessage[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SyslogFilter {
  device_id?: number;
  severity?: string;
  topic?: string;
  search?: string;
  page?: number;
  limit?: number;
}
