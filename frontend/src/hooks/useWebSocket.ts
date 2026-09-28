import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '@/stores/alertStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { addAlert } = useAlertStore();
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Default to port 8000 for backend if running on vite 3000
    const port = window.location.port === '3000' ? '8000' : (window.location.port || '8000');
    const wsUrl = `${protocol}//${host}:${port}/ws?token=${encodeURIComponent(token)}`;

    let reconnectTimer: NodeJS.Timeout;
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
              // Invalidate specific device metrics query so charts live update
              queryClient.invalidateQueries({ queryKey: ['metrics', data.device_id] });
              queryClient.invalidateQueries({ queryKey: ['metrics', String(data.device_id)] });
              queryClient.invalidateQueries({ queryKey: ['metrics-history', data.device_id] });
            } else if (eventType === 'alert_triggered') {
              addAlert(data);
              toast.error(`[ALERT] ${data.device_name}: ${data.message}`);
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
            } else if (eventType === 'device_status') {
              queryClient.invalidateQueries({ queryKey: ['devices'] });
            } else if (eventType === 'traffic_anomaly') {
              toast.warning(`[ANOMALI] ${data.device_name}: ${data.type}`);
              queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
            } else if (eventType === 'traffic_anomaly_resolved') {
              queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
            }
          } catch {
            // Non-JSON message
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
  }, [token, isAuthenticated, queryClient, addAlert]);

  return { isConnected };
};

