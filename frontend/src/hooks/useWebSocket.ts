import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '@/stores/alertStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

function resolveWebSocketBaseUrl(): string {
  const configuredApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (configuredApiUrl && (configuredApiUrl.startsWith('http://') || configuredApiUrl.startsWith('https://'))) {
    try {
      const parsed = new URL(configuredApiUrl);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${parsed.host}`;
    } catch {
      // Fallback to window.location
    }
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { addAlert, resolveAlert } = useAlertStore();
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    const wsBase = resolveWebSocketBaseUrl();
    const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { event: eventType, data } = message;

            if (eventType === 'metrics_update') {
              queryClient.invalidateQueries({ queryKey: ['metrics', data.device_id] });
              queryClient.invalidateQueries({ queryKey: ['metrics', String(data.device_id)] });
              queryClient.invalidateQueries({ queryKey: ['metrics-history', data.device_id] });
            } else if (eventType === 'alert_triggered') {
              addAlert(data);
              toast.error(`[ALERT] ${data.device_name}: ${data.message}`);
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
            } else if (eventType === 'alert_resolved') {
              if (data.alert_id) {
                resolveAlert(data.alert_id);
              }
              toast.success(`[TERATASI] ${data.device_name}: ${data.message}`);
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
              queryClient.invalidateQueries({ queryKey: ['alertHistory'] });
            } else if (eventType === 'device_status') {
              queryClient.invalidateQueries({ queryKey: ['devices'] });
            } else if (eventType === 'traffic_anomaly') {
              toast.warning(`[ANOMALI] ${data.device_name}: ${data.type}`);
              queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
            } else if (eventType === 'traffic_anomaly_resolved') {
              queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
            } else if (eventType === 'syslog_event') {
              queryClient.invalidateQueries({ queryKey: ['syslog'] });
              queryClient.invalidateQueries({ queryKey: ['syslog-stats'] });
              if (data.device_id) {
                queryClient.invalidateQueries({ queryKey: ['device-syslog', String(data.device_id)] });
              }
              if (data.severity === 'EMERGENCY' || data.severity === 'CRITICAL') {
                toast.error(`[SYSLOG ${data.severity}] ${data.device_name}: ${data.message}`);
              }
            }
          } catch {
            // Ignore non-JSON frame
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(connect, 5000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!isCleanedUp) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
    };
  }, [token, isAuthenticated, queryClient, addAlert, resolveAlert]);

  return { isConnected };
};
