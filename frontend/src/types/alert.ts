export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'info' | 'warning' | 'critical';

export interface Alert {
  id: string | number;
  device_id: string | number;
  device_name?: string;
  severity: AlertSeverity;
  metric_name?: string;
  metric_value?: number;
  threshold_value?: number;
  message: string;
  created_at?: string;
  timestamp?: string;
  is_acknowledged?: boolean;
  acknowledged?: boolean;
  acknowledged_by?: string | number;
  acknowledged_at?: string;
  is_resolved?: boolean;
  resolved_at?: string;
}

export interface AlertRule {
  id: number | string;
  device_id?: number | null;
  metric_name: string;
  condition: string;
  warning_threshold: number;
  critical_threshold: number;
  is_enabled: boolean;
  created_at?: string;
}
