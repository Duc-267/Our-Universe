export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase project URL and publishable key must be configured.");
  }

  return { url, publishableKey };
}

export function appOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured.");
  }
  return new URL(value).origin;
}
