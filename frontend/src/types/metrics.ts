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
  latency_ms?: number;
  packet_loss?: number;
  wan_latency_ms?: number;
  wan_packet_loss?: number;
  min_rtt_ms?: number;
  max_rtt_ms?: number;
  jlm_latency_ms?: number;
  jlm_packet_loss?: number;
  jlm_rx_mbps?: number;
  jlm_tx_mbps?: number;
  jlm_status?: string;
  ion_latency_ms?: number;
  ion_packet_loss?: number;
  ion_rx_mbps?: number;
  ion_tx_mbps?: number;
  ion_status?: string;
  current?: Metric;
  interfaces?: InterfaceTraffic[];
  dhcp_leases?: DHCPLease[];
  routes?: Route[];
}

export interface MetricsHistoryData {
  device_id: number;
  timestamps: string[];
  cpu: number[];
  memory: number[];
  rx?: number[];
  tx?: number[];
  latency?: number[];
  packet_loss?: number[];
  wan_latency?: number[];
  wan_packet_loss?: number[];
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
