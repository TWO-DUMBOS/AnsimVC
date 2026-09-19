import { generateKeyPairSync, randomUUID, sign, verify } from "crypto";
import type { UserProfile } from "./types";

// 데모용 발급기관 DID. 실제 DID 레지스트리나 블록체인에 앵커링하지 않는
// 자체 정의 DID 메서드(did:ansimvc)를 쓴다 — 실제 스마트컨트랙트 배포는 MVP 범위 밖.
const ISSUER_DID = "did:ansimvc:issuer:welfare-platform";

// 발급기관 서명키(Ed25519). DB가 없어 서버 프로세스 메모리에만 둔다 —
// 새 npm 패키지 없이 Node 내장 crypto로 실제 서명/검증을 수행한다.
// (프로세스 재시작하면 키가 바뀌어 이전 JWT는 검증 실패한다. 데모 세션 동안만 유효)
const issuerKeyPair = generateKeyPairSync("ed25519");

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

// ===== JWT 서명 (VC-JWT) =====
export interface SignedVC {
  vc: VerifiableCredential;
  jwt: string; // "header.payload.signature" 형태의 compact JWT
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/** 발급된 VC에 발급기관 개인키(Ed25519)로 JWT 서명을 붙인다. */
export function signVC(vc: VerifiableCredential): SignedVC {
  const header = { alg: "EdDSA", typ: "JWT" };
  const payload = {
    iss: vc.issuer,
    sub: vc.credentialSubject.id,
    nbf: Math.floor(new Date(vc.issuanceDate).getTime() / 1000),
    jti: vc.id,
    vc,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign(null, Buffer.from(signingInput), issuerKeyPair.privateKey);

  return { vc, jwt: `${signingInput}.${base64url(signature)}` };
}

/** 자격 입력값(UserProfile)에서 VC 발급 + JWT 서명까지 한 번에 처리한다. */
export function issueSignedVC(profile: UserProfile): SignedVC {
  return signVC(issueVC(profile));
}

/** (검증용) 발급기관 공개키로 VC-JWT 서명이 유효한지 확인한다. */
export function verifyVCJwt(jwt: string): boolean {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false;

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  try {
    return verify(null, Buffer.from(signingInput), issuerKeyPair.publicKey, base64urlDecode(encodedSignature));
  } catch {
    return false;
  }
}
