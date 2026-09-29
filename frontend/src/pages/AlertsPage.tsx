import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, ShieldAlert, Plus, Trash2, Sliders, Bell, Pencil } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function AlertsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'rules'>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isEditRuleOpen, setIsEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);


  // Form state for creating rule
  const [newRule, setNewRule] = useState({
    metric_name: 'cpu_load',
    condition: 'gt',
    warning_threshold: 75,
    critical_threshold: 90,
  });

  const {
    activeAlerts,
    alertHistory,
    rules,
    acknowledgeAlert,
    createRule,
    updateRule,
    deleteRule,
  } = useAlerts();

  const getMetricUnit = (metricName: string) => {
    if (metricName.includes('latency')) return ' ms';
    if (metricName.includes('kbps')) return ' Kbps';
    if (metricName.includes('loss') || metricName.includes('usage') || metricName.includes('load')) return '%';
    return '';
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRule({
      metric_name: newRule.metric_name,
      condition: newRule.condition,
      warning_threshold: Number(newRule.warning_threshold),
      critical_threshold: Number(newRule.critical_threshold),
      is_enabled: true,
    });
    setIsAddRuleOpen(false);
  };

  const handleOpenEdit = (rule: any) => {
    setEditingRule({
      id: rule.id,
      metric_name: rule.metric_name,
      condition: rule.condition,
      warning_threshold: rule.warning_threshold,
      critical_threshold: rule.critical_threshold,
      is_enabled: rule.is_enabled ?? true,
    });
    setIsEditRuleOpen(true);
  };

  const handleUpdateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    updateRule({
      id: editingRule.id,
      rule: {
        condition: editingRule.condition,
        warning_threshold: Number(editingRule.warning_threshold),
        critical_threshold: Number(editingRule.critical_threshold),
        is_enabled: editingRule.is_enabled,
      },
    });
    setIsEditRuleOpen(false);
  };

  const rawAlerts = activeTab === 'active' 
    ? (activeAlerts || []).filter((a: any) => !a.is_resolved) 
    : (alertHistory || []);

  const filteredAlerts = rawAlerts.filter((a: any) => {
    if (severityFilter === 'ALL') return true;
    return a.severity?.toUpperCase() === severityFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            Manajemen Alert & Insiden
          </h2>
          <p className="text-sm text-slate-400">
            Daftar peringatan real-time, evaluasi threshold telemetri, dan notifikasi Telegram otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsAddRuleOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Aturan Alert Baru
            </Button>
          )}
        </div>
      </div>


      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'active' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="h-4 w-4" />
          Alert Aktif ({activeAlerts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Riwayat Insiden ({alertHistory.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'rules' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          Aturan Threshold ({rules.length})
        </button>
      </div>

      {activeTab !== 'rules' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter Severity:</span>
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  severityFilter === sev
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Alerts List */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardContent className="p-0">
              {filteredAlerts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">Tidak ada alert dalam kategori ini.</p>
                  <p className="text-xs text-slate-500 mt-1">Seluruh perangkat beroperasi dalam batas parameter normal.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {filteredAlerts.map((alert: any) => {
                    const isAck = Boolean(alert.is_acknowledged || alert.acknowledged);
                    const sev = String(alert.severity || 'INFO').toUpperCase();

                    return (
                      <div key={alert.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/20">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {sev === 'CRITICAL' && <AlertTriangle className="h-5 w-5 text-red-400" />}
                            {sev === 'WARNING' && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                            {sev === 'INFO' && <Bell className="h-5 w-5 text-cyan-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-100">
                                {alert.device_name || `Perangkat #${alert.device_id}`}
                              </span>
                              <Badge
                                variant={
                                  sev === 'CRITICAL' ? 'destructive' : sev === 'WARNING' ? 'warning' : 'default'
                                }
                                className="text-[10px] uppercase font-mono"
                              >
                                {sev}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{alert.message}</p>
                            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                              {alert.created_at || alert.timestamp}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {alert.is_resolved ? (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Resolved
                            </span>
                          ) : isAck ? (
                            <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="text-xs border-slate-700 text-cyan-400 hover:bg-cyan-500/10"
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.resolved_at && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Pulih: {new Date(alert.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Rules Tab */
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Aturan Ambang Batas (Threshold Rules)</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Kondisi metrik yang memicu status peringatan (WARNING) dan kritis (CRITICAL).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {rules.map((rule: any) => (
                <div key={rule.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-cyan-300">{rule.metric_name}</span>
                      <span className="text-xs text-slate-400">
                        kondisi: <strong className="text-slate-200">{rule.condition}</strong>
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-4">
                      <span>
                        Warning: <strong className="text-amber-400">&ge; {rule.warning_threshold}{getMetricUnit(rule.metric_name)}</strong>
                      </span>
                      <span>
                        Critical: <strong className="text-red-400">&ge; {rule.critical_threshold}{getMetricUnit(rule.metric_name)}</strong>
                      </span>
                      <span>Target: {rule.device_id ? `Perangkat #${rule.device_id}` : 'Global (Semua)'}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(rule)}
                        className="text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 h-8 px-2"
                        title="Edit Threshold"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 px-2"
                        title="Hapus Aturan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Rule Dialog */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Tambah Aturan Threshold Baru</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Tentukan metrik, kondisi, dan batas ambang batas alert.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-slate-300 font-medium">Nama Metrik</label>
              <select
                value={newRule.metric_name}
                onChange={(e) => setNewRule({ ...newRule, metric_name: e.target.value })}
                className="w-full mt-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              >
                <option value="cpu_load">CPU Load (cpu_load) - %</option>
                <option value="memory_usage">RAM Usage (memory_usage) - %</option>
                <option value="rx_kbps">Trafik Download / RX (rx_kbps) - Kbps</option>
                <option value="tx_kbps">Trafik Upload / TX (tx_kbps) - Kbps</option>
                <option value="latency_ms">Latensi ICMP Server-to-Device (latency_ms) - ms</option>
                <option value="packet_loss">Packet Loss Server-to-Device (packet_loss) - %</option>
                <option value="wan_latency_ms">Latensi Internet Gateway (wan_latency_ms) - ms</option>
                <option value="wan_packet_loss">Packet Loss Internet Gateway (wan_packet_loss) - %</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium">Kondisi</label>
              <select
                value={newRule.condition}
                onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                className="w-full mt-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              >
                <option value="gt">Lebih besar dari (&gt;)</option>
                <option value="lt">Lebih kecil dari (&lt;)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium">Warning Threshold</label>
                <Input
                  type="number"
                  value={newRule.warning_threshold}
                  onChange={(e) => setNewRule({ ...newRule, warning_threshold: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium">Critical Threshold</label>
                <Input
                  type="number"
                  value={newRule.critical_threshold}
                  onChange={(e) => setNewRule({ ...newRule, critical_threshold: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-800 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddRuleOpen(false)}
                className="border-slate-800 text-slate-400"
              >
                Batal
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                Simpan Aturan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={isEditRuleOpen} onOpenChange={setIsEditRuleOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit Aturan Threshold</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Perbarui batas ambang batas (Warning & Critical) untuk metrik <span className="font-mono text-cyan-300">{editingRule?.metric_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {editingRule && (
            <form onSubmit={handleUpdateRule} className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-slate-300 font-medium">Kondisi</label>
                <select
                  value={editingRule.condition}
                  onChange={(e) => setEditingRule({ ...editingRule, condition: e.target.value })}
                  className="w-full mt-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                >
                  <option value="gt">Lebih besar dari (&gt;)</option>
                  <option value="lt">Lebih kecil dari (&lt;)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium">Warning Threshold</label>
                  <Input
                    type="number"
                    value={editingRule.warning_threshold}
                    onChange={(e) => setEditingRule({ ...editingRule, warning_threshold: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium">Critical Threshold</label>
                  <Input
                    type="number"
                    value={editingRule.critical_threshold}
                    onChange={(e) => setEditingRule({ ...editingRule, critical_threshold: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-xs mt-1"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditRuleOpen(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Perbarui Aturan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
