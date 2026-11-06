import React, { useState } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const AlertsPage: React.FC = () => {
  const { activeAlerts, alertHistory, rules, isLoadingAlerts, acknowledgeAlert, createRule, deleteRule } = useAlerts();
  const [tab, setTab] = useState<'active' | 'history' | 'rules'>('active');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const [metricName, setMetricName] = useState('cpu_load');
  const [condition, setCondition] = useState('gt');
  const [warningThreshold, setWarningThreshold] = useState(75);
  const [criticalThreshold, setCriticalThreshold] = useState(90);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    createRule({
      metric_name: metricName,
      condition,
      warning_threshold: Number(warningThreshold),
      critical_threshold: Number(criticalThreshold),
      is_enabled: true,
    });
    setIsRuleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Manajemen Peringatan</h1>
          <p className="text-sm text-slate-400">Respons insiden dan konfigurasi aturan ambang batas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['active', 'history', 'rules'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 min-h-[44px] rounded-md text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                tab === t ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'active'
                ? `Aktif (${activeAlerts.length})`
                : t === 'history'
                  ? 'Riwayat'
                  : `Aturan (${rules.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'active' && (
        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Peringatan Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlerts ? (
              <div className="py-12 text-center text-slate-400 text-sm">Memuat data peringatan...</div>
            ) : (
              <Table>
                <TableHeader className="border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Tingkat</TableHead>
                    <TableHead className="text-slate-400">Perangkat</TableHead>
                    <TableHead className="text-slate-400">Pesan</TableHead>
                    <TableHead className="text-slate-400">Metrik</TableHead>
                    <TableHead className="text-slate-400">Waktu</TableHead>
                    <TableHead className="text-right text-slate-400">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAlerts.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada peringatan aktif. Seluruh sistem berjalan normal.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeAlerts.map((a) => (
                      <TableRow key={a.id} className="border-slate-800/60">
                        <TableCell>
                          <Badge
                            variant={
                              a.severity?.toUpperCase() === 'CRITICAL'
                                ? 'destructive'
                                : a.severity?.toUpperCase() === 'WARNING'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-200">{a.device_name || `Device #${a.device_id}`}</TableCell>
                        <TableCell className="text-slate-300">{a.message}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">
                          {a.metric_name}: {a.metric_value} (batas: {a.threshold_value ?? 'N/A'})
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">{formatDate(a.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {!a.is_acknowledged && !a.acknowledged ? (
                            <Button
                              size="sm"
                              onClick={() => acknowledgeAlert(a.id)}
                              className="min-h-[44px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Konfirmasi
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Dikonfirmasi</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'history' && (
        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Riwayat Peringatan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlerts ? (
              <div className="py-12 text-center text-slate-400 text-sm">Memuat riwayat peringatan...</div>
            ) : (
              <Table>
                <TableHeader className="border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Tingkat</TableHead>
                    <TableHead className="text-slate-400">Perangkat</TableHead>
                    <TableHead className="text-slate-400">Pesan</TableHead>
                    <TableHead className="text-slate-400">Dipicu Pada</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertHistory.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Tidak ada riwayat peringatan yang tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alertHistory.map((a) => (
                      <TableRow key={a.id} className="border-slate-800/60">
                        <TableCell>
                          <Badge variant="secondary">{a.severity}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-200">{a.device_name || `Device #${a.device_id}`}</TableCell>
                        <TableCell className="text-slate-400">{a.message}</TableCell>
                        <TableCell className="text-xs text-slate-400">{formatDate(a.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="success">SELESAI</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'rules' && (
        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-slate-100">Aturan Ambang Batas Peringatan</CardTitle>
            <Button
              size="sm"
              onClick={() => setIsRuleModalOpen(true)}
              className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Buat Aturan
            </Button>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Belum ada aturan ambang batas peringatan. Klik "Buat Aturan" untuk menambahkan aturan baru.
              </div>
            ) : (
              <Table>
                <TableHeader className="border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Metrik</TableHead>
                    <TableHead className="text-slate-400">Kondisi</TableHead>
                    <TableHead className="text-slate-400">Ambang Peringatan</TableHead>
                    <TableHead className="text-slate-400">Ambang Kritis</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id} className="border-slate-800/60">
                      <TableCell className="font-mono text-cyan-400 font-semibold">{r.metric_name}</TableCell>
                      <TableCell className="font-mono text-slate-300 uppercase">{r.condition}</TableCell>
                      <TableCell className="font-mono text-amber-400">{r.warning_threshold}</TableCell>
                      <TableCell className="font-mono text-rose-400">{r.critical_threshold}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_enabled ? 'success' : 'secondary'}>
                          {r.is_enabled ? 'AKTIF' : 'NONAKTIF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(r.id)}
                          aria-label={`Hapus aturan ${r.metric_name}`}
                          className="min-h-[44px] min-w-[44px] text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-cyan-400" /> Buat Aturan Peringatan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Metrik</Label>
                <select
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  className="flex min-h-[44px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="cpu_load">Beban CPU (%)</option>
                  <option value="memory_usage">Penggunaan Memori (%)</option>
                  <option value="rx_rate">Kecepatan RX (Mbps)</option>
                  <option value="tx_rate">Kecepatan TX (Mbps)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Kondisi</Label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="flex min-h-[44px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="gt">Lebih Besar Dari (&gt;)</option>
                  <option value="lt">Lebih Kecil Dari (&lt;)</option>
                  <option value="eq">Sama Dengan (=)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ambang Batas Peringatan (Warning)</Label>
                <Input
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="min-h-[44px] bg-slate-950 border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ambang Batas Kritis (Critical)</Label>
                <Input
                  type="number"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="min-h-[44px] bg-slate-950 border-slate-800"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsRuleModalOpen(false)} className="min-h-[44px]">
                Batal
              </Button>
              <Button type="submit" className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
                Simpan Aturan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AlertsPage;
