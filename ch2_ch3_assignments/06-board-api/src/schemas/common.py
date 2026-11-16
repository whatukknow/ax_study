"""모든 API 가 같이 쓰는 공통 응답 스키마입니다."""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

# 제네릭 타입 변수: APIResponse[PostResponse] 처럼 data 의 타입을 바꿔 끼울 수 있게 합니다.
T = TypeVar("T")


class FieldError(BaseModel):
    """검증 실패한 필드 하나의 정보입니다. (예: body.title -> 너무 짧음)"""

    field: str
    message: str


class ErrorDetail(BaseModel):
    """에러 내용입니다. code 는 프로그램이 구분하는 값, message 는 사람이 읽는 설명입니다."""

    code: str
    message: str
    # 422 검증 에러일 때만 어떤 필드가 왜 틀렸는지 목록을 담습니다.
    details: Optional[List[FieldError]] = None


class APIResponse(BaseModel, Generic[T]):
    """성공/실패 모두 같은 모양으로 응답하기 위한 공통 봉투(envelope)입니다.

    성공: {"success": true,  "data": {...}, "error": null}
    실패: {"success": false, "data": null,  "error": {"code": ..., "message": ...}}
    """

    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None


class ErrorResponse(BaseModel):
    """Swagger 문서에 에러 응답 모양을 보여주기 위한 스키마입니다."""

    success: bool = False
    data: None = None
    error: ErrorDetail
