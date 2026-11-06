import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, DeviceHealth } from '@/services/aiApi';
import { toast } from 'sonner';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'ai';
  role: 'user' | 'assistant';
  text: string;
  content: string;
  time: string;
}

export interface AIAnalysisState {
  overall_health_score: number;
  summary: string;
  recommendations: string[];
  devices: DeviceHealth[];
}

export const useAI = () => {
  const queryClient = useQueryClient();
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-0',
      sender: 'ai',
      role: 'assistant',
      text: 'Halo! Saya NOVA AI Assistant siap membantu menganalisis metrik jaringan, mendeteksi anomali perangkat, dan memberikan panduan troubleshooting.',
      content: 'Halo! Saya NOVA AI Assistant siap membantu menganalisis metrik jaringan, mendeteksi anomali perangkat, dan memberikan panduan troubleshooting.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
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
        summary: data.summary,
        devices: data.devices,
        recommendations: data.recommendations,
      });
      toast.success('Analisis jaringan AI selesai diperbarui.');
    },
    onError: () => {
      toast.error('Gagal menjalankan analisis jaringan.');
    },
  });

  const sendMessage = async (message: string, deviceId?: number) => {
    if (!message.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: 'user',
      text: message,
      content: message,
      time,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await aiApi.chat(message, deviceId);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        role: 'assistant',
        text: res.reply,
        content: res.reply,
        time: replyTime,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengirim pesan ke AI Assistant.');
      const errorAi: ChatMessageItem = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        role: 'assistant',
        text: 'Maaf, gagal menghubungi layanan AI. Pastikan server backend aktif dan kunci API Gemini telah dikonfigurasi dengan benar.',
        content: 'Maaf, gagal menghubungi layanan AI. Pastikan server backend aktif dan kunci API Gemini telah dikonfigurasi dengan benar.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorAi]);
    } finally {
      setIsSending(false);
    }
  };

  const analysis = useMemo<AIAnalysisState | undefined>(() => {
    const raw = healthScoresQuery.data as any;
    if (!raw) return undefined;
    return {
      overall_health_score: raw.overall_health_score ?? 100,
      summary:
        raw.summary ||
        `Evaluasi otomatis terhadap ${raw.devices?.length ?? 0} perangkat jaringan terdaftar.`,
      recommendations: (raw.recommendations || []) as string[],
      devices: (raw.devices || []) as DeviceHealth[],
    };
  }, [healthScoresQuery.data]);

  return {
    healthScores: healthScoresQuery.data,
    analysis,
    isLoadingHealth: healthScoresQuery.isLoading,
    analyzeNetwork: analyzeNetworkMutation.mutate,
    refetchAnalysis: () => analyzeNetworkMutation.mutate(),
    isAnalyzing: analyzeNetworkMutation.isPending || healthScoresQuery.isLoading,
    chatMessages,
    messages: chatMessages,
    sendMessage,
    isSending,
  };
};
