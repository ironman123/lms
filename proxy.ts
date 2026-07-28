// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    try
    {


        // Modern asymmetric JWTs are verified locally after the signing key
        // is cached, avoiding an Auth API round trip on every navigation.
        const { data } = await supabase.auth.getClaims()
        const isAuthenticated = typeof data?.claims?.sub === 'string'

        // Protected routes — redirect to login if not authenticated
        const protectedPaths = ['/dashboard', '/session']
        const isProtected = protectedPaths.some(p =>
            request.nextUrl.pathname.startsWith(p)
        )

        if (!isAuthenticated && isProtected)
        {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Redirect logged-in users away from login
        if (isAuthenticated && request.nextUrl.pathname === '/login')
        {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }
    catch (e)
    {
        // If auth fails for technical reasons, let the request proceed 
        // and let individual pages handle the error or redirect.
        console.error("Middleware auth check failed:", e)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        // Skip static files and api routes that don't need auth
        '/((?!_next/static|_next/image|favicon.ico|api/|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
