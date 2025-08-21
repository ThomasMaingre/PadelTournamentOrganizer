import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env"

export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
