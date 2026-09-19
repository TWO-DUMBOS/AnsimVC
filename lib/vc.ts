import { randomUUID } from "crypto";
import type { UserProfile } from "./types";

// 데모용 발급기관 DID. 실제 DID 레지스트리나 블록체인에 앵커링하지 않는
// 자체 정의 DID 메서드(did:ansimvc)를 쓴다 — 실제 스마트컨트랙트 배포는 MVP 범위 밖.
const ISSUER_DID = "did:ansimvc:issuer:welfare-platform";

// ===== VC 데이터 모델 (W3C Verifiable Credentials 형태를 따름) =====
export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string; // 보유자(holder) DID — 로그인이 없어 발급 시점에 임시로 생성
    age: number;
    region: string;
    householdSize: number;
    isHouseholdHead: boolean;
    monthlyIncome: number;
    monthlyRent: number;
    deposit: number;
    hasOwnHouse: boolean;
  };
}

/** 자격 입력값(UserProfile)을 DID/VC 표준 형태의 자격증명 JSON으로 변환한다. */
export function issueVC(profile: UserProfile): VerifiableCredential {
  const holderDid = `did:ansimvc:holder:${randomUUID()}`;

  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:${randomUUID()}`,
    type: ["VerifiableCredential", "WelfareEligibilityCredential"],
    issuer: ISSUER_DID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: holderDid,
      age: profile.age,
      region: profile.region,
      householdSize: profile.householdSize,
      isHouseholdHead: profile.isHouseholdHead,
      monthlyIncome: profile.monthlyIncome,
      monthlyRent: profile.monthlyRent,
      deposit: profile.deposit,
      hasOwnHouse: profile.hasOwnHouse,
    },
  };
}
