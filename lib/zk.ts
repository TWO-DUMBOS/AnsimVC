// snarkjs(Groth16)로 브라우저에서 증명을 생성한다. 회로: circuits/eligibility.circom
// 산출물은 public/zk/ 에서 정적 파일로 서빙된다.

import type { ZKInput, ZKProofBundle } from "./types";
import { getZKPublicInputs } from "./policies";

/**
 * 브라우저에서 ZK 증명을 생성한다.
 * @param profileSecrets 사용자만 아는 값 (서버로 전송 금지)
 * @param policyId       lib/policies.ts의 Policy.id
 */
export async function generateProof(
  profileSecrets: { age: number; income: number; householdSize: number },
  policyId: string
): Promise<ZKProofBundle> {
  const pub = getZKPublicInputs(policyId, profileSecrets.householdSize);

  const input: ZKInput = {
    age: profileSecrets.age,
    income: profileSecrets.income,
    ...pub,
  };

  // snarkjs는 서버 번들에 들어가면 안 되므로 호출 시점에 동적 import (브라우저 전용)
  // @ts-expect-error snarkjs는 타입 선언이 없다
  const { groth16 } = await import("snarkjs");

  // 회로 signal 이름 = ZKInput 필드명. 값은 문자열로 넘긴다.
  const circuitInput = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, String(v)])
  );

  const { proof, publicSignals } = await groth16.fullProve(
    circuitInput,
    "/zk/eligibility.wasm",
    "/zk/eligibility_final.zkey"
  );

  return {
    proof,
    publicSignals, // [isEligible, minAge, maxAge, incomeThreshold]
    policyId,
    createdAt: new Date().toISOString(),
  };
}
