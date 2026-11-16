"""
게시판 API 의 시작점(엔트리 포인트)입니다.

실행: uv run uvicorn main:app --app-dir src --reload
문서: http://127.0.0.1:8000/docs (Swagger UI), http://127.0.0.1:8000/redoc
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

import models  # noqa: F401  모든 모델을 import 해서 Base.metadata 에 테이블을 등록합니다.
from database import Base, engine
from exceptions import register_exception_handlers
from routers import auth, posts

# 로그 형식: 시간 [레벨] - 메시지
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] - %(message)s")
logger = logging.getLogger("board_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작/종료 시 한 번씩 실행되는 함수입니다."""
    # [시작] 테이블이 없으면 만듭니다. (이미 있으면 건드리지 않음 / Alembic 대신 사용)
    async with engine.begin() as conn:
        # create_all 은 동기 함수라서 run_sync 로 비동기 연결 위에서 실행합니다.
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DB 테이블 준비 완료 (board_users, board_posts)")
    yield  # 이 지점에서 서버가 요청을 받기 시작합니다.
    # [종료] 커넥션 풀의 연결을 모두 정리합니다.
    await engine.dispose()
    logger.info("DB 연결 종료")


app = FastAPI(
    title="게시판 API",
    description="""
RESTful 게시판 API 입니다.

- **인증**: `/auth/signup` 으로 가입 → 오른쪽 위 **Authorize** 버튼에 이메일/비밀번호 입력 → 자물쇠 API 호출 가능
- **게시글**: 목록/상세는 누구나, 작성은 로그인 사용자, 수정은 작성자, 삭제는 작성자 또는 ADMIN
- **에러 응답**: 모든 에러는 `{"success": false, "data": null, "error": {"code", "message", "details"}}` 모양
""",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_request_time(request: Request, call_next):
    """모든 요청의 처리 시간을 재서 로그로 남기고 응답 헤더에도 넣는 미들웨어입니다."""
    start_time = time.perf_counter()  # 요청 처리 시작 시각
    response = await call_next(request)  # 실제 라우터 함수 실행
    process_time = (time.perf_counter() - start_time) * 1000  # ms 단위
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({process_time:.2f}ms)")
    return response


# 전역 예외 핸들러 등록 (에러 응답 모양 통일)
register_exception_handlers(app)

# 라우터 등록: /auth/..., /posts/...
app.include_router(auth.router)
app.include_router(posts.router)


@app.get("/", tags=["Health"], summary="서버 상태 확인")
async def health_check():
    """서버가 살아있는지 확인하는 API 입니다. (배포 후 확인용)"""
    return {"success": True, "data": {"status": "ok"}, "error": None}
