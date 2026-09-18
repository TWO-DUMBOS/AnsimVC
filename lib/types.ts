// ===== 사용자 프로필 (AI 자격진단 입력) =====
export interface UserProfile {
  age: number;
  monthlyIncome: number;    // 원 단위 (월 소득)
  householdSize: number;    // 가구원 수
  region: string;           // 예: "대구광역시 북구"
  isHouseholdHead: boolean; // 세대주 여부
  monthlyRent: number;      // 원
  deposit: number;          // 원 (보증금)
  hasOwnHouse: boolean;     // 무주택 여부 판단용
}

// ===== 정책 정의 =====
// Policy / PolicyCriteria는 lib/policies.ts 에 정의되어 있다 (가구원 수 기반
// incomeBasis 구조로 확장됨). 여기서는 정의하지 않는다 — 두 곳에 다른 모양으로
// 중복 정의되어 있던 걸 정리함.

// ===== AI 진단 결과 =====
export interface PolicyMatch {
  policyId: string;
  policyName: string;
  eligible: boolean;
  score: number;            // 0~100 적합도
  reasons: string[];        // 통과 근거
  missing: string[];        // 미달 항목
}

export interface DiagnoseRequest {
  profile: UserProfile;
}

export interface DiagnoseResponse {
  matches: PolicyMatch[];
  summary: string;          // AI 생성 요약문
  generatedAt: string;      // ISO 8601
}

// ===== ZK =====
/**
 * ZK 회로 입력
 * private  : age, income                      (사용자 브라우저 밖으로 절대 안 나감)
 * public   : minAge, maxAge, incomeThreshold  (lib/policies.ts에서 주입)
 */
export interface ZKInput {
  age: number;
  income: number;
  minAge: number;
  maxAge: number;
  incomeThreshold: number;
}

/**
 * ⚠️ publicSignals 순서 고정 — 반드시 확인할 것
 * [0] isEligible (1 | 0)   ← circom main의 output
 * [1] minAge
 * [2] maxAge
 * [3] incomeThreshold
 */
export interface ZKProofBundle {
  proof: unknown;           // snarkjs Groth16 proof 객체
  publicSignals: string[];
  policyId: string;
  createdAt: string;
}

export interface VerifyRequest {
  policyId: string;
  proof: unknown;
  publicSignals: string[];
}

export interface VerifyResponse {
  valid: boolean;
  policyId: string;
  checkedAt: string;
  error?: string;
}