"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function authErrorPath(path: "/login" | "/sign-up", error: string, next: string) {
  const params = new URLSearchParams({ error, next });
  return `${path}?${params.toString()}`;
}

export async function signIn(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = safeNextPath(field(formData, "next"));
  if (!email || !password) redirect(authErrorPath("/login", "missing", next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(authErrorPath("/login", "credentials", next));
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const displayName = field(formData, "display_name");
  const next = safeNextPath(field(formData, "next"));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8 || displayName.length > 80) {
    redirect(authErrorPath("/sign-up", "invalid", next));
  }

  const supabase = await createClient();
  const callback = new URL("/auth/callback", appOrigin());
  callback.searchParams.set("next", next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callback.toString(),
    },
  });

  if (error) redirect(authErrorPath("/sign-up", "failed", next));
  if (!data.session) redirect(`/check-email?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
