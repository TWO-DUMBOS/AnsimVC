import { NextResponse } from "next/server";
import type { VerifyRequest, VerifyResponse } from "@/lib/types";
import { getPolicy, resolveIncomeThreshold } from "@/lib/policies";
// 검증키는 공개 파일이다 (브라우저용 산출물과 같은 파일). 번들에 포함시켜 배포 환경의 파일 경로에 의존하지 않는다.
import vKey from "@/public/zk/verification_key.json";
// @ts-expect-error snarkjs는 타입 선언이 없다
import { groth16 } from "snarkjs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { policyId, proof, publicSignals } = body;

    if (!policyId || !Array.isArray(publicSignals)) {
      return NextResponse.json<VerifyResponse>(
        {
          valid: false,
          policyId: policyId ?? "",
          checkedAt: new Date().toISOString(),
          error: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    const respond = (valid: boolean, error?: string) =>
      NextResponse.json<VerifyResponse>({
        valid,
        policyId,
        checkedAt: new Date().toISOString(),
        ...(error ? { error } : {}),
      });

    // 1) 암호학적 검증: proof가 검증키 + publicSignals 에 대해 유효한가
    let proofOk = false;
    try {
      proofOk = await groth16.verify(vKey, publicSignals, proof);
    } catch {
      proofOk = false; // 모양이 깨진 proof/publicSignals
    }
    if (!proofOk) return respond(false, "INVALID_PROOF");

    // 2) 증명이 맞아도 publicSignals가 서버가 아는 정책 기준과 일치하는지 반드시 대조해야 함
    //    (사용자가 임의의 기준값으로 만든 증명을 막는다)
    //
    // ⚠️ incomeThreshold는 가구원 수(householdSize)에 따라 달라지는데,
    //    VerifyRequest에는 householdSize가 없어 정확한 값을 알 수 없다.
    //    데모 지원 범위인 1~4인 가구 threshold 중 하나와 일치하면 통과시킨다.
    //    (정확히 하려면 VerifyRequest에 필드 추가가 필요 — 계약 변경이라 상의 필요)
    const policy = getPolicy(policyId);
    const { minAge, maxAge } = policy.criteria;
    const possibleThresholds = [1, 2, 3, 4].map((h) =>
      resolveIncomeThreshold(policyId, h)
    );

    const signalsMatch =
      publicSignals.length === 4 &&
      publicSignals[1] === String(minAge) &&
      publicSignals[2] === String(maxAge) &&
      possibleThresholds.some((t) => publicSignals[3] === String(t));
    if (!signalsMatch) return respond(false, "SIGNAL_MISMATCH");

    // 3) 유효한 증명이 "자격 충족(1)"을 말하는가. 0이면 미달 사실을 증명한 것
    if (publicSignals[0] !== "1") return respond(false, "NOT_ELIGIBLE");

    return respond(true);
  } catch {
    return NextResponse.json<VerifyResponse>(
      {
        valid: false,
        policyId: "",
        checkedAt: new Date().toISOString(),
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
