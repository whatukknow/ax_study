"""회원(User) ORM 모델입니다."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

# 타입 힌트용 import (실행 시에는 import 하지 않아 순환 import 를 막습니다)
if TYPE_CHECKING:
    from models.post import Post


def utc_now() -> datetime:
    """현재 시각(UTC)을 돌려주는 함수입니다. 컬럼 default 로 사용합니다."""
    return datetime.now(timezone.utc)


class User(Base):
    """회원 정보 테이블(board_users)을 정의하는 ORM 모델 클래스입니다."""

    # 같은 Supabase DB 를 다른 과제와 같이 쓰므로 board_ 접두어로 이름 충돌을 피합니다.
    __tablename__ = "board_users"

    # 기본키(PK). index=True 로 조회를 빠르게 합니다.
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # 로그인 아이디로 쓰는 이메일. unique=True 로 중복 가입을 DB 차원에서도 막습니다.
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    # 비밀번호 원문이 아니라 bcrypt 해시값만 저장합니다.
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # 게시글에 표시될 작성자 이름
    nickname: Mapped[str] = mapped_column(String(20), nullable=False)
    # 권한: 일반 회원 "USER", 관리자 "ADMIN"
    role: Mapped[str] = mapped_column(String(10), default="USER", nullable=False)
    # 가입 시각. 파이썬에서 값을 만들어 넣기 때문에 commit 후 다시 조회할 필요가 없습니다.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # 1:N 관계 - 회원 한 명은 여러 게시글을 가집니다. (Post.author 와 서로 연결)
    posts: Mapped[List["Post"]] = relationship("Post", back_populates="author")
