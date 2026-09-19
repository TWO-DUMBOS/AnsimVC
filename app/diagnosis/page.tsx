"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { DiagnoseResponse, UserProfile } from "@/lib/types"
import StepIndicator from "@/components/ui/StepIndicator"

type Status = "loading" | "no-profile" | "error" | "ready"

export default function DiagnosisPage() {
  const [status, setStatus] = useState<Status>("loading")
  const [result, setResult] = useState<DiagnoseResponse | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setStatus("loading")

      let profile: UserProfile | null = null
      try {
        const raw = sessionStorage.getItem("ansimvc:userProfile")
        profile = raw ? (JSON.parse(raw) as UserProfile) : null
      } catch {
        profile = null
      }

      if (!profile) {
        if (!cancelled) setStatus("no-profile")
        return
      }

      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as DiagnoseResponse

        if (cancelled) return

        // 다음 화면(ZK 증명)에서 어떤 정책을 증명할지 알아야 해서 결과를 넘겨둔다.
        try {
          sessionStorage.setItem("ansimvc:diagnoseResult", JSON.stringify(data))
        } catch {
          // 저장 실패해도 이 화면 자체는 정상 표시
        }

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
      <StepIndicator current={2} />

      <div>
        <h1 className="text-xl font-bold">AI 자격 진단</h1>
        <p className="mt-1 text-sm text-muted">
          입력하신 정보로 대구 청년 주거복지 정책 2건의 적합도를 진단했습니다.
        </p>
      </div>

      {status === "loading" && <p className="text-sm text-muted">진단 중입니다...</p>}

      {status === "no-profile" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">입력된 자격 정보가 없습니다. 처음부터 다시 시작해주세요.</p>
          <Link href="/eligibility" className="text-sm font-medium text-brand">
            자격 정보 입력하러 가기
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">진단 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="w-full rounded-md border border-border py-2.5 text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "ready" && result && (
        <>
          <p className="rounded-md border border-border bg-surface p-3 text-sm">{result.summary}</p>

          <div className="flex flex-col gap-3">
            {result.matches.map((match) => (
              <div key={match.policyId} className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium">{match.policyName}</h2>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                      (match.eligible ? "bg-brand/15 text-brand" : "bg-muted/15 text-muted")
                    }
                  >
                    {match.eligible ? "통과" : "미달"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">적합도 {match.score}%</p>

                {match.reasons.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {match.reasons.map((reason, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-brand">✓</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {match.missing.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    {match.missing.map((reason, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span>·</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <Link
            href="/proof"
            className="mt-2 w-full rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            다음
          </Link>
        </>
      )}
    </div>
  )
}
