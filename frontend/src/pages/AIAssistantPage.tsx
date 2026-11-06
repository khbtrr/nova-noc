import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '@/hooks/useAI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Sparkles, User, RefreshCw, ShieldCheck } from 'lucide-react';

export const AIAssistantPage: React.FC = () => {
  const { analysis, isAnalyzing, refetchAnalysis, messages, sendMessage, isSending } = useAI();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput('');
  };

  const quickPrompts = [
    'Mengapa beban CPU Core Router tinggi?',
    'Bagaimana cara mengatasi fluktuasi trafik di MikroTik?',
    'Analisis keamanan port yang terbuka',
    'Rekomendasi optimasi jaringan kantor',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
          <Bot className="h-7 w-7 text-cyan-400" /> Asisten AI NOVA
        </h1>
        <p className="text-sm text-slate-400">Mesin diagnostik dan kopilot rekayasa jaringan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800/80 lg:col-span-1 flex flex-col">
          <CardHeader className="border-b border-slate-800/60 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Audit Kesehatan Jaringan
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchAnalysis()}
              disabled={isAnalyzing}
              aria-label="Muat ulang audit kesehatan"
              className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-cyan-400"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-5 flex-1">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Skor Kesehatan Keseluruhan</span>
              <span className="text-4xl font-bold font-mono text-emerald-400">
                {analysis?.overall_health_score !== null && analysis?.overall_health_score !== undefined
                  ? `${analysis.overall_health_score}%`
                  : 'N/A'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ringkasan Eksekutif</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                {analysis?.summary}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Rekomendasi AI
              </h4>
              <ul className="space-y-2">
                {analysis?.recommendations?.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-300 bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80 lg:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="border-b border-slate-800/60 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-200">Konsultasi Interaktif NOC</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-slate-950 font-medium'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex gap-3 items-center text-xs text-cyan-400 font-mono animate-pulse">
                <Bot className="h-4 w-4" /> NOVA sedang menganalisis telemetri jaringan...
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="p-4 border-t border-slate-800/60 space-y-3 bg-slate-950/40">
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(p)}
                  className="text-[11px] px-3 py-1.5 min-h-[36px] rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan pada NOVA tentang lonjakan trafik, aturan RouterOS, atau anomali SNMP..."
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500"
              />
              <Button
                type="submit"
                disabled={isSending || !input.trim()}
                aria-label="Kirim pesan"
                className="min-h-[44px] min-w-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};
