"""회원가입 / 로그인 / 내 정보 API 라우터입니다."""

import logging

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from exceptions import BoardException
from models.user import User
from schemas.common import APIResponse, ErrorResponse
from schemas.user import TokenResponse, UserResponse, UserSignup
from security import create_access_token, get_current_user, hash_password, verify_password

logger = logging.getLogger("board_api")

# prefix: 이 라우터의 모든 주소 앞에 /auth 가 붙습니다. tags: Swagger 에서 묶어 보여줄 그룹 이름
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/signup",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="회원가입",
    description="이메일/비밀번호/닉네임으로 가입합니다. 비밀번호는 bcrypt 해시로만 저장됩니다.",
    responses={409: {"model": ErrorResponse, "description": "이미 가입된 이메일"},
               422: {"model": ErrorResponse, "description": "입력값 검증 실패"}},
)
async def signup(user_in: UserSignup, db: AsyncSession = Depends(get_async_db)):
    """회원가입 API 입니다."""
    # 1) 같은 이메일이 이미 있는지 먼저 확인합니다.
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none() is not None:
        raise BoardException(status.HTTP_409_CONFLICT, "DUPLICATE_EMAIL", "이미 가입된 이메일입니다.")

    # 2) 비밀번호는 해시로 바꿔서 저장합니다. (원문은 저장하지 않음)
    new_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        nickname=user_in.nickname,
    )
    db.add(new_user)
    try:
        await db.commit()
    except IntegrityError:
        # 동시에 같은 이메일로 2건이 들어오면 1)의 확인을 둘 다 통과할 수 있습니다.
        # 이때는 DB 의 unique 제약이 두 번째 INSERT 를 막아 주므로, 그 에러를 409 로 바꿉니다.
        await db.rollback()
        raise BoardException(status.HTTP_409_CONFLICT, "DUPLICATE_EMAIL", "이미 가입된 이메일입니다.")
    await db.refresh(new_user)  # DB 가 만든 id 등을 객체에 다시 읽어옵니다.

    logger.info(f"회원가입 성공: id={new_user.id}, email={new_user.email}")
    return APIResponse(success=True, data=new_user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="로그인 (토큰 발급)",
    description=(
        "OAuth2 폼 형식(application/x-www-form-urlencoded)으로 **username 칸에 이메일**, password 를 보냅니다.\n\n"
        "성공하면 30분짜리 액세스 토큰을 돌려줍니다. Swagger 의 Authorize 버튼도 이 API 를 사용합니다."
    ),
    responses={401: {"model": ErrorResponse, "description": "이메일 또는 비밀번호 불일치"}},
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    """로그인 API 입니다. OAuth2 표준에 맞춰 토큰 응답은 봉투 없이 그대로 돌려줍니다."""
    # OAuth2 표준 폼의 필드 이름이 username 이라서, 여기에 이메일을 받습니다.
    email = form_data.username.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # 이메일이 없거나 비밀번호가 틀리면 같은 메시지를 줍니다.
    # (어느 쪽이 틀렸는지 알려주면 가입된 이메일을 알아내는 데 악용될 수 있음)
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise BoardException(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "이메일 또는 비밀번호가 올바르지 않습니다.",
            {"WWW-Authenticate": "Bearer"},
        )

    # sub 에 이메일, role 에 권한을 담아 토큰을 만듭니다.
    access_token = create_access_token({"sub": user.email, "role": user.role})
    logger.info(f"로그인 성공: id={user.id}")
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=APIResponse[UserResponse],
    summary="내 정보 조회",
    description="Authorization 헤더의 Bearer 토큰으로 현재 로그인한 사용자 정보를 돌려줍니다.",
    responses={401: {"model": ErrorResponse, "description": "토큰 없음/만료/위조"}},
)
async def read_me(current_user: User = Depends(get_current_user)):
    """내 정보 조회 API 입니다. 토큰 검증은 get_current_user 의존성이 대신 해 줍니다."""
    return APIResponse(success=True, data=current_user)
