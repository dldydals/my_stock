# My Stock Portfolio Manager

개인 주식 자산 관리 및 투자 전략 모니터링 애플리케이션입니다. Next.js 기반의 프론트엔드와 FastAPI 기반의 백엔드(Python)로 구성되어 있습니다.

## 🚀 주요 기능

- **자산 관리**: 보유 종목 및 현금 자산 관리, 실시간 수익률 계산
- **투자 전략**: RSI, 외국인/기관 수급 분석을 통한 매수/매도 신호 알림
- **시뮬레이션**: 매수/매도 시나리오에 따른 손익 시뮬레이션 (What-If)

## 🛠️ 사전 요구 사항 (Prerequisites)

이 프로젝트를 실행하기 위해서는 다음 도구들이 설치되어 있어야 합니다:

- **Node.js** (v18 이상 권장)
- **Python** (v3.9 이상 권장)

## 📦 설치 방법 (Installation)

### 1. 프로젝트 클론

```bash
git clone https://github.com/dldydals/my-stock.git
cd my-stock
```

### 2. 프론트엔드 의존성 설치

```bash
npm install
```

### 3. 백엔드(Python) 의존성 설치

Python 가상환경을 생성하고 필요한 라이브러리를 설치하는 것을 권장합니다.

**Windows (PowerShell):**

```powershell
# 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화
.\venv\Scripts\Activate

# 패키지 설치
pip install -r python/requirements.txt
```

**Linux / macOS:**

```bash
# 가상환경 생성 (최초 1회)
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# 패키지 설치
pip install -r python/requirements.txt
```

#### 📄 필요한 Python 라이브러리 (`python/requirements.txt`)
- `fastapi`: API 서버 프레임워크
- `uvicorn`: ASGI 서버
- `pykrx`: 한국 주식 시장 데이터 수집
- `pandas`, `numpy`: 데이터 분석 및 처리
- `requests`: HTTP 요청

## ▶️ 실행 방법 (Usage)

이 프로젝트는 `concurrently`와 `run-script-os`를 사용하여 Windows와 Linux 환경 모두에서 하나의 명령어로 프론트엔드와 백엔드를 동시에 실행할 수 있도록 구성되어 있습니다.

### 📚 사용자 매뉴얼
자세한 기능 사용법과 투자 전략 알림에 대한 설명은 [사용자 매뉴얼 (USER_MANUAL.md)](./USER_MANUAL.md)을 참고하세요.

### 통합 실행 (추천)

```bash
npm run mystock
```

위 명령어를 실행하면 다음 작업이 동시에 수행됩니다:
1.  **Frontend**: Next.js 개발 서버 실행 (`http://localhost:3000`)
2.  **Backend**: OS 환경(Windows/Linux)을 감지하여 적절한 Python API 서버 실행 (`http://localhost:8000`)

### 개별 실행

따로 실행하고 싶다면 다음 명령어들을 각각의 터미널에서 실행하세요.

**Frontend:**
```bash
npm run dev
```

**Backend:**
```bash
# OS에 맞는 스크립트가 자동으로 실행됩니다.
npm run python-api
```

## 📂 프로젝트 구조

- `app/`: Next.js App Router 기반 프론트엔드 소스
- `components/`: UI 컴포넌트 (대시보드, 모달 등)
- `python/`: FastAPI 백엔드 소스 및 데이터 분석 로직 (`stock_api.py`)
- `data/`: 보유 주식 및 현금 데이터 저장소 (`.json` 파일)

## 📝 라이센스

This project is [MIT licensed](./LICENSE).
