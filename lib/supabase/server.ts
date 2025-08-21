// lib/supabase/server.ts
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies() // ⬅️ obligatoire en Next 15

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, expires: new Date(0) })
      },
    },
  })
}
