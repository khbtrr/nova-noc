from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate, UserUpdate, UserPasswordReset, UserResponse
from app.models.user import User
from app.services.auth_service import (
    register_user,
    get_users,
    update_user_account,
    reset_user_password,
    delete_user,
)
from app.core.dependencies import get_db, require_admin

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    return await get_users(db)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    return await register_user(db, user_in)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    try:
        updated = await update_user_account(db, user_id, user_in, current_admin.id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    payload: UserPasswordReset,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    try:
        ok = await reset_user_password(db, user_id, payload.new_password)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")
        return {"status": "ok", "message": f"Password pengguna ID #{user_id} berhasil diperbarui"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_id}")
async def remove_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    try:
        deleted = await delete_user(db, user_id, current_admin.id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")
        return {"status": "ok", "message": f"Pengguna ID #{user_id} berhasil dihapus"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
