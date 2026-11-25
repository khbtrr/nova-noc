from pydantic import BaseModel, field_validator, field_serializer
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[UserRole] = UserRole.VIEWER

    @field_validator("role", mode="before")
    def parse_role(cls, v):
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper in UserRole.__members__:
                return UserRole[v_upper]
        return v


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @field_validator("role", mode="before")
    def parse_role(cls, v):
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper in UserRole.__members__:
                return UserRole[v_upper]
        return v


class UserPasswordReset(BaseModel):
    new_password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    @field_serializer("role")
    def serialize_role(self, role: UserRole) -> str:
        # Frontend compares against lowercase 'admin' / 'viewer'
        return role.value.lower()

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
