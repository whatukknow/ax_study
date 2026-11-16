# 04. 프론트엔드 심화 (TypeScript) 과제 — tslab Jupyter

VS Code + Jupyter + **tslab** 커널로 TypeScript 코드를 노트북(`.ipynb`)에서 실행하는 과제입니다.
`uv` 프로젝트는 Jupyter 실행 환경만 담당하고, 실제 TypeScript 실행은 전역 설치한 tslab이 담당합니다.

## 파일 구성

| 파일 | 설명 |
|---|---|
| `01_data_modeling.ipynb` | 회원/상품 타입 설계, 더미 데이터, `filterUsersByRole`, `calculateTotalPrice` |
| `02_generics_typeguard.ipynb` | `in` 타입 가드(`renderItemSummary`), 제네릭 클래스 `InMemoryStorage<T extends Identifiable>` |
| `pyproject.toml`, `uv.lock`, `.python-version` | uv 프로젝트 설정 (Jupyter 의존성) |
| `.gitignore` | `.venv`, `.ipynb_checkpoints` 제외 |

## 1. 환경 설정

```bash
# 1) Node.js 준비 (강의 기준)
nvm install 24
nvm use 24

# 2) tslab 전역 설치
npm install -g tslab

# 3) uv 프로젝트 의존성 설치 (jupyter 포함) — 이 폴더에서 실행
uv sync

# 4) tslab 커널을 Jupyter에 등록
uv run --with jupyter tslab install
# (tslab 명령이 바로 실행되는 환경이면 `tslab install` 만 해도 됩니다)

# 5) 등록 확인 — 목록에 tslab, jslab 이 보이면 성공
uv run jupyter kernelspec list
```

### VS Code 설정
1. 확장(Extensions)에서 **Jupyter** (Microsoft) 확장을 설치합니다.
2. `.ipynb` 파일을 열고 오른쪽 위 **커널 선택(Select Kernel)** → **Jupyter Kernel...** → **TypeScript (tslab)** 를 선택합니다.

## 2. 실행 방법

- VS Code에서 노트북을 열고 상단의 **모두 실행(Run All)** 을 누르면 모든 셀이 순서대로 실행되고 출력이 저장됩니다.
  (노트북마다 타입을 다시 선언했으므로 두 노트북은 각각 단독으로 실행됩니다.)
- 터미널에서 실행하고 결과까지 파일에 저장하려면:

```bash
uv run jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=tslab 01_data_modeling.ipynb
uv run jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=tslab 02_generics_typeguard.ipynb
```

## 3. 제출용 zip 만들기 (.venv 제외)

PowerShell에서 이 폴더(`04-typescript-tslab`) 안에 들어가서 실행합니다.

```powershell
Get-ChildItem -Force | Where-Object { $_.Name -notin @(".venv", ".ipynb_checkpoints") } |
  Compress-Archive -DestinationPath ..\04-typescript-tslab.zip -Force
```

zip 안에 `pyproject.toml`, `uv.lock`, `01_data_modeling.ipynb`, `02_generics_typeguard.ipynb`, `README.md` 가 들어 있고
`.venv` 폴더는 없는지 확인합니다.

## 4. 요구사항 → 구현 매핑

| 요구사항 | 구현 위치 | 핵심 포인트 |
|---|---|---|
| `UserRole` 리터럴 유니온 (`admin`/`customer`/`guest`) | 01 · 1단계 셀 | 정해진 문자열만 허용 |
| `User` 인터페이스 (id, name, email, role, isActive) | 01 · 1단계 셀 | `role: UserRole` |
| `Category` 리터럴 유니온 (`electronics`/`clothing`/`books`) | 01 · 1단계 셀 | |
| `Product` 인터페이스 + 선택 속성 `discountRate?` | 01 · 1단계 셀 | 타입은 `number \| undefined` |
| `users: User[]`, `products: Product[]` 더미 데이터 + 출력 | 01 · 1단계 셀 | 할인 있는/없는 상품 혼합 |
| `filterUsersByRole(users, targetRole): User[]` | 01 · 2단계 셀 | `targetRole: UserRole`, `filter` 사용 |
| `calculateTotalPrice(products): number` (할인 undefined 방어) | 01 · 3단계 셀 | `!== undefined` 로 타입 좁히기, `Math.round` |
| 타입 에러 예시 | 01 · 참고 셀 | 주석 처리 + 에러 메시지 설명 |
| 노트북 단독 실행 (타입 재선언) | 02 · 0단계 셀 | |
| `renderItemSummary(item: User \| Product): string` | 02 · 1단계 셀 | `"email" in item` 으로 User/Product 구분 |
| `Identifiable` 인터페이스 | 02 · 2단계 셀 | `id: number` |
| `InMemoryStorage<T extends Identifiable>` (private items, add/getById/getAll) | 02 · 2단계 셀 | `getAll` 은 `[...this.items]` 복사본 반환 |
| `InMemoryStorage<User>`, `InMemoryStorage<Product>` 인스턴스 + 추가/조회 | 02 · 3단계 셀 | |
| `getById` 의 `undefined` 안전 처리 | 02 · 4단계 셀 | `!== undefined` 확인, `?.` + `??` |
| `getAll` 복사본 검증 | 02 · 5단계 셀 | 복사본 5개 / 원본 4개 |
| `any` 미사용 | 전체 | |
| 모든 셀 실행 결과 저장 | 두 노트북 모두 | tslab 커널로 실행 후 저장 |
