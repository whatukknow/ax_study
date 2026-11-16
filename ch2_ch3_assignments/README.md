# Ch2 · Ch3 실습 과제 (프론트엔드 & 백엔드)

CH 2, CH 3에서 학습한 내용을 적용한 실습 과제 모음입니다. 과제별로 독립된 폴더·의존성·환경변수를 사용하므로 서로 영향을 주지 않고 동시에 실행할 수 있습니다.

| 과제 | 폴더 | 주요 기술 | 실행 |
|---|---|---|---|
| 1. 데이터베이스 & AI 활용 | [01-db-supabase-shop](01-db-supabase-shop) | uv, PostgreSQL, Supabase SDK, RLS, 트랜잭션 함수 | `uv run main.py` |
| 2-1. 클론 코딩 (HTML + CSS) | [02-clone-coding](02-clone-coding) | 시맨틱 태그, Flexbox, Grid, 반응형 | `index.html` 열기 |
| 2-2. Todo 리스트 (JavaScript) | [03-todo-js](03-todo-js) | DOM, 이벤트 위임, 고차 함수 | `index.html` 열기 |
| 3. 프론트엔드 심화 (TypeScript) | [04-typescript-tslab](04-typescript-tslab) | tslab 노트북, 인터페이스, 타입 가드, 제네릭 | VS Code Jupyter (tslab 커널) |
| 4. 프론트엔드 응용 (React/Next.js) | [05-nextjs-todo-supabase](05-nextjs-todo-supabase) | Next.js App Router, Supabase Auth, 서버 액션 | `npm install` → `npm run dev` (포트 3000) |
| 5. 백엔드 아키텍처 & API 설계 | [06-board-api](06-board-api) | FastAPI, SQLAlchemy(async), JWT, Swagger | `uv run uvicorn main:app --app-dir src --reload` (포트 8000) |

각 폴더의 `README.md`에 설치 방법, 구현 내용, 채점 항목별 설명이 있습니다.
