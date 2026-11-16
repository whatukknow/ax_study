"""게시글(Post) ORM 모델입니다."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.user import utc_now

if TYPE_CHECKING:
    from models.user import User


class Post(Base):
    """게시글 테이블(board_posts)을 정의하는 ORM 모델 클래스입니다."""

    __tablename__ = "board_posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # 제목 (최대 100자)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    # 본문 (길이 제한은 Pydantic 스키마에서 검사, DB 는 Text 로 넉넉하게)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 외래키(FK) - 작성자 회원의 id. board_users.id 를 가리킵니다.
    author_id: Mapped[int] = mapped_column(
        ForeignKey("board_users.id"), index=True, nullable=False
    )
    # 작성 시각
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    # 수정 시각 - UPDATE 가 일어날 때 onupdate 로 자동 갱신됩니다.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # N:1 관계 - 게시글 하나는 작성자 한 명을 가집니다. (User.posts 와 서로 연결)
    author: Mapped["User"] = relationship("User", back_populates="posts")
