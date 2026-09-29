import struct
import socket
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("nova.flow.decoder")

# Standard IANA IP Protocol numbers to human names
IP_PROTOCOLS = {
    1: "ICMP",
    2: "IGMP",
    6: "TCP",
    17: "UDP",
    41: "IPv6",
    47: "GRE",
    50: "ESP",
    51: "AH",
    58: "ICMPv6",
    89: "OSPF",
    103: "PIM",
    112: "VRRP",
    132: "SCTP",
}

# Well-known and common network service ports
WELL_KNOWN_PORTS = {
    20: "FTP-Data",
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    67: "DHCP",
    68: "DHCP",
    69: "TFTP",
    80: "HTTP",
    110: "POP3",
    123: "NTP",
    143: "IMAP",
    161: "SNMP",
    162: "SNMP-Trap",
    443: "HTTPS",
    465: "SMTPS",
    500: "IPsec IKE",
    514: "Syslog",
    587: "SMTP Submission",
    993: "IMAPS",
    995: "POP3S",
    1194: "OpenVPN",
    1701: "L2TP",
    1723: "PPTP",
    1935: "RTMP Streaming",
    3389: "RDP",
    4500: "IPsec NAT-T",
    5060: "SIP VoIP",
    5353: "mDNS",
    8080: "HTTP-Proxy",
    8291: "MikroTik Winbox",
    8728: "MikroTik API",
    8729: "MikroTik API-SSL",
}

def get_protocol_name(proto: int) -> str:
    """Resolve IP protocol number to standard protocol name."""
    return IP_PROTOCOLS.get(proto, f"Proto-{proto}")

def get_service_name(port: int, proto: str = "TCP") -> str:
    """Resolve port number to standard service name if known."""
    if port in WELL_KNOWN_PORTS:
        return WELL_KNOWN_PORTS[port]
    if port >= 49152:
        return "Dynamic / Ephemeral"
    return f"Port-{port}"

def decode_netflow_v5(data: bytes) -> Optional[Dict[str, Any]]:
    """
    Decodes a standard Cisco/MikroTik NetFlow Version 5 UDP datagram.
    Header: 24 bytes
    Records: 48 bytes each
    """
    data_len = len(data)
    if data_len < 24:
        return None

    # Unpack Header: 24 bytes
    # !HHIIIIBBH -> version, count, sys_uptime, unix_secs, unix_nsecs, flow_seq, engine_type, engine_id, sampling_interval
    try:
        version, count, sys_uptime, unix_secs, unix_nsecs, flow_seq, engine_type, engine_id, sampling = struct.unpack(
            "!HHIIIIBBH", data[:24]
        )
    except struct.error:
        return None

    if version != 5:
        return None

    expected_len = 24 + (count * 48)
    if data_len < expected_len:
        # Truncated packet
        count = (data_len - 24) // 48

    records: List[Dict[str, Any]] = []
    offset = 24

    for _ in range(count):
        rec_data = data[offset : offset + 48]
        offset += 48
        if len(rec_data) < 48:
            break

        # Record format:
        # !4s4s4sHHIIIIHHBBBBHHBBH
        # 0: src_addr (4s)
        # 1: dst_addr (4s)
        # 2: next_hop (4s)
        # 3: input_iface (H)
        # 4: output_iface (H)
        # 5: d_pkts (I)
        # 6: d_octets (I)
        # 7: first_switched (I)
        # 8: last_switched (I)
        # 9: src_port (H)
        # 10: dst_port (H)
        # 11: pad1 (B)
        # 12: tcp_flags (B)
        # 13: protocol (B)
        # 14: tos (B)
        # 15: src_as (H)
        # 16: dst_as (H)
        # 17: src_mask (B)
        # 18: dst_mask (B)
        # 19: pad2 (H)
        try:
            fields = struct.unpack("!4s4s4sHHIIIIHHBBBBHHBBH", rec_data)
            src_ip = socket.inet_ntoa(fields[0])
            dst_ip = socket.inet_ntoa(fields[1])
            next_hop = socket.inet_ntoa(fields[2])
            in_iface = fields[3]
            out_iface = fields[4]
            pkts = fields[5]
            octets = fields[6]
            src_port = fields[9]
            dst_port = fields[10]
            tcp_flags = fields[12]
            proto_num = fields[13]
            tos = fields[14]

            records.append({
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "next_hop": next_hop,
                "input_iface": in_iface,
                "output_iface": out_iface,
                "packets": pkts,
                "bytes": octets,
                "src_port": src_port,
                "dst_port": dst_port,
                "protocol": get_protocol_name(proto_num),
                "protocol_num": proto_num,
                "tcp_flags": tcp_flags,
                "tos": tos,
            })
        except Exception:
            continue

    return {
        "version": 5,
        "count": len(records),
        "sys_uptime": sys_uptime,
        "unix_secs": unix_secs,
        "flow_sequence": flow_seq,
        "records": records,
    }

def decode_flow_packet(data: bytes) -> Optional[Dict[str, Any]]:
    """
    Main entry point for incoming flow datagrams.
    Detects version and decodes accordingly.
    """
    if len(data) < 4:
        return None

    version = struct.unpack("!H", data[:2])[0]
    if version == 5:
        return decode_netflow_v5(data)
    elif version == 9:
        # NetFlow v9
        count = struct.unpack("!H", data[2:4])[0]
        return {
            "version": 9,
            "count": count,
            "records": [],
            "note": "NetFlow v9 template packet received",
        }
    elif version == 10:
        # IPFIX
        length = struct.unpack("!H", data[2:4])[0]
        return {
            "version": 10,
            "count": 0,
            "records": [],
            "note": "IPFIX packet received",
        }
    return None
