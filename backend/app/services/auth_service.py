from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password
from app.config import settings

async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role or UserRole.VIEWER
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.id))
    return list(result.scalars().all())

async def delete_user(db: AsyncSession, user_id: int, current_user_id: int) -> bool:
    if user_id == current_user_id:
        raise ValueError("Tidak dapat menghapus akun Anda sendiri.")
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    if user.username == settings.DEFAULT_ADMIN_USERNAME:
        raise ValueError("Akun administrator default tidak dapat dihapus.")
    await db.delete(user)
    await db.commit()
    return True

async def create_default_admin(db: AsyncSession):
    result = await db.execute(select(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME))
    admin = result.scalar_one_or_none()
    if not admin:
        admin = User(
            username=settings.DEFAULT_ADMIN_USERNAME,
            email=settings.DEFAULT_ADMIN_EMAIL,
            hashed_password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            role=UserRole.ADMIN
        )
        db.add(admin)
        await db.commit()


