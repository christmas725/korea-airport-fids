# 대한민국 국내공항 통합 FIDS

인천공항과 대구공항에서 별도로 운영하던 FIDS를 하나의 Next.js 프로젝트로 통합하고, 대한민국 15개 민간공항으로 확장하기 위한 프로젝트입니다.

## 현재 제공

- 국내공항 선택 허브와 지역별 공항 분류
- 인천국제공항(ICN) 출발 FIDS
- 대구국제공항(TAE) 출발·도착 FIDS
- 나머지 13개 공항의 구현 준비중 화면
- 모바일·폴더블·데스크톱 반응형 화면
- 설치형 PWA

## 공항 분류

- 수도권: 인천(ICN), 김포(GMP)
- 충청권: 청주(CJJ)
- 강원권: 양양(YNY), 원주(WJU)
- 영남권: 김해(PUS), 대구(TAE), 울산(USN), 사천(HIN), 포항경주(KPO)
- 호남권: 광주(KWJ), 여수(RSU), 무안(MWX), 군산(KUV)
- 제주권: 제주(CJU)

## 경로

- `/`: 국내공항 선택
- `/airports/icn`: 인천공항 출발 FIDS
- `/airports/tae`: 대구공항 출발·도착 FIDS
- `/airports/{iata}`: 미구현 공항 준비중 안내
- `/api/airports/icn/flights`: 인천공항 운항정보
- `/api/airports/tae/flights?mode=departures|arrivals`: 대구공항 운항정보

## 환경변수

```env
INCHEON_API_KEY=공공데이터포털_인천국제공항공사_API_키
KAC_API_KEY=공공데이터포털_한국공항공사_API_키
FIDS_DEMO_MODE=false
```

실제 인증키는 저장소에 올리지 않고 Vercel의 Production·Preview 환경변수로 관리합니다.

## 실행

```bash
npm install
npm run dev
```

## 데이터 구조

인천공항은 인천공항 공식 홈페이지 피드를 우선 사용하고 관련 OpenAPI로 보강합니다. 대구공항은 한국공항공사 실시간 항공기 운항정보 GW를 사용하며, 실패 시 공식 홈페이지와 데모 데이터를 단계적으로 사용합니다.

## 개별 FIDS 업데이트 동기화

통합 저장소의 `Sync airport FIDS sources` 작업이 6시간마다 인천·대구 개별 저장소의 `main`을 확인합니다.

- 인천: `christmas725/icn_fids`
- 대구: `christmas725/tae_fids`
- 동기화 대상: 공항별 화면, 스타일, API, 운항정보 타입·번역 데이터
- 보호 대상: 통합 홈, 공항 분류, 공통 레이아웃, 환경변수, PWA 설정

변경사항이 있으면 통합 경로에 맞게 import와 API 주소를 변환하고 빌드 검증을 거친 뒤 자동으로 PR을 생성합니다. 운영 사이트에는 PR의 Vercel Preview를 확인하고 `main`에 병합한 뒤 반영됩니다. 이미 열린 동기화 PR이 있으면 중복 PR을 만들지 않습니다.

필요할 때는 GitHub Actions에서 수동 실행하거나 로컬에서 다음 명령을 사용할 수 있습니다.

```bash
npm run sync:airports
npm run build
```
