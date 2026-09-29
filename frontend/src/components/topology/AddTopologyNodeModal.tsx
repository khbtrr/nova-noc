import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, X, Server, Network, Wifi, Globe, Database } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { TopologyNode } from '@/services/topologyApi';

interface AddTopologyNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (newNode: TopologyNode) => void;
  existingNodeIds: Set<string>;
}

export const AddTopologyNodeModal: React.FC<AddTopologyNodeModalProps> = ({
  isOpen,
  onClose,
  onAddNode,
  existingNodeIds,
}) => {
  const [tab, setTab] = useState<'registered' | 'custom'>('registered');
  const { data: devices, isLoading: isDevicesLoading } = useDevices();

  // Custom Form state
  const [customName, setCustomName] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [customTier, setCustomTier] = useState<'switch' | 'core' | 'wan' | 'ap' | 'device'>('switch');
  const [customBoard, setCustomBoard] = useState('');
  const [customIface, setCustomIface] = useState('');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectRegistered = (dev: any) => {
    const nodeTier = dev.device_type === 'MIKROTIK' ? 'core' : 'switch';
    const safeId = `node-dev-${dev.id}`;
    
    const newNode: TopologyNode = {
      id: safeId,
      type: 'customTopology',
      position: { x: 500, y: 350 },
      data: {
        id: dev.id,
        label: dev.name,
        host: dev.host,
        mac: '',
        tier: nodeTier,
        device_type: nodeTier,
        vendor: dev.device_type === 'MIKROTIK' ? 'MikroTik' : 'Switch',
        board: dev.name.split('-')[-1]?.trim() || 'Network Device',
        status: dev.status,
        is_monitored: true,
        interface: dev.location || 'sfplus2-SW',
        is_custom: true,
      },
    };

    onAddNode(newNode);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const customId = `custom-node-${Date.now()}`;
    const newNode: TopologyNode = {
      id: customId,
      type: 'customTopology',
      position: { x: 500, y: 400 },
      data: {
        id: customId,
        label: customName.trim(),
        host: customHost.trim() || 'N/A',
        mac: '',
        tier: customTier,
        device_type: customTier,
        vendor: 'Custom Device',
        board: customBoard.trim() || 'Perangkat Tambahan',
        status: 'ONLINE',
        is_monitored: false,
        interface: customIface.trim() || 'Koneksi Manual',
        is_custom: true,
      },
    };

    onAddNode(newNode);
    setCustomName('');
    setCustomHost('');
    setCustomBoard('');
    setCustomIface('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Tambah Perangkat ke Kanvas</h3>
              <p className="text-[11px] text-slate-400">
                Pilih dari database monitoring atau tambahkan node kustom baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab('registered')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
              tab === 'registered'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Perangkat Terdaftar (DB)
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
              tab === 'custom'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Node Kustom Manual
          </button>
        </div>

        {/* Tab 1: Registered Devices from DB */}
        {tab === 'registered' && (
          <div className="p-5 space-y-3">
            <div className="text-[11px] text-slate-400">
              Pilih perangkat yang sudah terdaftar di sistem NOVA untuk diletakkan di kanvas:
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isDevicesLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">Memuat daftar perangkat...</div>
              ) : devices && devices.length > 0 ? (
                devices.map((dev: any) => {
                  const isAlreadyOnCanvas = Array.from(existingNodeIds).some(
                    (nid) => nid.includes(String(dev.id)) || nid.includes(dev.host)
                  );
                  return (
                    <div
                      key={dev.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-400">
                          {dev.device_type === 'MIKROTIK' ? (
                            <Server className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Network className="h-4 w-4 text-sky-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{dev.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {dev.host} | {dev.device_type}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleSelectRegistered(dev)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 px-3 font-medium"
                      >
                        {isAlreadyOnCanvas ? 'Tambah Lagi' : 'Pasang di Kanvas'}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">Tidak ada perangkat di database.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Manual Device */}
        {tab === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama Perangkat / Label *
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Contoh: Server SIMAK, Switch Lab Komputer, AP Ruang 101..."
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Alamat IP / Host
                </label>
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="Contoh: 172.16.254.50"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tier / Jenis Perangkat
                </label>
                <select
                  value={customTier}
                  onChange={(e) => setCustomTier(e.target.value as any)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="switch">Switch (Distribusi / Access)</option>
                  <option value="core">Core Router / Gateway</option>
                  <option value="ap">Access Point (Wireless)</option>
                  <option value="wan">Gateway ISP / Uplink</option>
                  <option value="device">Server / End Device</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Model / Hardware (Opsional)
                </label>
                <input
                  type="text"
                  value={customBoard}
                  onChange={(e) => setCustomBoard(e.target.value)}
                  placeholder="Contoh: Cisco SG220, Ubuntu 22.04"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Interface / Catatan Lokasi
                </label>
                <input
                  type="text"
                  value={customIface}
                  onChange={(e) => setCustomIface(e.target.value)}
                  placeholder="Contoh: Gedung 1 Lt 2, Port 12"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
              >
                Tambahkan ke Kanvas
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
