"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { DiagnoseResponse, UserProfile, ZKProofBundle } from "@/lib/types"
import type { SignedVC } from "@/lib/vc"
import { generateProof } from "@/lib/zk"
import { getPolicy } from "@/lib/policies"
import StepIndicator from "@/components/ui/StepIndicator"

// sessionStorage 계약
//   읽기: "ansimvc:userProfile" (화면1, UserProfile) / "ansimvc:diagnoseResult" (화면2, DiagnoseResponse)
//   쓰기: "ansimvc:vc" (SignedVC) / "ansimvc:zkProof" (ZKProofBundle → 화면4가 /api/verify 로 제출)

type Status = "running" | "no-input" | "no-policy" | "error" | "done"

const STEPS = [
  "자격증명(VC) 발급",
  "비공개 정보 준비 (증명 계산은 이 기기 안에서)",
  "정책 기준값(공개 값) 불러오기",
  "증명 회로 로드 · 증거(witness) 계산",
  "Groth16 영지식 증명 생성",
]
const STEP_MS = 700 // 단계 문구 전환 간격. 증명이 너무 빨리 끝나도 애니메이션이 보이도록 최소 표시 시간으로도 쓴다

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function readJSON<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export default function ProofPage() {
  const [status, setStatus] = useState<Status>("running")
  const [step, setStep] = useState(0)
  const [bundle, setBundle] = useState<ZKProofBundle | null>(null)
  const [vcIssuer, setVcIssuer] = useState("")
  const started = useRef(false)

  async function run() {
    const profile = readJSON<UserProfile>("ansimvc:userProfile")
    const diagnosis = readJSON<DiagnoseResponse>("ansimvc:diagnoseResult")
    if (!profile || !diagnosis) {
      setStatus("no-input")
      return
    }

    // 통과한 정책 중 첫 번째를 증명한다. 미달 정책은 증명하지 않는다.
    const target = diagnosis.matches.find((m) => m.eligible)
    if (!target) {
      setStatus("no-policy")
      return
    }

    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS)
    try {
      const res = await fetch("/api/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const signed = (await res.json()) as SignedVC
      sessionStorage.setItem("ansimvc:vc", JSON.stringify(signed))

      // 증명 입력은 사용자 입력 원본이 아니라 발급된 VC의 값에서 가져온다.
      const subject = signed.vc.credentialSubject
      const [result] = await Promise.all([
        generateProof(
          { age: subject.age, income: subject.monthlyIncome, householdSize: subject.householdSize },
          target.policyId,
        ),
        sleep(STEPS.length * STEP_MS),
      ])

      sessionStorage.setItem("ansimvc:zkProof", JSON.stringify(result))
      setVcIssuer(signed.vc.issuer)
      setBundle(result)
      setStatus("done")
    } catch {
      setStatus("error")
    } finally {
      clearInterval(timer)
    }
  }

  useEffect(() => {
    if (started.current) return // 개발 모드 StrictMode의 이중 실행 방지
    started.current = true
    run()
  }, [])

  function retry() {
    setStep(0)
    setStatus("running")
    run()
  }

  const done = status === "done"

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <StepIndicator current={3} />

      <div>
        <h1 className="text-xl font-bold">ZK-Proof 생성</h1>
        <p className="mt-1 text-sm text-muted">
          나이·소득 원본은 제출하지 않고, 연령·소득 요건을 충족한다는 사실만 증명합니다.
        </p>
      </div>

      {status === "no-input" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">진단 결과가 없습니다. 처음부터 다시 시작해주세요.</p>
          <Link href="/eligibility" className="text-sm font-medium text-brand">
            자격 정보 입력하러 가기
          </Link>
        </div>
      )}

      {status === "no-policy" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            증명할 수 있는 통과 정책이 없습니다. 입력하신 정보를 확인해주세요.
          </p>
          <Link href="/eligibility" className="text-sm font-medium text-brand">
            자격 정보 다시 입력하기
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">증명 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-md border border-border py-2.5 text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {(status === "running" || done) && (
        <>
          {/* 스피너 → 완료 체크 */}
          <div className="flex justify-center">
            {done ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/15 text-4xl text-brand">
                ✓
              </div>
            ) : (
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-border border-t-brand" />
                <div className="absolute inset-0 flex animate-pulse items-center justify-center text-3xl">
                  🔐
                </div>
              </div>
            )}
          </div>

          {/* 진행 단계 */}
          <ul className="flex flex-col gap-3">
            {STEPS.map((label, i) => {
              const state = done || i < step ? "done" : i === step ? "active" : "wait"
              return (
                <li
                  key={label}
                  className={
                    "flex items-center gap-3 text-sm transition-colors " +
                    (state === "wait" ? "text-muted opacity-60" : "")
                  }
                >
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs " +
                      (state === "done"
                        ? "bg-brand text-white"
                        : state === "active"
                          ? "animate-pulse bg-brand/40"
                          : "bg-border")
                    }
                  >
                    {state === "done" ? "✓" : ""}
                  </span>
                  {label}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {status === "running" && (
        <p className="text-center text-xs text-muted">
          제출되는 증명에는 나이·소득 원본이 포함되지 않습니다.
        </p>
      )}

      {done && bundle && (
        <>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{getPolicy(bundle.policyId).name}</h2>
              <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                증명 생성 완료
              </span>
            </div>
            <dl className="mt-3 flex flex-col gap-1 text-xs text-muted">
              <div className="flex justify-between gap-2">
                <dt>공개된 연령 기준</dt>
                <dd className="text-right">
                  {bundle.publicSignals[1]}~{bundle.publicSignals[2]}세
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>공개된 월 소득 상한</dt>
                <dd className="text-right">{Number(bundle.publicSignals[3]).toLocaleString()}원</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>비공개 (증명에 미포함)</dt>
                <dd className="text-right">나이 · 소득 원본</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>자격증명(VC) 발급자</dt>
                <dd className="text-right break-all">{vcIssuer}</dd>
              </div>
            </dl>
          </div>

          <Link
            href="/result"
            className="mt-2 w-full rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            다음
          </Link>
        </>
      )}
    </div>
  )
}
