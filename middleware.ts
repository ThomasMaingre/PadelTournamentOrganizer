// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// ⚠️ Le middleware ne s’exécute QUE sur les routes protégées (voir config plus bas)
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options, expires: new Date(0) })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL("/auth/login", req.url)
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return res
}

// ✅ Ne protège que /dashboard (et ses sous-routes). La home "/" reste publique.
export const config = {
  matcher: ["/dashboard/:path*"],
}
