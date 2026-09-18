import { NextResponse } from "next/server";
import type { VerifyRequest, VerifyResponse } from "@/lib/types";
import { getPolicy, resolveIncomeThreshold } from "@/lib/policies";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { policyId, publicSignals } = body;

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

    // ===== MOCK 시작 (교체할 구간) =====
    // 실제 구현 예정:
    //   const vKey = JSON.parse(await fs.readFile("zk/verification_key.json","utf8"));
    //   const ok = await groth16.verify(vKey, publicSignals, proof);
    //
    // 중요: 증명 검증과 별개로, publicSignals가 서버가 아는
    //       정책 기준과 일치하는지 반드시 대조해야 함.
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
      publicSignals[1] === String(minAge) &&
      publicSignals[2] === String(maxAge) &&
      possibleThresholds.some((t) => publicSignals[3] === String(t));

    const valid = publicSignals[0] === "1" && signalsMatch;
    // ===== MOCK 끝 =====

    return NextResponse.json<VerifyResponse>({
      valid,
      policyId,
      checkedAt: new Date().toISOString(),
    });
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