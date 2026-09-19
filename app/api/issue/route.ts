import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/types";
import { issueSignedVC } from "@/lib/vc";

// 자격 정보(UserProfile)로 VC를 발급하고 발급기관 서명(JWT)을 붙여 돌려준다.
// 응답: SignedVC { vc, jwt } — 클라이언트가 sessionStorage("ansimvc:vc")에 보관한다.
export async function POST(req: Request) {
  try {
    const { profile } = (await req.json()) as { profile?: UserProfile };
    if (!profile) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    return NextResponse.json(issueSignedVC(profile));
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
