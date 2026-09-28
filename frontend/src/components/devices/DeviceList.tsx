import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Server, Trash2, Pencil } from 'lucide-react';
import { Device } from '@/types/device';
import { formatUptime, formatDate, cn } from '@/lib/utils';
import { useDevices } from '@/hooks/useDevices';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import EditDeviceModal from './EditDeviceModal';

interface DeviceListProps {
  devices: Device[];
}

export default function DeviceList({ devices }: DeviceListProps) {
  const [search, setSearch] = useState('');
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  const { deleteDevice } = useDevices();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const filteredDevices = (devices || []).filter((d) => {

    const name = d.name?.toLowerCase() || '';
    const host = (d.host || d.ip_address || '').toLowerCase();
    const group = (d.group || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || host.includes(q) || group.includes(q);
  });

  const handleDelete = (e: React.MouseEvent, id: string | number, name: string) => {
    e.stopPropagation();
    if (confirm(`Yakin ingin menghapus perangkat "${name}" dari monitoring?`)) {
      deleteDevice(id);
      toast.success(`Perangkat ${name} berhasil dihapus.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <Input 
          placeholder="Cari perangkat berdasarkan nama, IP, atau grup..." 
          className="pl-9 bg-slate-900 border-slate-800 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/60 border-b border-slate-800">
            <TableRow>
              <TableHead className="w-16 text-center text-xs text-slate-400">Status</TableHead>
              <TableHead className="text-xs text-slate-400">Nama Perangkat</TableHead>
              <TableHead className="text-xs text-slate-400">Host / IP</TableHead>
              <TableHead className="text-xs text-slate-400">Protokol</TableHead>
              <TableHead className="text-xs text-slate-400">Grup / Lokasi</TableHead>
              <TableHead className="text-xs text-slate-400">Interval</TableHead>
              <TableHead className="text-xs text-slate-400 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                  <Server className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-medium">Tidak ada perangkat yang cocok.</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tambahkan perangkat baru menggunakan tombol di atas.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((device) => {
                const host = device.host || device.ip_address || '127.0.0.1';
                const statusStr = String(device.status || 'ONLINE').toUpperCase();
                const isOnline = statusStr === 'ONLINE';
                const isWarning = statusStr === 'WARNING';

                return (
                  <TableRow 
                    key={device.id} 
                    className="cursor-pointer hover:bg-slate-800/40 border-b border-slate-800/80 transition-colors group"
                    onClick={() => navigate(`/devices/${device.id}`)}
                  >
                    <TableCell className="text-center">
                      <div className={cn(
                        "mx-auto h-2.5 w-2.5 rounded-full",
                        isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 
                        isWarning ? 'bg-amber-500' : 'bg-red-500'
                      )} />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {device.name}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Port: {device.port || (device.device_type === 'MIKROTIK' ? 8728 : 161)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {host}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] border-slate-700 bg-slate-950 font-mono text-cyan-400">
                        {device.device_type || device.type || 'MIKROTIK'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      <div>{device.group || 'Default Group'}</div>
                      <div className="text-[10px] text-slate-500">{device.location || '-'}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">
                      {device.poll_interval || 30}s
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/devices/${device.id}`);
                          }}
                          className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-medium"
                        >
                          Detail
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDevice(device);
                                setIsEditModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              title="Edit Perangkat"
                              aria-label={`Edit ${device.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDelete(e, device.id, device.name)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Hapus Perangkat"
                              aria-label={`Hapus ${device.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditDeviceModal
        device={editingDevice}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
}
