import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/my-area";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/my-area";

  const supabase = await createClient();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  if (!ok) {
    const back = next.startsWith("/official") ? "/official/login" : "/login";
    return NextResponse.redirect(new URL(`${back}?error=link`, url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
