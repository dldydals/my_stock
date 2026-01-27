# My Stock Portfolio Manager

개인 주식 자산 관리 및 투자 전략 모니터링 애플리케이션입니다. 
Next.js 기반의 프런트엔드와 FastAPI 기반의 백엔드(Python)가 긴밀하게 협력하며, PostgreSQL을 사용하여 데이터를 관리합니다.

## 🚀 주요 기능

- **자산 관리**: 보유 종목 및 현금 자산(예수금/CMA) 관리, 실시간 수익률 계산
- **자본 흐름 관리**: 입출금 내역 기반의 실질 '순 투자 원금' 및 투자 효율성 트래킹
- **투자 인사이트**: 분산 투자 점수 및 현금 비중 리포트 등 실시간 포트폴리오 정밀 분석
- **거래 내역**: 종목별 매수/매도 이력 및 실현 손익 상세 조회

## 🛠️ 사전 요구 사항 (Prerequisites)

이 프로젝트를 실행하기 위해 다음 도구들을 사전에 설치해 주세요:

- **Node.js** (v18 이상)
- **Python** (v3.9 이상)
- **PostgreSQL** (데이터베이스 서버)

## 📦 설치 및 설정 (Setup)

### 1. 프로젝트 클론
```bash
git clone https://github.com/dldydals/my-stock.git
cd my-stock
```

### 2. 환경 변수 설정 (.env)
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 입력합니다:

```env
DATABASE_URL="postgresql://사용자명:비밀번호@localhost:5432/데이터베이스명?schema=public"
```

### 3. 프론트엔드 설치 및 DB 셋업
```bash
npm install
npx prisma db push   # DB 스키마 생성 및 동기화
```

### 4. 백엔드(Python) 의존성 설치
**Windows (PowerShell/CMD):**
```bash
cd python
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
cd ..
```

**Linux / macOS:**
```bash
cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

## ▶️ 실행 방법 (Usage)

프론트엔드와 백엔드를 한 번에 실행하려면 다음 명령어를 사용하세요:

```bash
npm run mystock
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`

> [!TIP]
> Windows에서 실행 시, `npm run mystock`이 제대로 작동하지 않는다면 별도의 터미널 2개를 열어 각각 `npm run dev`와 `npm run python-api`를 실행해 주세요.

## 📂 프로젝트 구조

- `app/`: Next.js App Router 기반 페이지 구성
- `components/`: 대시보드 및 각종 UI 컴포넌트
- `prisma/`: 데이터베이스 스키마 및 마이그레이션 정의
- `python/`: 주가 정보 수집 및 분석용 FastAPI 백엔드
- `scripts/`: 데이터 마이그레이션 및 관리용 스크립트

## 📝 라이센스

이 프로젝트는 [MIT 라이센스](./LICENSE)를 따릅니다.
