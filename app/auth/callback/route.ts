// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (!code)
    {
        return NextResponse.redirect(`${origin}/login?error=no_code`)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user)
    {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // Sync user to your Prisma DB
    await prisma.user.upsert({
        where: { email: data.user.email! },
        update: {
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url,
            lastActive: new Date(),
        },
        create: {
            email: data.user.email!,
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url,
            onboarded: false,
            supabaseId: data.user.id,
        },
    })

    return NextResponse.redirect(`${origin}${next}`)
}