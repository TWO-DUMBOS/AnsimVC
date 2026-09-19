"use client"

import Link from "next/link"

// 예상 못 한 렌더링 오류가 나도 빈 화면 대신 안내를 보여주는 최소한의 안전망
// (이 Next.js 버전의 error.tsx 는 reset 이 아니라 retry 를 받는다)
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-10">
      <p className="text-sm text-muted">화면을 표시하는 중 문제가 발생했습니다.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="w-full rounded-md border border-border py-2.5 text-sm font-medium"
      >
        다시 시도
      </button>
      <Link href="/eligibility" className="text-sm font-medium text-brand">
        처음부터 다시 시작
      </Link>
    </div>
  )
}
