// ⚠️ threshold 단일 출처(Single Source of Truth).
//    프론트/AI/ZK 어디서든 여기서 import. 숫자 하드코딩 금지.
//
// 출처:
//  - 2026 기준 중위소득: 보건복지부 고시 제2025-135호
//  - 대구 청년월세 지원사업: 대구광역시 2026.3.25 발표
//  - 청년 임차보증금 대출이자 지원: anbang.daegu.go.kr (2026 하반기 공고)

import type { UserProfile } from "./types";

/**
 * 2026년 기준 중위소득 (월, 원)
 * 출처(1차 자료): 보건복지부 고시 제2025-135호 — 1~4인 가구 금액 확인 완료.
 */
export const MEDIAN_INCOME_2026: Record<number, number> = {
  1: 2_564_238,
  2: 4_199_292,
  3: 5_359_036,
  4: 6_494_738,
  // TODO: 5인 이상 가구 수치 미확인. 데모는 1~4인만 다룸.
};

/** 소득 기준 산정 방식 */
export type IncomeBasis =
  | { type: "median_ratio"; ratio: number }      // 중위소득 N% 이하
  | { type: "fixed_monthly"; amount: number };   // 월 소득 고정 상한

export interface PolicyCriteria {
  minAge: number;
  maxAge: number;
  incomeBasis: IncomeBasis;
  maxRent: number | null;      // null = 기준 없음
  maxDeposit: number | null;
  requireNoOwnHouse: boolean;
  requireHouseholdHead: boolean;
}

export interface Policy {
  id: string;                  // ZK 회로 매핑 키. 절대 변경 금지
  name: string;
  authority: string;
  description: string;
  benefit: string;
  sourceUrl: string;
  criteria: PolicyCriteria;
  excludedIf: string[];        // AI 진단 설명용 (ZK 대상 아님)
}

export const POLICIES: Policy[] = [
  {
    id: "daegu-youth-rent",
    name: "대구 청년월세 지원사업",
    authority: "대구광역시",
    description: "부모와 별도 거주하는 무주택 청년의 월세를 지원합니다.",
    benefit: "월 최대 20만원 / 최대 24개월 (총 480만원)",
    sourceUrl: "https://www.bokjiro.go.kr/",
    criteria: {
      minAge: 19,
      maxAge: 34,
      // 소득 기준(중위 60%)은 대구광역시 청년월세 지원사업 공고 원문으로 확인 완료.
      incomeBasis: { type: "median_ratio", ratio: 0.6 },
      // 보증금·월세 상한 미적용: 대구시 2026 청년월세 지원사업 공고에서
      // 해당 요건이 확인되지 않음. 기존 값(보증금 5천만원/월세 70만원)은
      // 국토교통부 청년월세 특별지원의 옛 전국 기준과 일치했으나, 그 전국
      // 사업조차 2026년 2차 사업부터 이 요건이 폐지된 것으로 조사됨.
      // 확인되지 않은 요건으로 자격자를 탈락시키는 것보다 적용하지 않는
      // 쪽이 안전하다고 판단해 null(기준 없음) 처리.
      maxRent: null,
      maxDeposit: null,
      requireNoOwnHouse: true,
      requireHouseholdHead: false,
    },
    excludedIf: [
      "주택 소유자 (분양권·입주권 포함)",
      "공공임대주택 거주자",
      "2촌 이내 혈족 소유 주택 임차자",
      "기존 청년월세 지원 24회 전액 수급자",
    ],
  },
  {
    id: "daegu-youth-deposit-loan",
    name: "청년 주택 임차보증금(전월세) 대출이자 지원",
    authority: "대구광역시",
    description: "전세자금 대출 이자의 일부를 대구시가 지원합니다.",
    benefit: "대출금리 최대 연 3.5% 지원 (본인 최저 1.5% 부담), 한도 1억원",
    sourceUrl: "https://anbang.daegu.go.kr/jeonseMonthly/businessOverView.do",
    criteria: {
      minAge: 19,
      maxAge: 39,
      // 연소득 6천만원 이하 → 월 환산 500만원
      incomeBasis: { type: "fixed_monthly", amount: 5_000_000 },
      maxRent: null,
      maxDeposit: 250_000_000,
      requireNoOwnHouse: true,
      requireHouseholdHead: true,
    },
    excludedIf: [
      "주거급여 수급자 (배우자 포함)",
      "타 정부·지자체 주거지원 사업 참여자",
      "공공임대주택 거주자",
    ],
  },
];

export function getPolicy(policyId: string): Policy {
  const p = POLICIES.find((x) => x.id === policyId);
  if (!p) throw new Error(`Unknown policyId: ${policyId}`);
  return p;
}

/** 가구원 수를 반영한 월 소득 상한(원). ZK public input의 원천. */
export function resolveIncomeThreshold(
  policyId: string,
  householdSize: number
): number {
  const { incomeBasis } = getPolicy(policyId).criteria;

  if (incomeBasis.type === "fixed_monthly") return incomeBasis.amount;

  const median = MEDIAN_INCOME_2026[householdSize];
  if (!median) throw new Error(`중위소득 미정의 가구원 수: ${householdSize}`);
  // 판정이 "이하" 비교이므로 절사가 더 보수적(엄격)이다.
  return Math.floor(median * incomeBasis.ratio);
}

/**
 * ZK 회로에 넣을 public input.
 * ⚠️ 시그니처 변경됨 — householdSize 인자 추가. ZK 담당에게 공유 필요.
 * ⚠️ app/api/verify/route.ts 가 아직 구버전 시그니처(인자 1개)로 호출 중 — 그쪽 수정 필요.
 */
export function getZKPublicInputs(policyId: string, householdSize: number) {
  const { minAge, maxAge } = getPolicy(policyId).criteria;
  return {
    minAge,
    maxAge,
    incomeThreshold: resolveIncomeThreshold(policyId, householdSize),
  };
}

/** 평문 자격 판정 (AI 진단용). ZK 증명 결과와 항상 일치해야 함. */
export function checkEligibility(profile: UserProfile, policyId: string) {
  const c = getPolicy(policyId).criteria;
  const reasons: string[] = [];
  const missing: string[] = [];

  if (profile.age >= c.minAge && profile.age <= c.maxAge) {
    reasons.push(`연령 ${c.minAge}~${c.maxAge}세 요건 충족`);
  } else {
    missing.push(`연령 요건 미충족 (${c.minAge}~${c.maxAge}세)`);
  }

  const threshold = resolveIncomeThreshold(policyId, profile.householdSize);
  if (profile.monthlyIncome <= threshold) {
    reasons.push(`소득 요건 충족 (상한 ${threshold.toLocaleString()}원)`);
  } else {
    missing.push(`월 소득 상한 ${threshold.toLocaleString()}원 초과`);
  }

  if (c.maxRent !== null) {
    if (profile.monthlyRent <= c.maxRent) reasons.push("월세 요건 충족");
    else missing.push("월세 상한 초과");
  }

  if (c.maxDeposit !== null) {
    if (profile.deposit <= c.maxDeposit) reasons.push("보증금 요건 충족");
    else missing.push("보증금 상한 초과");
  }

  if (c.requireNoOwnHouse) {
    if (!profile.hasOwnHouse) reasons.push("무주택 요건 충족");
    else missing.push("무주택 요건 미충족");
  }

  if (c.requireHouseholdHead) {
    if (profile.isHouseholdHead) reasons.push("세대주 요건 충족");
    else missing.push("세대주 요건 미충족");
  }

  return { eligible: missing.length === 0, reasons, missing };
}