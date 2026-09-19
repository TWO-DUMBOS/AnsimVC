import { NextResponse } from "next/server";
import OpenAI, { APIConnectionTimeoutError } from "openai";
import type { DiagnoseRequest, DiagnoseResponse, PolicyMatch } from "@/lib/types";
import { POLICIES, checkEligibility, type Policy } from "@/lib/policies";

// 이 호출은 이미 확정된 판정 결과를 문장으로 다듬는 것뿐이라 추론이 필요 없다.
// gpt-5.5(플래그십 추론 모델) 대신 저지연·저비용 경량 모델(GPT-5.6 Luna)을 쓴다.
const MODEL = "gpt-5.6-luna";

type RuleResult = {
  policy: Policy;
  eligible: boolean;
  reasons: string[];
  missing: string[];
  score: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DiagnoseRequest;
    const profile = body?.profile;

    if (!profile) {
      return emptyResponse("입력값이 없습니다.", 400);
    }

    // ⚠️ 판정(eligible)과 점수는 항상 규칙 기반(lib/policies.ts)으로 결정한다.
    //    AI는 이 결과를 바꾸지 않고 문구만 자연스럽게 다듬는다.
    //    (CLAUDE.md 폴백 규칙: "OpenAI가 스키마를 안 지킴 → 판정은 규칙 기반 코드로,
    //     LLM은 reasons 문구 생성만 담당")
    const ruleResults: RuleResult[] = POLICIES.map((policy) => {
      const { eligible, reasons, missing } = checkEligibility(profile, policy.id);
      const total = reasons.length + missing.length;
      const score = total === 0 ? 0 : Math.round((reasons.length / total) * 100);
      return { policy, eligible, reasons, missing, score };
    });

    const { matches, summary } = await buildNarrative(ruleResults);

    const response: DiagnoseResponse = {
      matches,
      summary,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch {
    return emptyResponse("진단 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 500);
  }
}

function emptyResponse(summary: string, status: number) {
  const body: DiagnoseResponse = { matches: [], summary, generatedAt: new Date().toISOString() };
  return NextResponse.json(body, { status });
}

function toPolicyMatch(r: RuleResult, reasons: string[], missing: string[]): PolicyMatch {
  return {
    policyId: r.policy.id,
    policyName: r.policy.name,
    eligible: r.eligible,
    score: r.score,
    reasons,
    missing,
  };
}

function fallbackSummary(ruleResults: RuleResult[]): string {
  const passed = ruleResults.filter((r) => r.eligible).map((r) => r.policy.name);
  if (passed.length === 0) return "현재 입력하신 조건으로 통과 가능한 정책이 없습니다.";
  return `다음 정책의 지원 대상입니다: ${passed.join(", ")}`;
}

function fallbackResult(ruleResults: RuleResult[]) {
  return {
    matches: ruleResults.map((r) => toPolicyMatch(r, r.reasons, r.missing)),
    summary: fallbackSummary(ruleResults),
  };
}

/**
 * LLM 출력은 신뢰하지 않고 규칙 결과로 보정한다.
 * eligible=false인데 missing이 비어 있으면(또는 eligible=true인데 reasons가 비어 있으면)
 * 탈락/통과 사유가 화면에 하나도 안 보이는 시연 핵심 화면 버그로 이어지므로,
 * 이 경우 규칙 기반 원본(r.missing / r.reasons)으로 강제 복구한다.
 */
function enforceInvariants(r: RuleResult, reasons: string[], missing: string[]): PolicyMatch {
  const safeMissing = !r.eligible && missing.length === 0 ? r.missing : missing;
  const safeReasons = r.eligible && reasons.length === 0 ? r.reasons : reasons;
  return toPolicyMatch(r, safeReasons, safeMissing);
}

/** 규칙 기반 판정 결과를 AI로 자연스러운 문장으로 다듬는다. 실패 시 규칙 기반 결과 그대로 반환. */
async function buildNarrative(
  ruleResults: RuleResult[]
): Promise<{ matches: PolicyMatch[]; summary: string }> {
  if (!process.env.OPENAI_API_KEY) return fallbackResult(ruleResults);

  try {
    // 응답이 느리면 오래 기다리지 않고 바로 규칙 기반 폴백으로 넘어간다 (최악의 경우 6초)
    const openai = new OpenAI({ timeout: 6000, maxRetries: 0 });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "developer",
          content:
            "너는 청년 주거복지 정책 진단 결과를 사용자에게 설명하는 도우미다. " +
            "각 정책의 통과(eligible) 여부는 이미 규칙으로 확정되어 있으니 절대 바꾸지 마라. " +
            "각 정책의 통과 근거(reasons)와 미달 사유(missing)를 자연스러운 한국어 문장으로 다시 쓰고, " +
            "전체 진단을 요약하는 summary 한 문장을 작성해라. " +
            '반드시 다음 JSON 형식으로만 답하라: ' +
            '{"summary": string, "policies": [{"policyId": string, "reasons": string[], "missing": string[]}]}',
        },
        {
          role: "user",
          // 개인정보(나이·소득 등 원본 프로필)는 외부 AI에 보내지 않는다.
          // 이미 규칙으로 확정된 판정 결과(정책별 통과 여부·사유)만 전달한다.
          content: JSON.stringify({
            results: ruleResults.map((r) => ({
              policyId: r.policy.id,
              policyName: r.policy.name,
              eligible: r.eligible,
              reasons: r.reasons,
              missing: r.missing,
            })),
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallbackResult(ruleResults);

    const parsed = JSON.parse(raw) as {
      summary?: unknown;
      policies?: { policyId?: unknown; reasons?: unknown; missing?: unknown }[];
    };

    const matches = ruleResults.map((r) => {
      const ai = parsed.policies?.find((p) => p.policyId === r.policy.id);
      const reasons = isStringArray(ai?.reasons) && ai.reasons.length > 0 ? ai.reasons : r.reasons;
      const missing = isStringArray(ai?.missing) && ai.missing.length > 0 ? ai.missing : r.missing;
      return enforceInvariants(r, reasons, missing);
    });

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary
        : fallbackSummary(ruleResults);

    return { matches, summary };
  } catch (err) {
    // OpenAI 호출/파싱 실패(타임아웃 포함) — 규칙 기반 결과로 화면이 죽지 않게 진행
    const reason = err instanceof APIConnectionTimeoutError ? "타임아웃" : "오류";
    console.error(`[diagnose] OpenAI 호출 실패(${reason}), 규칙 기반 결과로 폴백:`, err);
    return fallbackResult(ruleResults);
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
