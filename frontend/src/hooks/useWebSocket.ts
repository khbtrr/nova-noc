import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '@/stores/alertStore';
import { toast } from 'sonner';

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { addAlert } = useAlertStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Default to port 8000 for backend if running on vite 3000
    const port = window.location.port === '3000' ? '8000' : (window.location.port || '8000');
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Connected
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { event: eventType, data } = message;

            if (eventType === 'metrics_update') {
              // Invalidate specific device metrics query so charts live update
              queryClient.invalidateQueries({ queryKey: ['metrics', data.device_id] });
              queryClient.invalidateQueries({ queryKey: ['metrics-history', data.device_id] });
            } else if (eventType === 'alert_triggered') {
              addAlert(data);
              toast.error(`[ALERT] ${data.device_name}: ${data.message}`);
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
            } else if (eventType === 'device_status') {
              queryClient.invalidateQueries({ queryKey: ['devices'] });
            }
          } catch {
            // Non-JSON message
          }
        };

        ws.onclose = () => {
          // Try reconnecting after 5 seconds
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient, addAlert]);
};
