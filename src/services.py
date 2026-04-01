from src.models import User, UserRole
from fastapi import Depends, HTTPException, status

from src.auth import current_active_user

def required_role(required_roles: list[UserRole]):
    def role_checker(user: User = Depends(current_active_user)):
        if user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return user
    return role_checker