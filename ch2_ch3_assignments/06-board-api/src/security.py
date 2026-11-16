"""
보안 모듈입니다. (비밀번호 해싱, JWT 발급/검증, 현재 로그인 사용자 찾기)
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from exceptions import BoardException
from models.user import User

load_dotenv()

# ----- 설정값 (.env 에서 읽음) -----
# SECRET_KEY 는 토큰 서명용 비밀 키. 실제 배포에서는 반드시 .env 에 긴 랜덤 문자열로 넣습니다.
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE-ME-DEV-ONLY-SECRET-KEY")
# HS256 = 비밀 키 하나로 서명/검증하는 대칭키 알고리즘
ALGORITHM = os.getenv("ALGORITHM", "HS256")
# 액세스 토큰 유효 시간(분)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# ----- 비밀번호 해싱 -----
# bcrypt 는 같은 비밀번호도 매번 다른 salt 로 해시하므로 해시값만 보고 원문을 알 수 없습니다.
# (passlib 1.7.4 와 호환되도록 bcrypt==4.0.1 버전을 고정했습니다)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Swagger 의 Authorize 버튼이 로그인할 주소. 요청 헤더 "Authorization: Bearer <토큰>" 에서 토큰을 꺼내 줍니다.
# 헤더가 없으면 자동으로 401 HTTPException 을 던집니다. (exceptions.py 핸들러가 공통 모양으로 변환)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(plain_password: str) -> str:
    """평문 비밀번호를 bcrypt 해시 문자열로 바꿉니다."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """입력한 비밀번호가 저장된 해시와 일치하는지 확인합니다."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """JWT 액세스 토큰을 만듭니다. exp(만료 시각) 클레임을 넣어 30분 뒤 자동 만료됩니다."""
    to_encode = data.copy()  # 원본 dict 를 바꾸지 않도록 복사
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire_time, "token_type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# 401 응답에 붙이는 표준 헤더 (Bearer 토큰 방식이라는 것을 알려줌)
AUTH_HEADERS = {"WWW-Authenticate": "Bearer"}


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    """토큰을 검증하고, 토큰 주인(User)을 DB 에서 찾아 돌려주는 의존성 함수입니다."""
    try:
        # 서명과 exp 를 함께 검사합니다. 위조되었거나 만료되면 예외가 발생합니다.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.exceptions.ExpiredSignatureError:
        raise BoardException(status.HTTP_401_UNAUTHORIZED, "TOKEN_EXPIRED", "토큰이 만료되었습니다. 다시 로그인하세요.", AUTH_HEADERS)
    except jwt.exceptions.InvalidTokenError:
        raise BoardException(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "유효하지 않은 토큰입니다.", AUTH_HEADERS)

    # 액세스 토큰이 맞는지 확인 (다른 용도의 토큰 거부)
    if payload.get("token_type") != "access":
        raise BoardException(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "액세스 토큰이 아닙니다.", AUTH_HEADERS)

    # sub(subject) 클레임에 넣어 둔 이메일을 꺼냅니다.
    email = payload.get("sub")
    if email is None:
        raise BoardException(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "유효하지 않은 토큰입니다.", AUTH_HEADERS)

    # 토큰은 유효해도 그 사이 회원이 삭제됐을 수 있으므로 DB 에서 다시 확인합니다.
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise BoardException(status.HTTP_401_UNAUTHORIZED, "USER_NOT_FOUND", "토큰의 사용자를 찾을 수 없습니다.", AUTH_HEADERS)
    return user
