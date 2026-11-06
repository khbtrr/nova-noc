import React from 'react';
import { Bot, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/useAI';
import { useNavigate } from 'react-router-dom';

export const AIInsightPanel: React.FC = () => {
  const { analysis, isAnalyzing, refetchAnalysis } = useAI();
  const navigate = useNavigate();

  const score = analysis?.overall_health_score;
  const hasScore = score !== null && score !== undefined;
  const scoreColor = !hasScore
    ? 'text-slate-400 border-slate-700 bg-slate-800/40'
    : score >= 85
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : score >= 65
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  return (
    <Card className="bg-slate-900 border-slate-800/80 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bot className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-100">Diagnostik AI Gemini</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetchAnalysis()}
          disabled={isAnalyzing}
          aria-label="Muat ulang diagnostik AI"
          className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-cyan-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border font-mono ${scoreColor}`}>
            <span className="text-xl font-bold">{hasScore ? score : '--'}</span>
            <span className="text-[9px] uppercase tracking-wider">{hasScore ? 'Kesehatan' : 'No Data'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
              {analysis?.summary || 'Menganalisis telemetri jaringan...'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-cyan-400" /> Rekomendasi Utama
          </p>
          <ul className="space-y-1.5">
            {(analysis?.recommendations || []).slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 px-3 py-2 rounded-md border border-slate-800/50">
                <span className="text-cyan-400 font-mono font-bold">{i + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/ai')}
          className="w-full min-h-[44px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs"
        >
          Buka Konsol AI Penuh <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
