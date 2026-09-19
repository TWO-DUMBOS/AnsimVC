import { redirect } from "next/navigation";

// 첫 화면은 자격 정보 입력이다. (기본 Next.js 템플릿 화면이 노출되지 않도록)
export default function Home() {
  redirect("/eligibility");
}
