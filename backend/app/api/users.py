from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
from app.services.auth_service import register_user, get_users, delete_user
from app.core.dependencies import get_db, require_admin

router = APIRouter()

@router.get("", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Retrieve all registered users (Admin only)."""
    return await get_users(db)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Register a new user account with specified role (Admin only)."""
    return await register_user(db, user_in)

@router.delete("/{user_id}")
async def remove_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Delete a user account (Admin only)."""
    try:
        deleted = await delete_user(db, user_id, current_admin.id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")
        return {"status": "ok", "message": f"Pengguna ID #{user_id} berhasil dihapus"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
