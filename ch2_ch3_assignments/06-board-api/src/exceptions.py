"""
커스텀 예외와 전역 예외 핸들러 모듈입니다.

어떤 에러가 나도 응답 모양을 아래 하나로 통일합니다.
    {"success": false, "data": null, "error": {"code": "...", "message": "...", "details": null}}
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("board_api")


class BoardException(Exception):
    """게시판 API 에서 직접 발생시키는 커스텀 예외입니다.

    예) raise BoardException(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.")
    """

    def __init__(self, status_code: int, code: str, message: str, headers: dict | None = None):
        self.status_code = status_code  # HTTP 상태 코드 (404, 403 ...)
        self.code = code  # 프로그램이 구분하기 위한 에러 코드 문자열
        self.message = message  # 사람이 읽는 한국어 설명
        self.headers = headers  # 필요 시 응답 헤더 (401 의 WWW-Authenticate 등)
        super().__init__(message)


def error_body(code: str, message: str, details: list | None = None) -> dict:
    """에러 응답 JSON(dict)을 만드는 함수입니다."""
    return {
        "success": False,
        "data": None,
        "error": {"code": code, "message": message, "details": details},
    }


# FastAPI/Starlette 가 스스로 던지는 HTTPException(예: 없는 URL 404, 토큰 없음 401)의
# 상태 코드를 우리 에러 코드 문자열로 바꾸기 위한 표입니다.
STATUS_CODE_NAMES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
}

# FastAPI 기본 메시지는 영어("Not authenticated" 등)라서, 자주 나오는 것은 한국어로 바꿔 줍니다.
STATUS_MESSAGES = {
    400: "요청 본문(JSON)을 해석할 수 없습니다.",
    401: "로그인이 필요합니다. (Authorization: Bearer 토큰 누락)",
    404: "요청한 주소를 찾을 수 없습니다.",
    405: "허용되지 않은 HTTP 메서드입니다.",
}


def register_exception_handlers(app: FastAPI) -> None:
    """app 에 전역 예외 핸들러들을 등록하는 함수입니다. main.py 에서 호출합니다."""

    @app.exception_handler(BoardException)
    async def board_exception_handler(request: Request, exc: BoardException):
        """우리가 직접 raise 한 BoardException 을 공통 에러 모양으로 바꿉니다."""
        logger.warning(f"[{exc.code}] {request.method} {request.url.path} - {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.message),
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """FastAPI 내부에서 발생한 HTTPException 도 같은 모양으로 바꿉니다.

        예) Authorization 헤더 없이 보호된 API 호출 -> OAuth2PasswordBearer 가 401 을 던짐
        """
        code = STATUS_CODE_NAMES.get(exc.status_code, "HTTP_ERROR")
        # 한국어 메시지가 준비된 상태 코드면 그것을, 아니면 원래 detail 을 씁니다.
        message = STATUS_MESSAGES.get(exc.status_code, str(exc.detail))
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(code, message),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Pydantic 검증 실패(422)를 같은 모양으로 바꾸고, 필드별 사유를 details 에 담습니다."""
        details = []
        for err in exc.errors():
            # loc 예: ("body", "title") -> "body.title"
            field = ".".join(str(part) for part in err["loc"])
            # msg 예: "Value error, 공백만 입력할 수 없습니다." -> 앞의 "Value error, " 제거
            message = err["msg"].removeprefix("Value error, ")
            details.append({"field": field, "message": message})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=error_body("VALIDATION_ERROR", "요청 값이 올바르지 않습니다.", details),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """예상하지 못한 에러(버그, DB 장애 등)는 500 으로 응답하고 서버 로그에 남깁니다.

        내부 에러 내용은 보안상 클라이언트에 그대로 보여주지 않습니다.
        """
        logger.exception(f"처리되지 않은 에러: {request.method} {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_body("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."),
        )
