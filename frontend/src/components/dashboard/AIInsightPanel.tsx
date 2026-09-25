import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '@/hooks/useAI';

export default function AIInsightPanel() {
  const navigate = useNavigate();
  const { healthScores, analyzeNetwork, isAnalyzing } = useAI();

  const score = healthScores?.overall_health_score;
  const recommendations = healthScores?.recommendations || [];

  const colorClass = score != null 
    ? (score >= 80 ? 'text-emerald-400 stroke-emerald-400' : (score >= 50 ? 'text-amber-400 stroke-amber-400' : 'text-red-400 stroke-red-400'))
    : 'text-slate-400 stroke-slate-600';

  const statusLabel = score != null 
    ? (score >= 80 ? 'Kondisi Jaringan Prima' : (score >= 50 ? 'Perlu Perhatian' : 'Kondisi Kritis'))
    : 'Status Belum Terbaca';

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden relative">
      <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between border-b border-slate-800/80">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
          <Bot className="h-4 w-4 text-cyan-400" />
          Diagnostik Telemetri NOC
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => analyzeNetwork()}
          disabled={isAnalyzing}
          className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Analisis
        </Button>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-4">
        <div className="flex items-center gap-5 my-2">
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="34" className="stroke-slate-800" strokeWidth="6" fill="none" />
              <circle 
                cx="40" cy="40" r="34" 
                className={`${colorClass} transition-all duration-1000`} 
                strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={`${score != null ? (score / 100) * 213 : 0} 213`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-100">{score != null ? score : '-'}</span>
              <span className="text-[9px] text-slate-400 font-medium">Health</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-200">{statusLabel}</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Evaluasi telemetri CPU, memori, dan trafik seluruh perangkat jaringan terdaftar.
            </p>
          </div>
        </div>

        <div className="space-y-2 my-4">
          <h5 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rekomendasi NOC</h5>
          <div className="space-y-1.5">
            {recommendations.length > 0 ? (
              recommendations.slice(0, 2).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                  <span className="line-clamp-2">{rec}</span>
                </div>
              ))
            ) : (
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 text-center">
                Belum ada rekomendasi. Jalankan analisis untuk evaluasi.
              </div>
            )}
          </div>
        </div>
        
        <Button 
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs h-8 font-medium"
          onClick={() => navigate('/ai')}
        >
          Buka Asisten Diagnostik NOC
        </Button>
      </CardContent>
    </Card>
  );
}
