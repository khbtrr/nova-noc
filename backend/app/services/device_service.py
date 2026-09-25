import asyncio
import socket
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.device import Device, DeviceType, DeviceStatus
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceTestResult
from app.core.exceptions import NotFoundException
from app.collectors.scheduler import update_device_job, remove_device_job

async def get_device(db: AsyncSession, device_id: int) -> Device:
    result = await db.execute(select(Device).filter(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise NotFoundException("Device not found")
    return device

async def get_devices(db: AsyncSession):
    result = await db.execute(select(Device).order_by(Device.id))
    return result.scalars().all()

async def create_device(db: AsyncSession, device_in: DeviceCreate) -> Device:
    device_data = device_in.model_dump(exclude_unset=True)
    device = Device(**device_data)
    device.status = DeviceStatus.ONLINE  # Start as online/pending poll
    db.add(device)
    await db.commit()
    await db.refresh(device)
    
    # Register in scheduler
    if device.is_enabled:
        await update_device_job(device.id, device.poll_interval or 30)
    
    return device

async def update_device(db: AsyncSession, device_id: int, device_in: DeviceUpdate) -> Device:
    device = await get_device(db, device_id)
    update_data = device_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(device, k, v)
    device.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(device)
    
    # Update scheduler job
    if device.is_enabled:
        await update_device_job(device.id, device.poll_interval or 30)
    else:
        remove_device_job(device.id)
        
    return device

async def delete_device(db: AsyncSession, device_id: int):
    device = await get_device(db, device_id)
    remove_device_job(device_id)
    
    # Clean up associated alerts and device-specific rules before deleting
    from app.models.alert import Alert
    from app.models.alert_rule import AlertRule
    from sqlalchemy import delete
    await db.execute(delete(Alert).filter(Alert.device_id == device_id))
    await db.execute(delete(AlertRule).filter(AlertRule.device_id == device_id))
    
    await db.delete(device)
    await db.commit()

async def test_device_connection(device: Device) -> DeviceTestResult:
    """Test TCP / network connectivity to the target device host & port."""
    host = device.host
    port = device.port or (8728 if device.device_type == DeviceType.MIKROTIK else 161)
    
    if device.device_type == DeviceType.SNMP:
        try:
            from pysnmp.hlapi.asyncio import (
                get_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
                ContextData, ObjectType, ObjectIdentity
            )
            community_str = device.snmp_community or 'public'
            mp_model = 0 if (device.snmp_version and '1' in device.snmp_version) else 1
            community = CommunityData(community_str, mpModel=mp_model)
            target = await UdpTransportTarget.create((host, port), timeout=3.0, retries=1)
            err_ind, err_stat, err_idx, var_binds = await get_cmd(
                SnmpEngine(), community, target, ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0'))
            )
            if err_ind or err_stat:
                return DeviceTestResult(
                    success=False,
                    message=f"SNMP tidak merespon: {err_ind or err_stat}. Periksa Community '{community_str}' dan Port {port}.",
                    details={"host": host, "port": port, "device_type": device.device_type.value}
                )
            descr = var_binds[0][1].prettyPrint() if var_binds else "SNMP Respon OK"
            return DeviceTestResult(
                success=True,
                message=f"Koneksi SNMP berhasil! Teridentifikasi: {descr}",
                details={"host": host, "port": port, "device_type": device.device_type.value, "sysDescr": descr}
            )
        except Exception as e:
            return DeviceTestResult(
                success=False,
                message=f"Gagal koneksi SNMP ke {host}: {str(e)}",
                details={"host": host, "port": port, "device_type": device.device_type.value}
            )

    def check_socket():
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        try:
            result = s.connect_ex((host, port))
            s.close()
            if result == 0:
                return True, f"Koneksi berhasil ke {host}:{port}"
            else:
                return False, f"Port {port} tertutup atau tidak merespon (Code: {result})"
        except Exception as ex:
            return False, f"Gagal menghubungi {host}: {str(ex)}"

    success, message = await asyncio.to_thread(check_socket)
    return DeviceTestResult(
        success=success,
        message=message,
        details={
            "host": host,
            "port": port,
            "device_type": device.device_type.value,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    )
