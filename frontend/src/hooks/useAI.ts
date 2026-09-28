import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, NetworkAnalysisResponse } from '@/services/aiApi';
import { toast } from 'sonner';

export const useAI = () => {
  const queryClient = useQueryClient();
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Halo! Saya NOVA AI Assistant siap membantu menganalisis metrik jaringan, mendeteksi anomali perangkat, dan memberikan panduan troubleshooting.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isSending, setIsSending] = useState(false);

  const healthScoresQuery = useQuery({
    queryKey: ['ai-health-scores'],
    queryFn: aiApi.getHealthScores,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const analyzeNetworkMutation = useMutation({
    mutationFn: aiApi.analyzeNetwork,
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-health-scores'], {
        overall_health_score: data.overall_health_score,
        devices: data.devices,
        recommendations: data.recommendations
      });
      toast.success('Analisis jaringan AI selesai diperbarui!');
    },
    onError: () => {
      toast.error('Gagal menjalankan analisis jaringan.');
    }
  });

  const sendMessage = async (message: string, deviceId?: number) => {
    if (!message.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: message, time };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await aiApi.chat(message, deviceId);
      const aiMsg = {
        sender: 'ai' as const,
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengirim pesan ke AI Assistant.');
      const errorAi = {
        sender: 'ai' as const,
        text: `⚠️ Maaf, gagal menghubungi layanan AI. Pastikan server backend aktif dan kunci API Gemini telah dikonfigurasi dengan benar.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorAi]);
    } finally {
      setIsSending(false);
    }

  };

  return {
    healthScores: healthScoresQuery.data,
    isLoadingHealth: healthScoresQuery.isLoading,
    analyzeNetwork: analyzeNetworkMutation.mutate,
    isAnalyzing: analyzeNetworkMutation.isPending,
    chatMessages,
    sendMessage,
    isSending
  };
};
