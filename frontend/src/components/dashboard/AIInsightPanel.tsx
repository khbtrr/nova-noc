import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '@/hooks/useAI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/services/aiApi';
import { remediationApi } from '@/services/remediationApi';
import { toast } from 'sonner';

export default function AIInsightPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { healthScores, analyzeNetwork, isAnalyzing } = useAI();

  const { data: activeAnomalies = [] } = useQuery({
    queryKey: ['active-anomalies'],
    queryFn: () => aiApi.getActiveAnomalies(),
    refetchInterval: 10000,
  });

  const resolveMutation = useMutation({
    mutationFn: (deviceId: number) => aiApi.resolveAnomaly(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
      toast.success('Status anomali berhasil diselesaikan.');
    },
  });

  const score = healthScores?.overall_health_score;
  const recommendations = healthScores?.recommendations || [];
  const latestAnomaly = activeAnomalies[0];

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
          NOVA Sight: Analitik & RCA
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

        {/* NOVA Sight Anomaly Detection Section */}
        <div className="my-3 border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Deteksi Anomali Trafik Real-Time
            </span>
            {latestAnomaly && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-mono font-medium">
                {latestAnomaly.severity}
              </span>
            )}
          </div>

          {latestAnomaly ? (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-xs font-semibold text-red-200">
                    {latestAnomaly.type === 'TRAFFIC_SPIKE' ? 'Lonjakan Trafik Tidak Wajar' : 'Penurunan Trafik Drastis'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {latestAnomaly.current_mbps} Mbps
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                {latestAnomaly.device_name}: Throughput mencapai {latestAnomaly.current_mbps} Mbps (Baseline: {latestAnomaly.baseline_mbps} Mbps).
              </p>
              {latestAnomaly.rca_analysis && (
                <div className="bg-slate-950/80 rounded p-2 text-[11px] text-slate-300 leading-relaxed whitespace-pre-line border border-slate-800">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase block mb-1">
                    Analisis Akar Masalah (Gemini AI RCA):
                  </span>
                  {latestAnomaly.rca_analysis}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-red-500/20">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await remediationApi.execute({
                        device_id: latestAnomaly.device_id,
                        action_type: 'FLUSH_DNS',
                        executed_by: 'Dashboard-Admin'
                      });
                      toast.success(res.message);
                      queryClient.invalidateQueries({ queryKey: ['active-anomalies'] });
                    } catch (e: any) {
                      toast.error('Gagal mengeksekusi Flush DNS');
                    }
                  }}
                  className="h-6 px-2 text-[10px] border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                >
                  Flush DNS
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await remediationApi.execute({
                        device_id: latestAnomaly.device_id,
                        action_type: 'RUN_DIAGNOSTICS',
                        executed_by: 'Dashboard-Admin'
                      });
                      toast.info(res.message);
                    } catch (e: any) {
                      toast.error('Gagal menjalankan uji diagnostik');
                    }
                  }}
                  className="h-6 px-2 text-[10px] border-slate-700 bg-slate-900 text-cyan-300 hover:text-white hover:bg-slate-800"
                >
                  Uji Diagnostik
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate(latestAnomaly.device_id)}
                  disabled={resolveMutation.isPending}
                  className="h-6 px-2 text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Selesaikan
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Pola trafik stabil: Tidak ada anomali lonjakan atau drop yang terdeteksi.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 my-3">
          <h5 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rekomendasi Operasional</h5>
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
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs h-8 font-medium mt-1"
          onClick={() => navigate('/ai')}
        >
          Buka Asisten Diagnostik NOC
        </Button>
      </CardContent>
    </Card>
  );
}
