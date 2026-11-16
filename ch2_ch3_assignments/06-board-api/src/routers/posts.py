"""게시글 CRUD API 라우터입니다."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_async_db
from exceptions import BoardException
from models.post import Post
from models.user import User
from schemas.common import APIResponse, ErrorResponse
from schemas.post import PostCreate, PostListResponse, PostResponse, PostUpdate
from security import get_current_user

logger = logging.getLogger("board_api")

router = APIRouter(prefix="/posts", tags=["Posts"])

# Swagger 문서에 표시할 공통 에러 응답들
AUTH_ERRORS = {401: {"model": ErrorResponse, "description": "로그인 필요 (토큰 없음/만료/위조)"}}
NOT_FOUND_ERROR = {404: {"model": ErrorResponse, "description": "게시글 없음"}}
FORBIDDEN_ERROR = {403: {"model": ErrorResponse, "description": "권한 없음 (작성자가 아님)"}}


async def get_post_or_404(db: AsyncSession, post_id: int) -> Post:
    """id 로 게시글을 찾고, 없으면 404 를 던지는 함수입니다.

    selectinload(Post.author): 작성자 정보를 미리 함께 불러옵니다.
    비동기 세션에서는 나중에 post.author 에 접근할 때 몰래 SELECT 를 할 수 없어서(greenlet 에러)
    필요한 관계는 이렇게 미리 로딩해야 합니다.
    """
    stmt = select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()
    if post is None:
        raise BoardException(status.HTTP_404_NOT_FOUND, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.")
    return post


@router.get(
    "",
    response_model=APIResponse[PostListResponse],
    summary="게시글 목록 조회",
    description="page/size 로 페이지를 나눠 조회합니다. 로그인 없이 누구나 볼 수 있습니다.",
)
async def list_posts(
    page: Annotated[int, Query(ge=1, description="페이지 번호 (1부터 시작)")] = 1,
    size: Annotated[int, Query(ge=1, le=100, description="한 페이지 글 수 (최대 100)")] = 10,
    db: AsyncSession = Depends(get_async_db),
):
    """게시글 목록 API 입니다."""
    # page=1,size=10 -> 0개 건너뛰고 10개 / page=2 -> 10개 건너뛰고 10개
    skip = (page - 1) * size
    # 정렬(order_by)은 사용하지 않고 DB 가 돌려주는 기본 순서 그대로 반환합니다.
    stmt = select(Post).options(selectinload(Post.author)).offset(skip).limit(size)
    result = await db.execute(stmt)
    posts = result.scalars().all()
    return APIResponse(success=True, data=PostListResponse(items=posts, page=page, size=size))


@router.get(
    "/{post_id}",
    response_model=APIResponse[PostResponse],
    summary="게시글 상세 조회",
    description="게시글 하나를 작성자 정보와 함께 조회합니다.",
    responses={**NOT_FOUND_ERROR},
)
async def get_post(
    post_id: Annotated[int, Path(ge=1, description="게시글 id")],
    db: AsyncSession = Depends(get_async_db),
):
    """게시글 상세 API 입니다."""
    post = await get_post_or_404(db, post_id)
    return APIResponse(success=True, data=post)


@router.post(
    "",
    response_model=APIResponse[PostResponse],
    status_code=status.HTTP_201_CREATED,
    summary="게시글 작성",
    description="로그인한 사용자가 글을 작성합니다. 작성자는 토큰의 사용자로 자동 지정됩니다.",
    responses={**AUTH_ERRORS},
)
async def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """게시글 작성 API 입니다."""
    # 작성자 id 는 클라이언트가 보낸 값이 아니라 토큰에서 확인한 사용자 id 를 씁니다. (위조 방지)
    new_post = Post(title=post_in.title, content=post_in.content, author_id=current_user.id)
    db.add(new_post)
    await db.commit()
    logger.info(f"게시글 작성: post_id={new_post.id}, author_id={current_user.id}")
    # 작성자 정보까지 담아 응답하기 위해 author 를 함께 로딩해서 다시 조회합니다.
    post = await get_post_or_404(db, new_post.id)
    return APIResponse(success=True, data=post)


@router.patch(
    "/{post_id}",
    response_model=APIResponse[PostResponse],
    summary="게시글 수정 (부분 수정)",
    description="작성자 본인만 수정할 수 있습니다. 보낸 필드(title/content)만 바뀝니다.",
    responses={**AUTH_ERRORS, **FORBIDDEN_ERROR, **NOT_FOUND_ERROR},
)
async def update_post(
    post_id: Annotated[int, Path(ge=1, description="게시글 id")],
    post_in: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """게시글 수정 API 입니다."""
    post = await get_post_or_404(db, post_id)

    # 작성자 검증: 글쓴이 id 와 로그인한 사용자 id 가 다르면 403
    if post.author_id != current_user.id:
        raise BoardException(status.HTTP_403_FORBIDDEN, "NOT_POST_AUTHOR", "본인이 작성한 글만 수정할 수 있습니다.")

    # exclude_unset=True: 클라이언트가 실제로 보낸 필드만 dict 로 꺼냅니다.
    update_data = post_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)  # post.title = value 와 같은 의미

    await db.commit()  # 변경된 필드가 있으면 UPDATE 실행 (updated_at 도 onupdate 로 갱신)
    logger.info(f"게시글 수정: post_id={post.id}, fields={list(update_data.keys())}")
    return APIResponse(success=True, data=post)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="게시글 삭제",
    description="작성자 본인 또는 관리자(role=ADMIN)만 삭제할 수 있습니다. 성공 시 본문 없이 204 를 돌려줍니다.",
    responses={**AUTH_ERRORS, **FORBIDDEN_ERROR, **NOT_FOUND_ERROR},
)
async def delete_post(
    post_id: Annotated[int, Path(ge=1, description="게시글 id")],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """게시글 삭제 API 입니다."""
    post = await get_post_or_404(db, post_id)

    # 작성자도 아니고 관리자도 아니면 403
    if post.author_id != current_user.id and current_user.role != "ADMIN":
        raise BoardException(status.HTTP_403_FORBIDDEN, "NOT_POST_AUTHOR", "본인이 작성한 글만 삭제할 수 있습니다.")

    await db.delete(post)
    await db.commit()
    logger.info(f"게시글 삭제: post_id={post_id}, by user_id={current_user.id}")
    return None  # 204 는 응답 본문이 없습니다.
