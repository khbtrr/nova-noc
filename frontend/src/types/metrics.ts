export interface Metric {
  device_id: string | number;
  cpu_usage?: number;
  memory_usage?: number;
  temperature?: number;
  active_users?: number;
  timestamp: string;
}

export interface InterfaceTraffic {
  name: string;
  type?: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_rate?: number;
  tx_rate?: number;
  running?: boolean;
  disabled?: boolean;
}

export interface DeviceMetrics {
  device_id?: number | string;
  cpu_load?: number;
  memory_usage?: number;
  memory_total?: number;
  memory_free?: number;
  uptime?: string | number;
  board_name?: string;
  version?: string;
  rx_kbps?: number;
  tx_kbps?: number;
  current?: Metric;
  interfaces?: InterfaceTraffic[];
  dhcp_leases?: DHCPLease[];
  routes?: Route[];
}

export interface DHCPLease {
  address: string;
  mac_address: string;
  server?: string;
  host_name?: string;
  status: string;
  expires_after?: string;
}

export interface Route {
  dst_address: string;
  gateway: string;
  distance: number;
  status?: string;
}
