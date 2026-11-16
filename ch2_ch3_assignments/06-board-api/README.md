# 게시판 API (Board API)

FastAPI + SQLAlchemy 2.0(비동기) + PostgreSQL(Supabase) + JWT 로 만든 RESTful 게시판 API 입니다.
회원가입/로그인, 게시글 CRUD, 작성자 검증(본인만 수정, 본인 또는 관리자만 삭제), 공통 에러 스키마, Swagger 문서를 제공하며 AWS EC2 에 배포합니다.

- 배포 주소: `http://<EC2_퍼블릭_IP>/`  ← 배포 후 채우기
- Swagger UI: `http://<EC2_퍼블릭_IP>/docs`  ← 배포 후 채우기
- GitHub: `<레포 주소>`  ← 채우기

## 1. 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 언어 / 패키지 관리 | Python 3.13, uv |
| 웹 프레임워크 | FastAPI, Uvicorn |
| DB / ORM | PostgreSQL (Supabase, Session pooler), SQLAlchemy 2.0 비동기 (`asyncpg`, `greenlet`) |
| 인증 | PyJWT (HS256, 30분 만료), passlib + bcrypt(4.0.1) 비밀번호 해싱, OAuth2PasswordBearer |
| 검증 | Pydantic (`Field`, `@field_validator`) |
| 설정 | python-dotenv (`.env` + `os.getenv`) |
| 배포 | AWS EC2 (Ubuntu) + systemd + nginx |

## 2. 폴더 구조

```
06-board-api/
├── pyproject.toml / uv.lock / .python-version
├── .env.example          # 환경변수 예시 (복사해서 .env 생성)
├── .gitignore
├── deploy/
│   ├── board-api.service       # systemd 서비스 파일
│   └── nginx-board-api.conf    # nginx 리버스 프록시 설정
└── src/
    ├── main.py          # 앱 생성, lifespan(테이블 생성), 미들웨어, 라우터/예외 핸들러 등록
    ├── database.py      # 비동기 엔진, 세션 팩토리, get_async_db 의존성
    ├── security.py      # 비밀번호 해싱, JWT 발급/검증, get_current_user
    ├── exceptions.py    # 커스텀 예외 BoardException + 전역 예외 핸들러
    ├── models/          # SQLAlchemy ORM 모델 (user.py, post.py)
    ├── schemas/         # Pydantic 스키마 (common.py, user.py, post.py)
    └── routers/         # API 라우터 (auth.py, posts.py)
```

## 3. ERD

같은 Supabase DB 를 다른 과제와 함께 쓰기 때문에 테이블 이름에 `board_` 접두어를 붙였습니다.

```mermaid
erDiagram
    board_users ||--o{ board_posts : "작성한다 (1:N)"
    board_users {
        int id PK
        varchar(100) email UK "로그인 아이디"
        varchar(255) hashed_password "bcrypt 해시"
        varchar(20) nickname
        varchar(10) role "USER | ADMIN"
        timestamptz created_at
    }
    board_posts {
        int id PK
        varchar(100) title
        text content
        int author_id FK "board_users.id"
        timestamptz created_at
        timestamptz updated_at
    }
```

- `User.posts` ↔ `Post.author` 를 `relationship(back_populates=...)` 로 연결했습니다.
- 게시글 응답에는 `author: {id, nickname}` 작성자 정보가 함께 들어갑니다. (비동기라서 `selectinload(Post.author)` 로 미리 로딩)

## 4. API 목록

| 메서드 | 경로 | 설명 | 인증 | 권한 | 성공 코드 | 주요 에러 |
|---|---|---|---|---|---|---|
| POST | `/auth/signup` | 회원가입 | - | - | 201 | 409 중복 이메일, 422 |
| POST | `/auth/login` | 로그인 (폼: username=이메일, password) → 토큰 | - | - | 200 | 401, 422 |
| GET | `/auth/me` | 내 정보 | Bearer | - | 200 | 401 |
| GET | `/posts?page=1&size=10` | 게시글 목록 (size 최대 100) | - | - | 200 | 422 |
| GET | `/posts/{post_id}` | 게시글 상세 | - | - | 200 | 404 |
| POST | `/posts` | 게시글 작성 | Bearer | 로그인 사용자 | 201 | 401, 422 |
| PATCH | `/posts/{post_id}` | 게시글 부분 수정 | Bearer | 작성자 본인 | 200 | 401, 403, 404, 422 |
| DELETE | `/posts/{post_id}` | 게시글 삭제 | Bearer | 작성자 본인 또는 ADMIN | 204 | 401, 403, 404 |
| GET | `/` | 서버 상태 확인 | - | - | 200 | - |

검증 규칙
- 이메일: `@` 1개, 도메인에 `.` 포함, 공백 불가, 소문자로 저장 (`@field_validator`)
- 비밀번호: 8~72자 (bcrypt 는 72바이트까지만 사용) / 닉네임: 2~20자
- 제목: 1~100자, 본문: 1~5000자, 공백만 입력 불가 / PATCH 에서 `null` 불가
- 목록: `page >= 1`, `1 <= size <= 100`

관리자 지정: 관리자 API 는 따로 없으므로 Supabase SQL Editor 에서 직접 바꿉니다.
```sql
update board_users set role = 'ADMIN' where email = 'admin@example.com';
```
(역할은 매 요청마다 DB 에서 다시 읽으므로 바로 적용됩니다.)

## 5. 응답 / 에러 스키마

성공 응답은 공통 봉투 `APIResponse[T]` 로 감쌉니다. (단, 로그인 응답은 Swagger Authorize 와 OAuth2 표준을 위해 `{"access_token", "token_type"}` 그대로 반환, 삭제는 본문 없는 204)

```json
{ "success": true, "data": { "id": 1, "title": "첫 글", "content": "내용",
  "author": { "id": 1, "nickname": "에이" },
  "created_at": "...", "updated_at": "..." }, "error": null }
```

모든 에러는 같은 모양입니다. 커스텀 예외 `BoardException` 과 `@app.exception_handler` (BoardException / HTTPException / RequestValidationError / Exception) 로 통일했습니다.

```json
{ "success": false, "data": null,
  "error": { "code": "NOT_POST_AUTHOR", "message": "본인이 작성한 글만 수정할 수 있습니다.", "details": null } }
```

422 검증 에러는 `details` 에 필드별 사유가 들어갑니다.
```json
{ "success": false, "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "요청 값이 올바르지 않습니다.",
    "details": [ { "field": "body.title", "message": "공백만 입력할 수 없습니다." } ] } }
```

| HTTP | code | 상황 |
|---|---|---|
| 400 | BAD_REQUEST | JSON 본문 해석 불가 |
| 401 | UNAUTHORIZED | 토큰 없음 |
| 401 | INVALID_TOKEN / TOKEN_EXPIRED / USER_NOT_FOUND | 위조·만료 토큰, 탈퇴한 사용자 |
| 401 | INVALID_CREDENTIALS | 로그인 실패 |
| 403 | NOT_POST_AUTHOR | 남의 글 수정/삭제 |
| 404 | POST_NOT_FOUND / NOT_FOUND | 없는 게시글 / 없는 주소 |
| 409 | DUPLICATE_EMAIL | 이미 가입된 이메일 |
| 422 | VALIDATION_ERROR | 입력값 검증 실패 |
| 500 | INTERNAL_SERVER_ERROR | 예상 못한 서버 오류 (내용은 로그에만) |

## 6. 설계 포인트

- **비동기 + 요청별 세션 (동시성 안전)**: `get_async_db` 가 요청마다 새 `AsyncSession` 을 열고 끝나면 닫습니다. 세션을 여러 요청이 공유하지 않으므로 동시 요청이 서로의 트랜잭션을 건드리지 않습니다. 실제 DB 연결은 엔진의 커넥션 풀에서 빌려 씁니다.
- **중복 가입 경쟁 상태**: 먼저 SELECT 로 중복을 확인하고, 동시에 들어와 둘 다 통과한 경우에도 `email` 의 unique 제약이 막아 주며 그 `IntegrityError` 를 409 로 바꿉니다.
- **작성자 위조 방지**: 게시글의 `author_id` 는 요청 바디가 아니라 토큰의 사용자에서 가져옵니다.
- **미들웨어**: `@app.middleware("http")` 로 모든 요청의 처리 시간을 로그로 남기고 `X-Process-Time-Ms` 헤더에 넣습니다.
- **테이블 생성**: Alembic 대신 lifespan 에서 `Base.metadata.create_all` (이미 있는 테이블은 건드리지 않음).
- **목록 순서**: `order_by` 없이 DB 가 돌려주는 기본 순서 그대로 반환합니다.

## 7. 로컬 실행

```bash
# 1) 패키지 설치
uv sync

# 2) 환경변수 파일 만들기 → DATABASE_URL, SECRET_KEY 채우기
cp .env.example .env

# 3) 서버 실행 (코드가 src/ 안에 있으므로 --app-dir src)
uv run uvicorn main:app --app-dir src --reload
```

- Supabase 대신 로컬 Postgres 를 쓰려면 `docker-compose` 의 `postgres:17` 을 띄우고
  `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/postgres` 로 설정합니다.
- Supabase 는 **Session pooler** 주소(포트 5432)를 사용합니다. Transaction pooler(포트 6543)는 asyncpg 의 prepared statement 캐시와 충돌하므로 `database.py` 의 `create_async_engine` 에 `connect_args={"statement_cache_size": 0}` 을 추가해야 합니다.

### curl 테스트 예시

```bash
# 회원가입
curl -i -X POST "http://127.0.0.1:8000/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123","nickname":"user1"}'

# 로그인 (폼 형식, username 에 이메일)
curl -X POST "http://127.0.0.1:8000/auth/login" -d "username=user1@example.com&password=password123"

# 글 작성 (위에서 받은 토큰 사용)
curl -i -X POST "http://127.0.0.1:8000/posts" -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" -d '{"title":"hello","content":"first post"}'

# 목록
curl "http://127.0.0.1:8000/posts?page=1&size=10"
```

## 8. Swagger 사용법

1. `http://127.0.0.1:8000/docs` 접속 (배포 후에는 `http://<EC2_IP>/docs`)
2. **Auth → POST /auth/signup** → Try it out → 이메일/비밀번호/닉네임 입력 → Execute (201)
3. 오른쪽 위 **Authorize (자물쇠)** 버튼 → `username` 에 **이메일**, `password` 입력 → Authorize
   (내부적으로 `/auth/login` 을 호출해 토큰을 받아 이후 요청 헤더에 `Authorization: Bearer ...` 를 자동으로 붙입니다)
4. 자물쇠가 있는 API(글 작성/수정/삭제, 내 정보)를 실행
5. 다른 계정으로 Authorize 를 다시 해서 남의 글을 수정하면 403 에러 스키마를 확인할 수 있습니다.
6. 각 API 의 Responses 항목에서 401/403/404/409/422 에러 응답 모양도 확인할 수 있습니다. (`/redoc` 도 제공)

## 9. AWS EC2 배포

1. **준비**: `.env` 는 커밋하지 않고(`.gitignore`), 코드를 GitHub 에 push 합니다.
2. **EC2 생성**: Ubuntu 인스턴스, 보안 그룹 인바운드 규칙
   - 22 (SSH, 내 IP), **80 (HTTP, 0.0.0.0/0)**, 443 (HTTPS, 선택), 8000 (임시 테스트용, 확인 후 삭제)
3. **접속**
   ```bash
   chmod 400 key.pem
   ssh -i "key.pem" ubuntu@<EC2_퍼블릭_IP>
   ```
4. **uv 설치 + 코드 받기 + 패키지 설치**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   source ~/.bashrc
   git clone <레포 주소> board-api
   cd board-api
   vi .env          # .env.example 참고해서 DATABASE_URL(Supabase Session pooler), SECRET_KEY 등 입력
   uv sync
   ```
5. **스왑 메모리 2GB** (프리티어 메모리 부족 대비)
   ```bash
   sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   free -h
   ```
6. **임시 실행 확인** (보안 그룹 8000 열린 상태에서 `http://<IP>:8000/docs` 확인 후 Ctrl+C)
   ```bash
   uv run uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000
   ```
7. **systemd 등록** (`deploy/board-api.service` 의 경로를 실제 폴더에 맞게 확인)
   ```bash
   sudo cp deploy/board-api.service /etc/systemd/system/board-api.service
   sudo systemctl daemon-reload
   sudo systemctl enable board-api
   sudo systemctl start board-api
   sudo systemctl status board-api
   # 로그 확인: sudo journalctl -u board-api -f
   ```
8. **nginx 리버스 프록시** (80 → 127.0.0.1:8000)
   ```bash
   sudo apt update && sudo apt install nginx -y
   sudo cp deploy/nginx-board-api.conf /etc/nginx/sites-available/board-api
   sudo ln -s /etc/nginx/sites-available/board-api /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default   # 기본 환영 페이지 설정 비활성화
   sudo nginx -t
   sudo systemctl restart nginx
   ```
9. **확인**: `http://<EC2_퍼블릭_IP>/` → `{"success":true,...}`, `http://<EC2_퍼블릭_IP>/docs` → Swagger. 확인 후 보안 그룹의 8000 규칙은 삭제합니다.
10. (심화, 도메인이 있을 때) HTTPS: `sudo apt install certbot python3-certbot-nginx -y && sudo certbot --nginx -d <도메인>`

코드 수정 후 재배포: `git pull && uv sync && sudo systemctl restart board-api`

## 10. 스크린샷 (제출 전 채우기)

- [ ] Swagger 전체 화면
- [ ] Authorize 후 글 작성 201
- [ ] 다른 사용자 수정 시도 403 에러 스키마
- [ ] 검증 실패 422 에러 스키마
- [ ] EC2 배포 주소에서 /docs 접속 화면
