"""게시글 관련 요청·응답 스키마입니다."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from schemas.user import AuthorResponse

# 길이 제한을 상수로 모아 두면 생성/수정 스키마가 같은 규칙을 쓰게 됩니다.
TITLE_MAX = 100
CONTENT_MAX = 5000


class PostCreate(BaseModel):
    """게시글 작성 요청 바디입니다."""

    title: str = Field(..., min_length=1, max_length=TITLE_MAX, description="제목 (1~100자)", examples=["첫 번째 글"])
    content: str = Field(..., min_length=1, max_length=CONTENT_MAX, description="본문 (1~5000자)", examples=["안녕하세요!"])

    @field_validator("title", "content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        """공백만 입력한 경우(예: "   ")를 막고, 앞뒤 공백을 제거합니다."""
        value = value.strip()
        if not value:
            raise ValueError("공백만 입력할 수 없습니다.")
        return value


class PostUpdate(BaseModel):
    """게시글 부분 수정(PATCH) 요청 바디입니다. 보낸 필드만 수정합니다."""

    title: Optional[str] = Field(None, min_length=1, max_length=TITLE_MAX, description="새 제목")
    content: Optional[str] = Field(None, min_length=1, max_length=CONTENT_MAX, description="새 본문")

    @field_validator("title", "content")
    @classmethod
    def not_blank_or_null(cls, value: Optional[str]) -> str:
        """필드를 보냈다면 null 이나 공백만 있는 값은 허용하지 않습니다.

        (필드를 아예 안 보내면 이 검사기는 실행되지 않습니다)
        """
        if value is None:
            raise ValueError("null 로 수정할 수 없습니다. 수정하지 않을 필드는 보내지 마세요.")
        value = value.strip()
        if not value:
            raise ValueError("공백만 입력할 수 없습니다.")
        return value


class PostResponse(BaseModel):
    """게시글 응답입니다. 작성자 정보(author)를 함께 담습니다."""

    id: int
    title: str
    content: str
    # Post.author 관계(relationship)에서 읽어 온 작성자 정보
    author: AuthorResponse
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    """게시글 목록 응답입니다. 페이지 정보도 같이 돌려줍니다."""

    items: List[PostResponse]
    page: int
    size: int
