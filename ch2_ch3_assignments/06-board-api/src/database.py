"""
데이터베이스 연결 모듈입니다.

- 비동기 엔진(create_async_engine) + 비동기 세션 팩토리(async_sessionmaker)를 만듭니다.
- 라우터는 Depends(get_async_db) 로 "요청마다 새 세션"을 받아서 사용합니다.

[동시성 안전성 설명]
- 세션(AsyncSession)은 여러 요청이 같이 쓰면 안 되는 객체입니다(스레드/코루틴 안전하지 않음).
- 그래서 전역 세션 하나를 공유하지 않고, get_async_db 가 요청 1건마다 세션을 새로 열고
  요청이 끝나면 닫습니다. 동시에 100개의 요청이 와도 세션은 100개가 각각 따로 존재합니다.
- 실제 DB 연결(커넥션)은 엔진의 커넥션 풀(pool_size + max_overflow)에서 빌려 쓰고 돌려줍니다.
  풀이 다 차면 pool_timeout 초만큼 기다렸다가 실패합니다.
"""

import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# .env 파일의 값을 환경변수로 불러옵니다. (.env 는 git 에 올리지 않습니다)
load_dotenv()

# 접속 주소. 형식: postgresql+asyncpg://아이디:비밀번호@호스트:포트/DB이름
# - "+asyncpg" 는 비동기 드라이버(asyncpg)를 쓰겠다는 뜻입니다.
# - 기본값은 로컬 docker-compose postgres:17 기준입니다.
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
)

# 커넥션 풀 설정값 (.env 에서 문자열로 읽히므로 int/float 로 변환합니다)
# Supabase 무료 플랜은 동시 접속 수가 적기 때문에 기본값을 작게 잡았습니다.
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "5"))
DB_POOL_TIMEOUT = float(os.getenv("DB_POOL_TIMEOUT", "30.0"))
# SQL 로그 출력 여부 ("true" 일 때만 출력)
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"

# [Supabase 참고]
# - Session pooler(포트 5432) 주소를 쓰면 지금 코드 그대로 동작합니다.
# - Transaction pooler(포트 6543)를 쓰면 asyncpg 의 prepared statement 캐시와 충돌하므로
#   create_async_engine(..., connect_args={"statement_cache_size": 0}) 를 추가해야 합니다.
#   이 프로젝트는 Session pooler 를 쓰므로 connect_args 를 넣지 않았습니다.
engine = create_async_engine(
    DATABASE_URL,
    pool_size=DB_POOL_SIZE,  # 항상 유지하는 커넥션 수
    max_overflow=DB_MAX_OVERFLOW,  # 바쁠 때 추가로 더 만들 수 있는 커넥션 수
    pool_timeout=DB_POOL_TIMEOUT,  # 풀이 꽉 찼을 때 기다리는 최대 시간(초)
    pool_recycle=1800,  # 30분 지난 커넥션은 새로 교체 (서버가 끊은 연결 방지)
    pool_pre_ping=True,  # 커넥션을 쓰기 전에 살아있는지 확인
    echo=DB_ECHO,  # True 면 실행되는 SQL 을 콘솔에 출력
)

# 세션 팩토리: AsyncSessionLocal() 을 호출할 때마다 새 세션이 만들어집니다.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,  # commit 은 코드에서 직접 호출합니다.
    autoflush=False,  # 쿼리 전에 자동으로 flush 하지 않습니다.
    # commit 후에도 객체 값을 그대로 유지합니다.
    # (비동기에서는 commit 후 속성에 접근할 때 몰래 SELECT 가 일어나면 에러가 나기 때문)
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """모든 ORM 모델이 상속받는 기본 클래스입니다."""

    pass


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """요청 1건마다 새 DB 세션을 열어 주고, 요청이 끝나면 닫는 의존성 함수입니다."""
    # async with 블록을 벗어나면 세션이 자동으로 닫힙니다.
    async with AsyncSessionLocal() as session:
        try:
            # yield 로 세션을 라우터 함수에 빌려줍니다.
            yield session
        except Exception:
            # 처리 중 에러가 나면 반쯤 진행된 작업을 되돌립니다.
            await session.rollback()
            raise
        finally:
            await session.close()
