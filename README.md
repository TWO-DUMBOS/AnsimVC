# AnsimVC(안심VC)
민감정보 노출 없이 복지·정책금융 자격을 확인하는 플랫폼

## 📌 프로젝트 개요
- 복지·정책금융 신청 시마다 소득·주거 등 개인정보를 반복 제출해야 하는 번거로움과 유출 위험 존재
- 원본 데이터 노출 방식이라 자격 검증 신뢰성 확보와 부정수급 방지에 한계
- DID/VC로 자격을 재사용하고 ZK-Proof로 데이터 비공개 증명을 결합해 해결
> MVP 범위:
시간 제약으로 RAG/Vector DB, 실제 스마트컨트랙트 배포, 부정수급 중복체크는 이번 범위에서 제외했고 본선 고도화 계획에 포함되어 있습니다.

## 💡 주요 기능
- **개인정보 비공개 자격 진단**
<br/>7개 필드(나이·대구거주·무주택·부모별도거주·보증금·월세·연소득) 입력만으로 AI가 복지 정책 2종에 대한 자격 여부를 즉시 판정

- **DID/VC 기반 자격 재사용**
<br/>진단 결과를 DID/VC 표준 형식의 JSON으로 발급하고 JWT 서명을 붙여, 매번 서류를 새로 제출하지 않아도 자격을 재사용 가능

- **ZK-Proof로 소득 비공개 증명**
<br/>실제 나이·소득 값을 공개하지 않고도 "정책 기준 연령·소득 요건을 충족한다"는 사실만 Circom 기반 ZK 회로(Groth16)로 브라우저에서 증명

- **온체인 검증 확장 가능성 실험**
<br/>Groth16 검증 컨트랙트(Verifier.sol)로 온체인 검증으로의 확장 가능성을 실험했습니다. MVP에서는 서버 API 검증(`/api/verify`)으로 대체했습니다.

## 🔐 ZK 회로 설명
정책 자격 조건 중 "연령·소득이 기준을 충족하는지"를 실제 나이·소득 값을 노출하지 않고 증명하기 위해 Circom 회로를 사용합니다.

- **회로 로직**: circomlib의 `GreaterEqThan`/`LessEqThan` 템플릿으로 `minAge ≤ age ≤ maxAge`와 `income ≤ incomeThreshold`를 동시에 증명합니다. 나이(`age`)와 소득(`income`)은 private input, 정책의 연령·소득 기준(`minAge`, `maxAge`, `incomeThreshold`)은 public input으로 분리되어 있어, 검증자는 조건 충족 여부(`isEligible`)만 확인할 뿐 나이·소득 원본 값은 알 수 없습니다.
- **증명 시스템**: Groth16 (snarkjs 0.7)
- **증명 흐름**:
  1. 브라우저에서 `groth16.fullProve()`를 호출해 proof와 public signals를 생성
  2. 생성된 proof를 `/api/verify`로 전송
  3. 서버에서 `groth16.verify()`로 proof를 검증하고, publicSignals가 서버가 아는 정책 기준과 일치하는지 대조한 뒤 결과 반환
- **회로 산출물**: 컴파일된 `eligibility.wasm`, `eligibility_final.zkey`, `verification_key.json`을 `public/zk/`에 포함해두어, 별도 회로 컴파일 없이 바로 실행됩니다.

## 🛠️ 기술스택
| 구분 | 기술 |
| :--- | :--- |
| **언어** | TypeScript |
| **프레임워크** | Next.js 16 (APP Router) |
| **UI** | React 19, Tailwind CSS 4 |
| **DID/VC** | Node.js 내장 crypto (Ed25519) |
| **ZK-Proof** | circom 2.0, circomlib, snarkjs 0.7 (Groth16) |
| **온체인 확장** | Solidity (Verifier.sol) |
| **AI** | OpenAI API (gpt-5.6-luna) |
| **데이터 저장** | 브라우저 sessionStorage |
| **데이터셋** | 자체 정의 정책 기준값 (lib/policies.ts) |
<img width="700" height="550" alt="AVC-architecture" src="https://github.com/user-attachments/assets/c88935ba-1465-455c-90f3-f7fec7903767" />

## ☺️ 팀원

|ZK / Verification|AI / Frontend|
|:-:|:-:|
|<img src="https://avatars.githubusercontent.com/u/233681751?v=4" width="150" height="150"/>|<img src="https://avatars.githubusercontent.com/u/164824197?v=4" width="150" height="150"/>|
|[김민주](https://github.com/minjukim9202-ui)|[김지현](https://github.com/jihyun132)|

## ⌛️ 실행
```bash
# 1. 저장소 클론
git clone <repo-url>
cd AnsimVC

# 2. 패키지 설치
npm install

# 3. 환경 변수 설정 (.env.local)
OPENAI_API_KEY=your_openai_api_key

# 4. 개발 서버 실행
npm run dev
```
