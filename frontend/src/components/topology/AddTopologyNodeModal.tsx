import React, { useState } from 'react';
import { X, PlusCircle, Server, Router, Wifi, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddTopologyNodeModalProps {
  open: boolean;
  onClose: () => void;
  existingNodes: any[];
  onAddNode: (newNodeData: {
    label: string;
    host: string;
    tier: string;
    vendor: string;
    board: string;
    interfaceName: string;
    parentNodeId: string;
  }) => void;
}

export const AddTopologyNodeModal: React.FC<AddTopologyNodeModalProps> = ({
  open,
  onClose,
  existingNodes,
  onAddNode,
}) => {
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('');
  const [tier, setTier] = useState<'wan' | 'core' | 'switch' | 'ap'>('switch');
  const [vendor, setVendor] = useState('MikroTik');
  const [board, setBoard] = useState('CRS326-24G-2S+');
  const [interfaceName, setInterfaceName] = useState('sfp-sfpplus1');
  const [parentNodeId, setParentNodeId] = useState<string>(
    existingNodes.find((n) => n.id.includes('MAIN_SWITCH') || n.data?.tier === 'core')?.id || ''
  );

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAddNode({
      label: label.trim(),
      host: host.trim() || 'N/A',
      tier,
      vendor: vendor.trim() || 'Network Device',
      board: board.trim() || 'Generic',
      interfaceName: interfaceName.trim() || 'eth1',
      parentNodeId,
    });
    setLabel('');
    setHost('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Tambah Perangkat ke Topologi</h3>
              <p className="text-xs text-slate-400">Buat node kustom dan hubungkan ke hierarki jaringan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Pilih Layer / Tipe Perangkat</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'wan', label: 'WAN / ISP', icon: Globe, activeClass: 'border-cyan-500 bg-cyan-500/15 text-cyan-400' },
                { id: 'core', label: 'Core Router', icon: Router, activeClass: 'border-cyan-500 bg-cyan-500/15 text-cyan-400' },
                { id: 'switch', label: 'Switch', icon: Server, activeClass: 'border-sky-500 bg-sky-500/15 text-sky-400' },
                { id: 'ap', label: 'Access Point', icon: Wifi, activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-400' },
              ].map((item) => {
                const Icon = item.icon;
                const active = tier === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTier(item.id as any)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      active
                        ? item.activeClass
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nama Perangkat *</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Contoh: SW-GD5-LT1"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Alamat IP (Host)</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Contoh: 172.16.19.25"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Vendor</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="MikroTik / Cisco / Ubiquiti"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Model / Board</label>
              <input
                type="text"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                placeholder="CRS326 / U6-LR / SG220"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Hubungkan Dari (Parent Uplink)</label>
              <select
                value={parentNodeId}
                onChange={(e) => setParentNodeId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="">-- Tanpa Koneksi Awal --</option>
                {existingNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    [{n.data?.tier?.toUpperCase()}] {n.data?.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Label Port / Interface</label>
              <input
                type="text"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                placeholder="Contoh: sfp-sfpplus12 (10G)"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              Tambahkan ke Peta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
