export interface TopTalkerItem {
  rank: number;
  ip: string;
  hostname: string;
  bytes: number;
  mbps: number;
  packets: number;
  percent_share: number;
  is_local: boolean;
}

export interface ProtocolItem {
  name: string;
  type: 'protocol' | 'service';
  bytes: number;
  percent: number;
}

export interface ConversationItem {
  rank: number;
  src_ip: string;
  src_hostname: string;
  dst_ip: string;
  dst_hostname: string;
  service: string;
  protocol: string;
  bytes: number;
  mbps: number;
  percent: number;
}

export interface FlowStatus {
  is_running: boolean;
  port: number;
  enabled: boolean;
  uptime_seconds: number;
  total_packets_received: number;
  total_flows_processed: number;
  total_bytes_processed: number;
  live_throughput_mbps: number;
  last_received_at: string | null;
  configured_exporter: string;
}
