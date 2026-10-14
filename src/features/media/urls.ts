import type { SupabaseClient } from "@supabase/supabase-js";

export async function signedUrlMap(supabase: SupabaseClient, paths: string[]) {
  const urls = new Map<string, string>();
  const bucket = supabase.storage.from("universe-media");
  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    const { data } = await bucket.createSignedUrls(chunk, 60 * 30);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}
