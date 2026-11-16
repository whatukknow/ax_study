# =====================================================================
# db.py : Supabase 클라이언트(접속 객체)를 만드는 파일
# 다른 파일(members.py, products.py ...)은 여기서 만든 supabase 객체를 import 해서 사용한다.
#   from db import supabase
# 클라이언트를 한 곳에서 한 번만 만들기 때문에, 로그인 상태(세션)도 모든 파일이 함께 쓴다.
# =====================================================================
import os

from dotenv import load_dotenv
from supabase import Client, create_client

# .env 파일의 값을 환경변수로 불러오기
# (URL, 키 같은 비밀 값은 코드에 직접 쓰지 않고 .env 에만 둔다. .env 는 .gitignore 로 GitHub 에 안 올라감)
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")

# .env 설정을 빠뜨렸을 때 알아보기 어려운 에러 대신 친절한 안내를 보여주고 멈춘다
if not url or not key:
    raise SystemExit(
        ".env 파일에 SUPABASE_URL 과 SUPABASE_PUBLISHABLE_KEY 를 설정해 주세요. "
        "(.env.example 파일을 복사해서 .env 를 만들면 됩니다)"
    )

# Supabase 클라이언트 생성 (publishable key 사용 -> RLS 정책의 적용을 받는 일반 사용자 권한)
supabase: Client = create_client(url, key)


def test_connection() -> bool:
    """products 테이블을 1행만 조회해서 접속이 되는지 확인한다."""
    try:
        response = supabase.table("products").select("id").limit(1).execute()
        print("연결 성공:", response.data)
        return True
    except Exception as error:
        print("연결 실패:", error)
        return False
