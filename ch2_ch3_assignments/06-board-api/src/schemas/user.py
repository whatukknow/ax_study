"""회원/인증 관련 요청·응답 스키마입니다."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserSignup(BaseModel):
    """회원가입 요청 바디입니다."""

    email: str = Field(..., max_length=100, description="로그인에 사용할 이메일", examples=["user1@example.com"])
    # bcrypt 는 72바이트까지만 해시에 반영되므로 최대 길이를 72로 제한합니다.
    password: str = Field(..., min_length=8, max_length=72, description="비밀번호 (8~72자)", examples=["password123"])
    nickname: str = Field(..., min_length=2, max_length=20, description="닉네임 (2~20자)", examples=["홍길동"])

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """이메일 형식을 간단히 검사합니다. (email-validator 패키지는 수업에 없어 직접 검사)"""
        # 앞뒤 공백 제거 + 소문자로 통일 (User@A.com 과 user@a.com 을 같은 계정으로 취급)
        value = value.strip().lower()
        # '@' 가 정확히 1개 있어야 합니다.
        if value.count("@") != 1:
            raise ValueError("이메일 형식이 올바르지 않습니다.")
        local, domain = value.split("@")
        # @ 앞부분이 비어있거나, 도메인에 '.' 이 없거나, '.' 으로 시작/끝나면 잘못된 형식입니다.
        if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("이메일 형식이 올바르지 않습니다.")
        # 공백이 섞여 있으면 안 됩니다.
        if " " in value:
            raise ValueError("이메일에 공백을 넣을 수 없습니다.")
        return value

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: str) -> str:
        """닉네임이 공백만으로 이루어지지 않았는지 검사합니다."""
        value = value.strip()
        if len(value) < 2:
            raise ValueError("닉네임은 공백을 제외하고 2자 이상이어야 합니다.")
        return value


class UserResponse(BaseModel):
    """회원 정보 응답입니다. (비밀번호 해시는 절대 내보내지 않습니다)"""

    id: int
    email: str
    nickname: str
    role: str
    created_at: datetime

    class Config:
        # ORM 객체(User)를 그대로 넣어도 속성을 읽어서 변환해 줍니다.
        from_attributes = True


class AuthorResponse(BaseModel):
    """게시글 응답 안에 들어가는 작성자 요약 정보입니다."""

    id: int
    nickname: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """로그인 성공 시 돌려주는 토큰입니다.

    Swagger 의 Authorize 버튼이 이 모양({"access_token", "token_type"})을 그대로 읽어야 하므로
    APIResponse 봉투로 감싸지 않습니다.
    """

    access_token: str
    token_type: str = "bearer"
