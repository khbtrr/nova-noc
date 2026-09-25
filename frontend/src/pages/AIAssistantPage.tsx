import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAI } from '@/hooks/useAI';
import { useDevices } from '@/hooks/useDevices';
import { Send, Bot, User, Activity, AlertCircle, RefreshCw, CheckCircle2, Terminal } from 'lucide-react';

export default function AIAssistantPage() {
  const [inputMessage, setInputMessage] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | undefined>(undefined);
  const { chatMessages, sendMessage, isSending, healthScores, analyzeNetwork, isAnalyzing } = useAI();
  const { devices } = useDevices();

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;
    sendMessage(inputMessage, selectedDeviceId);
    setInputMessage('');
  };

  const quickPrompts = [
    "Analisis kondisi kesehatan seluruh perangkat jaringan",
    "Bagaimana cara mengatasi utilisasi CPU router MikroTik tinggi?",
    "Langkah troubleshooting saat interface WAN down",
    "Rekomendasi optimasi firewall & bandwidth management",
  ];

  const overallScore = healthScores?.overall_health_score;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Bot className="h-6 w-6 text-cyan-400" />
            NOVA NOC Diagnostic Assistant
          </h2>
          <p className="text-sm text-slate-400">
            Asisten analitis telemetri jaringan untuk evaluasi beban router, indikasi anomali, dan panduan troubleshooting.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-slate-300">Health Score:</span>
            <span className="text-sm font-bold text-emerald-400">
              {overallScore != null ? `${overallScore}%` : '-'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeNetwork()}
            disabled={isAnalyzing}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analisis Ulang
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Device Context & Quick Prompts */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-200">Konteks Perangkat</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Pilih target perangkat untuk analisis terarah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedDeviceId ?? ''}
                onChange={(e) => setSelectedDeviceId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Semua Perangkat (Global)</option>
                {devices?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.host || d.ip_address})
                  </option>
                ))}
              </select>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-400 block mb-2">Prompt Cepat:</span>
                <div className="flex flex-col gap-1.5">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(prompt, selectedDeviceId)}
                      className="text-left text-xs p-2 rounded-lg bg-slate-950 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 border border-slate-800/80 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Interface */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl lg:col-span-3 flex flex-col h-[640px]">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                Percakapan NOC Operator & AI
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Model: Google Gemini 2.5 Flash &bull; Mode: Real-Time Diagnostic
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4">
                {chatMessages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-cyan-600 text-white rounded-br-none'
                            : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        <div
                          className={`text-[10px] mt-1.5 font-mono ${
                            isUser ? 'text-cyan-100' : 'text-slate-500'
                          }`}
                        >
                          {msg.time}
                        </div>
                      </div>
                      {isUser && (
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex gap-3 items-center text-slate-400 text-xs">
                    <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 animate-pulse">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-bounce"></span>
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                      <span className="ml-1 text-slate-400">NOVA AI sedang menganalisis metrik...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t border-slate-800 bg-slate-950/40">
            <form onSubmit={handleSend} className="flex gap-2 w-full">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Tanyakan kondisi jaringan, troubleshooting error, atau analisis traffic..."
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm h-10"
                disabled={isSending}
              />
              <Button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 h-10 px-4"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Kirim
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
