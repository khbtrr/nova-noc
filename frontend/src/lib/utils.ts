import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatUptime(seconds: number) {
  if (!seconds) return '0s'
  const d = Math.floor(seconds / (3600*24))
  const h = Math.floor(seconds % (3600*24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  
  const dDisplay = d > 0 ? d + (d == 1 ? "d " : "d ") : ""
  const hDisplay = h > 0 ? h + (h == 1 ? "h " : "h ") : ""
  const mDisplay = m > 0 ? m + (m == 1 ? "m" : "m") : ""
  
  return dDisplay + hDisplay + mDisplay || "0m"
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatLocalTime(timestamp: string, includeSeconds = true): string {
  if (!timestamp) return '';

  // 1. If it's an ISO 8601 string or full date string (contains 'T' or '-')
  if (timestamp.includes('T') || timestamp.includes('-')) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
        hour12: false,
      });
    }
  }

  // 2. If it's "HH:MM:SS" or "HH:MM" (treated as UTC from backend)
  const parts = timestamp.split(':');
  if (parts.length >= 2) {
    const now = new Date();
    const utcDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      parseInt(parts[0], 10),
      parseInt(parts[1], 10),
      parts[2] ? parseInt(parts[2], 10) : 0
    ));
    if (!isNaN(utcDate.getTime())) {
      return utcDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
        hour12: false,
      });
    }
  }

  return timestamp;
}

export function formatBandwidthMbps(kbps: number, decimals = 2): string {
  if (!kbps || kbps <= 0) return '0 Mbps';
  const mbps = kbps / 1000;
  return `${mbps.toFixed(decimals)} Mbps`;
}
