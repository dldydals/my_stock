📈 My Stock Portfolio Manager
개인 주식 자산 관리 및 AI 기반 투자 전략 모니터링 애플리케이션입니다. Next.js 15(App Router) 기반의 프런트엔드와 FastAPI(Python) 기반의 AI 분석 백엔드가 유기적으로 연동되며, PostgreSQL의 Trigger 기능을 활용해 데이터 무결성을 보장합니다.

🚀 주요 기능
🤖 AI 주식 분석: Gemini API를 활용하여 보유 종목 및 관심 종목에 대한 매일/실시간 투자 리포트 생성

⚡ 자동 자산 동기화 (DB Trigger): 매수/매도 내역 입력 시, PostgreSQL 트리거가 작동하여 보유 수량, 평균 단가, 실현 손익, 현금 잔고를 자동으로 계산 및 갱신

📊 실시간 대시보드: 자산 배분(Pie Chart), 일간 수익률, 투자 원금 대비 성과 분석

🪟 Cross-Platform 지원: run-script-os를 도입하여 Windows(CP949 인코딩 이슈 해결)와 Linux/Mac 환경 어디서든 원클릭 실행 가능

🛠️ 기술 스택 (Tech Stack)
Frontend: Next.js 15 (App Router), TypeScript, Ant Design, Tailwind CSS

Backend: Python 3.9+, FastAPI, Google Gemini API

Database: PostgreSQL, Prisma ORM (with Raw SQL Triggers)

Deployment: Vercel (FE) / Render (BE) recommended

📦 설치 및 설정 (Setup)
1. 프로젝트 클론
Bash
git clone -b db https://github.com/dldydals/my-stock.git
cd my-stock
2. 패키지 설치
Windows 환경에서의 속도 이슈 해결을 위해 pnpm 사용을 권장하지만 npm도 무방합니다.

Bash
npm install
# 또는
pnpm install
3. 환경 변수 설정 (.env)
프로젝트 루트 디렉토리에 .env 파일을 생성하고 다음 내용을 입력합니다:

코드 스니펫
DATABASE_URL="postgresql://사용자명:비밀번호@localhost:5432/my_stock?schema=public"
GOOGLE_API_KEY="[본인의_GEMINI_API_KEY]"
4. DB 마이그레이션 (중요!)
이 프로젝트는 SQL Function 및 Trigger를 사용하므로, 단순 push가 아닌 migrate 명령어를 사용해야 합니다.

Bash
npx prisma migrate dev
초기 설정 시 DB가 초기화될 수 있습니다.

5. 백엔드(Python) 가상환경 설정
Windows (PowerShell):

PowerShell
cd python
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
cd ..
Linux / macOS:

Bash
cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
▶️ 실행 방법 (Usage)
OS(Windows/Linux/Mac)를 자동으로 감지하여 최적화된 명령어로 실행합니다. (Windows의 경우 인코딩 문제 해결을 위해 set PYTHONIOENCODING=utf-8이 자동 적용됩니다.)

Bash
npm run mystock
Frontend: http://localhost:3000

Backend API: http://localhost:8000 (Docs: /docs)

📂 프로젝트 구조
app/: Next.js 15 App Router 기반 페이지 (API Routes 포함)

components/: 대시보드 차트 및 UI 컴포넌트

prisma/: DB 스키마 및 SQL Migration (Trigger 포함)

python/: 주가 수집 및 AI 리포트 생성용 FastAPI 서버 (3.10 이 안정적 입니다.)

package.json: run-script-os를 이용한 크로스 플랫폼 실행 스크립트 정의

⚠️ 트러블슈팅 (Troubleshooting)
Q. DB에 데이터는 들어갔는데 자산(Assets)이 업데이트되지 않아요. A. 이 프로젝트는 DB 트리거를 사용합니다. npx prisma db push 대신 반드시 **npx prisma migrate dev**를 실행하여 트리거 함수가 DB에 생성되었는지 확인하세요.

Q. Windows에서 npm install이나 삭제가 너무 느려요. A. Windows Defender의 실시간 감시 제외 폴더에 프로젝트 폴더를 등록하거나, rimraf node_modules 명령어를 사용해 보세요.

📝 라이센스
이 프로젝트는 MIT 라이센스를 따릅니다.