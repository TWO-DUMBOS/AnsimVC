"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { UserProfile } from "@/lib/types"
import StepIndicator from "@/components/ui/StepIndicator"
import Field from "@/components/ui/Field"
import CheckCard from "@/components/ui/CheckCard"

type FormState = {
  age: string
  isDaegu: boolean
  hasNoHouse: boolean
  isIndependent: boolean
  depositManwon: string
  rentManwon: string
  annualIncomeManwon: string
}

// 시연용 초기값 — CLAUDE.md 데모 시나리오와 동일.
// 연소득 3000만원(월 250만원)은 정책A 소득 요건 초과로 의도적으로 탈락시키고
// 정책B는 통과시켜, AI 필터링이 실제로 작동함을 보여주기 위한 값이다.
// (임의로 바꾸지 말 것 — 바꾸면 "정책A 미달·정책B 통과" 기대 결과가 깨짐)
const INITIAL_FORM: FormState = {
  age: "26",
  isDaegu: true,
  hasNoHouse: true,
  isIndependent: true,
  depositManwon: "3000",
  rentManwon: "40",
  annualIncomeManwon: "3000",
}

function buildUserProfile(form: FormState): UserProfile {
  // 정책A(대구 청년월세)는 '부모와 별도 거주 청년' 대상이라 사실상 1인 가구.
  // UserProfile에는 필드를 유지해 향후 다인 가구 확장 가능하게 둠.
  const householdSize = 1

  return {
    age: Number(form.age),
    // 연소득(만원) → 월 소득(원)
    monthlyIncome: Math.round((Number(form.annualIncomeManwon) * 10000) / 12),
    householdSize,
    region: form.isDaegu ? "대구광역시" : "",
    isHouseholdHead: form.isIndependent,
    monthlyRent: Number(form.rentManwon) * 10000,
    deposit: Number(form.depositManwon) * 10000,
    hasOwnHouse: !form.hasNoHouse,
  }
}

export default function EligibilityPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const profile = buildUserProfile(form)

    // sessionStorage 선택: URL 쿼리로 8개 필드를 직렬화하는 것보다 단순하고,
    // CLAUDE.md 아키텍처 규칙("클라이언트 메모리 또는 sessionStorage")과도 맞는다.
    try {
      sessionStorage.setItem("ansimvc:userProfile", JSON.stringify(profile))
    } catch {
      // sessionStorage를 못 쓰는 환경이어도 화면은 죽지 않게 진행
    }

    router.push("/diagnosis")
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <StepIndicator current={1} />

      <div>
        <h1 className="text-xl font-bold">자격 정보 입력</h1>
        <p className="mt-1 text-sm text-muted">
          아래 정보로 대구 청년 주거복지 정책 자격을 진단합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="나이" type="number" value={form.age} onChange={(v) => update("age", v)} />

        <CheckCard
          items={[
            {
              id: "isDaegu",
              label: "대구광역시에 거주하고 있어요",
              checked: form.isDaegu,
              onChange: (v) => update("isDaegu", v),
            },
            {
              id: "hasNoHouse",
              label: "무주택자예요 (본인 명의 주택 없음)",
              checked: form.hasNoHouse,
              onChange: (v) => update("hasNoHouse", v),
            },
            {
              id: "isIndependent",
              label: "부모와 별도로 거주하고 있어요 (세대주)",
              checked: form.isIndependent,
              onChange: (v) => update("isIndependent", v),
            },
          ]}
        />

        <Field
          label="보증금"
          type="number"
          suffix="만원"
          value={form.depositManwon}
          onChange={(v) => update("depositManwon", v)}
        />

        <Field
          label="월세"
          type="number"
          suffix="만원"
          value={form.rentManwon}
          onChange={(v) => update("rentManwon", v)}
        />

        <Field
          label="연소득"
          type="number"
          suffix="만원"
          value={form.annualIncomeManwon}
          onChange={(v) => update("annualIncomeManwon", v)}
        />

        <button
          type="submit"
          className="mt-2 w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover"
        >
          다음
        </button>
      </form>
    </div>
  )
}
