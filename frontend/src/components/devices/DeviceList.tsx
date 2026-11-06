import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Eye, Router, Server, Pencil, BellOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Device } from '@/types/device';
import { formatDate } from '@/lib/utils';

export interface DeviceListProps {
  devices: Device[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (device: Device) => void;
  onSnooze?: (device: Device) => void;
  isAdmin?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  isLoading,
  isError,
  onRetry,
  onDelete,
  onEdit,
  onSnooze,
  isAdmin = true,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900 p-8 text-center text-sm text-slate-400 font-mono">
        Memuat daftar inventaris perangkat jaringan...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-slate-900 p-8 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
        <p className="text-sm text-slate-200 font-semibold">Gagal Memuat Daftar Perangkat</p>
        <p className="text-xs text-slate-400">Terjadi kendala saat menghubungi API inventaris perangkat.</p>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-950/60">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Perangkat</TableHead>
            <TableHead className="text-slate-400">Host / IP</TableHead>
            <TableHead className="text-slate-400">Protokol</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Terakhir Terlihat</TableHead>
            <TableHead className="text-right text-slate-400">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length === 0 ? (
            <TableRow className="border-slate-800">
              <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                Belum ada perangkat yang dikonfigurasi. Klik "Tambah Perangkat" untuk memulai pemantauan.
              </TableCell>
            </TableRow>
          ) : (
            devices.map((device) => {
              const status = device.status?.toUpperCase();
              const isOnline = status === 'ONLINE';
              const devType = (device.device_type || device.type || 'SNMP').toUpperCase();

              return (
                <TableRow key={device.id} className="border-slate-800/60 hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                        {devType === 'MIKROTIK' ? <Router className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                      </div>
                      <div>
                        <span className="block font-semibold">{device.name}</span>
                        <span className="text-[11px] text-slate-400">{device.location || 'Jaringan Utama'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-300">
                    {device.host || device.ip_address}:{device.port || (devType === 'MIKROTIK' ? 8728 : 161)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {devType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={isOnline ? 'success' : status === 'WARNING' ? 'warning' : 'destructive'}>
                        {device.status}
                      </Badge>
                      {device.is_snoozed && (
                        <Badge
                          className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] px-1.5 py-0"
                          title={device.snooze_reason || 'Maintenance Mode'}
                        >
                          <BellOff className="h-3 w-3 mr-1" /> SNOOZED
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">{formatDate(device.last_seen)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/devices/${device.id}`)}
                      aria-label={`Lihat detail ${device.name}`}
                      className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && onSnooze && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSnooze(device)}
                        aria-label={`Atur snooze ${device.name}`}
                        className={`min-h-[40px] min-w-[40px] ${
                          device.is_snoozed
                            ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        <BellOff className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(device)}
                        aria-label={`Edit ${device.name}`}
                        className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(String(device.id))}
                        aria-label={`Hapus ${device.name}`}
                        className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeviceList;
