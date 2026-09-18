// 현재는 mock. snarkjs 연동으로 내부만 교체해야 함.

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

  // ===== MOCK 시작 (교체할 구간) =====
  // 실제 구현 예정:
  //   const { proof, publicSignals } = await groth16.fullProve(
  //     input, "/zk/eligibility.wasm", "/zk/eligibility_final.zkey"
  //   );
  await new Promise((r) => setTimeout(r, 2000)); // 증명 생성 체감 시간

  const isEligible =
    input.age >= input.minAge &&
    input.age <= input.maxAge &&
    input.income <= input.incomeThreshold;

  const proof = { __mock: true, protocol: "groth16", curve: "bn128" };
  const publicSignals = [
    isEligible ? "1" : "0",
    String(input.minAge),
    String(input.maxAge),
    String(input.incomeThreshold),
  ];
  // ===== MOCK 끝 =====

  return {
    proof,
    publicSignals,
    policyId,
    createdAt: new Date().toISOString(),
  };
}