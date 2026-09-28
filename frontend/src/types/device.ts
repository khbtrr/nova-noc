export type DeviceType = 'MIKROTIK' | 'SNMP' | 'mikrotik' | 'snmp' | 'server';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'CRITICAL' | 'online' | 'offline' | 'warning' | 'unknown';

export interface Device {
  id: string | number;
  name: string;
  host: string;
  ip_address?: string; // alias for host
  device_type: DeviceType;
  type?: DeviceType; // alias
  port?: number;
  username?: string;
  snmp_community?: string;
  snmp_version?: string;
  poll_interval?: number;
  is_enabled?: boolean;
  group?: string;
  location?: string;
  status: DeviceStatus;
  last_seen?: string;
  uptime?: string | number;
  version?: string;
  board_name?: string;
  cpu_load?: number;
  memory_usage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDeviceDTO {
  name: string;
  host: string;
  device_type: 'MIKROTIK' | 'SNMP';
  port?: number;
  username?: string;
  password?: string;
  snmp_community?: string;
  snmp_version?: string;
  poll_interval?: number;
  is_enabled?: boolean;
  group?: string;
  location?: string;
}

export interface UpdateDeviceDTO {
  name?: string;
  host?: string;
  device_type?: 'MIKROTIK' | 'SNMP' | DeviceType;
  port?: number;
  username?: string;
  password?: string;
  snmp_community?: string;
  snmp_version?: string;
  poll_interval?: number;
  is_enabled?: boolean;
  group?: string;
  location?: string;
}
