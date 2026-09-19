"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { VerifyRequest, VerifyResponse, ZKProofBundle } from "@/lib/types"
import { getPolicy } from "@/lib/policies"
import StepIndicator from "@/components/ui/StepIndicator"

type Status = "loading" | "no-proof" | "error" | "ready"

function policyNameOf(policyId: string): string {
  try {
    return getPolicy(policyId).name
  } catch {
    return policyId
  }
}

export default function ResultPage() {
  const [status, setStatus] = useState<Status>("loading")
  const [proofBundle, setProofBundle] = useState<ZKProofBundle | null>(null)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setStatus("loading")

      // 화면3(ZK 증명)이 세션스토리지 "ansimvc:zkProof"에 ZKProofBundle을 저장해두는 게
      // 이 화면과의 계약이다. 화면3이 아직 구현 전이라 지금은 비어있을 수 있다.
      let bundle: ZKProofBundle | null = null
      try {
        const raw = sessionStorage.getItem("ansimvc:zkProof")
        bundle = raw ? (JSON.parse(raw) as ZKProofBundle) : null
      } catch {
        bundle = null
      }

      if (!bundle) {
        if (!cancelled) setStatus("no-proof")
        return
      }
      setProofBundle(bundle)

      try {
        const body: VerifyRequest = {
          policyId: bundle.policyId,
          proof: bundle.proof,
          publicSignals: bundle.publicSignals,
        }
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as VerifyResponse

        if (cancelled) return
        setResult(data)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <StepIndicator current={4} />

      <div>
        <h1 className="text-xl font-bold">검증 완료</h1>
        <p className="mt-1 text-sm text-muted">
          ZK-Proof를 발급기관 서버에 제출해 개인정보 노출 없이 자격을 검증했습니다.
        </p>
      </div>

      {status === "loading" && <p className="text-sm text-muted">증명을 검증하는 중입니다...</p>}

      {status === "no-proof" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            제출할 ZK-Proof가 없습니다. 증명 생성 단계부터 다시 진행해주세요.
          </p>
          <Link href="/proof" className="text-sm font-medium text-brand">
            증명 생성하러 가기
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="w-full rounded-md border border-border py-2.5 text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "ready" && result && proofBundle && (
        <>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{policyNameOf(result.policyId)}</h2>
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                  (result.valid ? "bg-brand/15 text-brand" : "bg-muted/15 text-muted")
                }
              >
                {result.valid ? "검증 성공" : "검증 실패"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {result.valid
                ? "나이·소득 등 민감정보를 공개하지 않고도 자격 요건을 충족함을 증명했습니다."
                : "제출된 증명이 정책 기준과 일치하지 않습니다."}
            </p>
            {result.error && <p className="mt-2 text-sm text-muted">사유: {result.error}</p>}
            <p className="mt-3 text-xs text-muted">
              검증 시각 {new Date(result.checkedAt).toLocaleString("ko-KR")}
            </p>
          </div>

          <div className="rounded-md border border-border bg-surface p-4">
            <h3 className="text-sm font-medium">증명 상세 (Public Signals)</h3>
            <dl className="mt-2 flex flex-col gap-1 text-xs text-muted">
              <div className="flex justify-between gap-2">
                <dt>정책 ID</dt>
                <dd className="text-right">{proofBundle.policyId}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>발급 시각</dt>
                <dd className="text-right">{new Date(proofBundle.createdAt).toLocaleString("ko-KR")}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Public Signals</dt>
                <dd className="text-right break-all">{proofBundle.publicSignals.join(", ")}</dd>
              </div>
            </dl>
          </div>

          <Link
            href="/eligibility"
            className="mt-2 w-full rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            처음으로
          </Link>
        </>
      )}
    </div>
  )
}
