@AGENTS.md
# AnsimVC — Claude Code 작업 규칙

DID/VC + ZK-Proof + AI 기반 복지 자격증명 플랫폼. iM뱅크 AI Blockchain 경진대회 서류심사 제출용.
**마감: 9/20(일) 12:00. 이틀짜리 데모 프로토타입이다. 완성도보다 "끝까지 돌아가는 것"이 우선.**

## 절대 바꾸지 말 것 (팀원 코드가 깨짐)

- `lib/types.ts` 의 인터페이스 정의 — 두 사람이 공유하는 계약이다. 필드 추가/이름 변경 금지.
- `lib/zk.ts` 의 `generateProof(input: ZKInput): Promise<ZKProofBundle>` 시그니처
- `app/api/verify/route.ts` 의 요청/응답 타입 (`VerifyRequest` / `VerifyResponse`)
- 위 세 개는 **내부 구현만** 교체 가능. 입출력 모양은 고정.
- 변경이 꼭 필요해 보이면 코드를 고치지 말고 **먼저 사용자에게 물어볼 것.**

## 아키텍처 규칙

- **별도 백엔드 서버를 만들지 마라.** Express/FastAPI/Nest 제안 금지. 모든 API는 Next.js App Router의 `app/api/*/route.ts`.
- 정책 기준값(threshold)은 `lib/policies.ts` 에만 존재한다. 다른 파일에 숫자를 하드코딩하지 마라.
- DB 없음. 인증 없음. 상태는 클라이언트 메모리 또는 sessionStorage.

## 스택 (고정)

Next.js App Router / TypeScript / Tailwind CSS / OpenAI API / snarkjs + circom

**새 npm 패키지 설치는 사용자 승인 후에만.** 특히 상태관리 라이브러리, UI 컴포넌트 라이브러리, ORM 추가 금지.

## 파일 소유권 (서로 영역 건드리지 말 것)

- 담당자A (AI/프론트/DID): `app/eligibility`, `app/diagnosis`, `app/result`, `app/api/diagnose/`, `lib/vc.ts`
- 담당자B (ZK/검증): `app/proof`, `lib/zk.ts` 내부, `app/api/verify/` 내부, `circuits/`, `public/zk/`
- 공유: `lib/types.ts`, `lib/policies.ts` (수정 전 상대에게 알릴 것)

## MVP 범위 밖 (제안하지 마라)

RAG / Vector DB / LangChain, 실제 스마트컨트랙트 배포, 로그인·회원가입, 반응형·다크모드,
테스트 코드, CI/CD, 부정수급 중복체크 실제 로직(`duplicateBenefitFlag`는 false 고정)

## 코드 스타일

- 데모용이다. 추상화 레이어, 제네릭, 커스텀 훅 남발 금지. 직관적이고 짧게.
- 한 파일에 몰아넣어도 된다. 파일 쪼개기보다 동작을 우선.
- 에러 처리는 "화면이 안 죽는 수준"까지만. try/catch + 안내 문구면 충분.
- 주석과 UI 문구는 한국어.

## 데모 시나리오 (이 입력으로 항상 테스트)

나이 26 / 대구거주 O / 무주택 O / 부모와 별도거주 O / 보증금 3,000만원 / 월세 40만원 / 연소득 3,000만원
→ 기대 결과: **정책A(대구 청년월세) 미달 · 정책B(전월세 대출이자) 통과**
AI 필터링이 실제로 작동함을 보여주기 위한 의도적 설계다. 이 결과가 바뀌면 안 된다.

## 응답 언어

한국어로 답할 것.