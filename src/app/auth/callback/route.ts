import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { appOrigin } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const providerError = request.nextUrl.searchParams.get("error_code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const errorUrl = new URL("/login", appOrigin());
  errorUrl.searchParams.set("error", providerError === "otp_expired" ? "expired" : "callback");
  errorUrl.searchParams.set("next", next);
  if (!code && !(tokenHash && type === "email")) return NextResponse.redirect(errorUrl);

  const supabase = await createClient();
  const { error } = tokenHash && type === "email"
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    if (code) errorUrl.searchParams.set("error", "confirmation-signin");
    return NextResponse.redirect(errorUrl);
  }
  return NextResponse.redirect(new URL(next, appOrigin()));
}
