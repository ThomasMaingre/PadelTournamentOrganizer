// // lib/supabase/server.ts
// import { cookies } from "next/headers"
// import { createServerClient } from "@supabase/ssr"
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env"

// export async function createSupabaseServerClient() {
//   const cookieStore = await cookies() // ⬅️ obligatoire en Next 15

//   return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//     cookies: {
//       get(name: string) {
//         return cookieStore.get(name)?.value
//       },
//       set(name: string, value: string, options: any) {
//         cookieStore.set({ name, value, ...options })
//       },
//       remove(name: string, options: any) {
//         cookieStore.set({ name, value: "", ...options, expires: new Date(0) })
//       },
//     },
//   })
// }





// import { cookies } from "next/headers"
// import { createServerClient } from "@supabase/ssr"

// export function createSupabaseServerClient() {
//   const cookieStore = cookies()

//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll: () => cookieStore.getAll(),
//         setAll: () => {},    // neutre : pas d’écriture côté RSC
//         set: () => {},       // idem
//         remove: () => {},    // idem
//       },
//     }
//   )
// }


// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies() // ✅ Next 15: cookies() doit être await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // En RSC, setAll peut throw -> on protège
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            /* no-op en RSC */
          }
        },
        // (get/set/remove individuels non requis ici)
      },
    }
  )
}

