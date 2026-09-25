from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceTestResult
from app.services.device_service import (
    get_devices,
    get_device,
    create_device,
    update_device,
    delete_device,
    test_device_connection,
)
from app.core.dependencies import get_db, require_admin

router = APIRouter()

@router.get("", response_model=List[DeviceResponse])
async def read_devices(db: AsyncSession = Depends(get_db)):
    return await get_devices(db)

@router.get("/{id}", response_model=DeviceResponse)
async def read_device(id: int, db: AsyncSession = Depends(get_db)):
    return await get_device(db, id)

@router.post("", response_model=DeviceResponse)
async def add_device(device_in: DeviceCreate, db: AsyncSession = Depends(get_db), admin = Depends(require_admin)):
    return await create_device(db, device_in)

@router.put("/{id}", response_model=DeviceResponse)
async def edit_device(id: int, device_in: DeviceUpdate, db: AsyncSession = Depends(get_db), admin = Depends(require_admin)):
    return await update_device(db, id, device_in)

@router.delete("/{id}")
async def remove_device(id: int, db: AsyncSession = Depends(get_db), admin = Depends(require_admin)):
    await delete_device(db, id)
    return {"detail": "Device deleted"}

@router.post("/{id}/test", response_model=DeviceTestResult)
async def test_device(id: int, db: AsyncSession = Depends(get_db)):
    device = await get_device(db, id)
    return await test_device_connection(device)
