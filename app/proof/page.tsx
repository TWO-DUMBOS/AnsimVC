"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { generateProof } from "@/lib/zk";
import { getPolicy } from "@/lib/policies";
import type { ZKProofBundle } from "@/lib/types";

// 앞 화면이 sessionStorage에 값을 넣어주면 그걸 쓰고, 없으면 데모 시나리오(26세/월 250만/1인)로 동작한다.
//   "ansimvc:profile"  : UserProfile JSON      "ansimvc:policyId" : Policy.id
//   "ansimvc:proof"    : 이 화면이 저장하는 ZKProofBundle JSON (결과 화면에서 읽어 /api/verify 호출)
const DEMO_PROFILE = { age: 26, monthlyIncome: 2_500_000, householdSize: 1 };
const DEMO_POLICY_ID = "daegu-youth-deposit-loan";

const STEPS = [
  "비공개 정보 준비 (이 기기 안에서만 처리)",
  "정책 기준값(공개 값) 불러오기",
  "증명 회로 로드 · 증거(witness) 계산",
  "Groth16 영지식 증명 생성",
];
const STEP_MS = 700; // 단계 문구 전환 간격. 증명이 너무 빨리 끝나도 애니메이션이 보이도록 최소 표시 시간으로도 쓴다

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ProofPage() {
  const [step, setStep] = useState(0);
  const [bundle, setBundle] = useState<ZKProofBundle | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function run() {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    try {
      const profile =
        JSON.parse(sessionStorage.getItem("ansimvc:profile") ?? "null") ?? DEMO_PROFILE;
      const policyId = sessionStorage.getItem("ansimvc:policyId") ?? DEMO_POLICY_ID;

      const [result] = await Promise.all([
        generateProof(
          { age: profile.age, income: profile.monthlyIncome, householdSize: profile.householdSize },
          policyId,
        ),
        sleep(STEPS.length * STEP_MS),
      ]);
      sessionStorage.setItem("ansimvc:proof", JSON.stringify(result));
      setBundle(result);
    } catch {
      setError("증명 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      clearInterval(timer);
    }
  }

  useEffect(() => {
    if (started.current) return; // 개발 모드 StrictMode의 이중 실행 방지
    started.current = true;
    run();
  }, []);

  function retry() {
    setError("");
    setStep(0);
    run();
  }

  const done = bundle !== null;

  return (
    <main className="flex min-h-screen justify-center bg-white px-6 py-12 text-zinc-900">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-8">
        <h1 className="text-2xl font-bold">ZK-Proof 생성</h1>

        {/* 스피너 → 완료 체크 */}
        {!done && !error && (
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
            <div className="absolute inset-0 flex animate-pulse items-center justify-center text-3xl">
              🔐
            </div>
          </div>
        )}
        {done && (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-4xl text-green-600">
            ✓
          </div>
        )}

        {/* 진행 단계 */}
        {!error && (
          <ul className="w-full space-y-3">
            {STEPS.map((label, i) => {
              const state = done || i < step ? "done" : i === step ? "active" : "wait";
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm transition-colors ${
                    state === "wait" ? "text-zinc-400" : "text-zinc-800"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      state === "done"
                        ? "bg-green-500 text-white"
                        : state === "active"
                          ? "animate-pulse bg-blue-600 text-white"
                          : "bg-zinc-200"
                    }`}
                  >
                    {state === "done" ? "✓" : ""}
                  </span>
                  {label}
                </li>
              );
            })}
          </ul>
        )}

        {!done && !error && (
          <p className="text-center text-xs text-zinc-500">
            나이와 소득 원본은 이 기기를 벗어나지 않습니다.
          </p>
        )}

        {error && (
          <div className="w-full space-y-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={retry} className="rounded-lg bg-blue-600 px-5 py-2 text-sm text-white">
              다시 시도
            </button>
          </div>
        )}

        {/* 완료 요약 */}
        {bundle && (
          <div className="w-full space-y-4">
            <div className="rounded-lg border border-zinc-200 p-4 text-sm">
              <p className="font-semibold">{getPolicy(bundle.policyId).name}</p>
              <p className="mt-1 text-zinc-600">
                {bundle.publicSignals[0] === "1"
                  ? "자격 요건 충족 사실이 증명되었습니다."
                  : "자격 요건 미달 사실이 증명되었습니다."}
              </p>
              <dl className="mt-3 space-y-1 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <dt>공개된 연령 기준</dt>
                  <dd>
                    {bundle.publicSignals[1]}~{bundle.publicSignals[2]}세
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>공개된 월 소득 상한</dt>
                  <dd>{Number(bundle.publicSignals[3]).toLocaleString()}원</dd>
                </div>
                <div className="flex justify-between">
                  <dt>비공개 (증명에 포함되지 않음)</dt>
                  <dd>나이 · 소득 원본</dd>
                </div>
              </dl>
            </div>
            <Link
              href="/result"
              className="block rounded-lg bg-blue-600 py-3 text-center font-medium text-white"
            >
              검증하러 가기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
