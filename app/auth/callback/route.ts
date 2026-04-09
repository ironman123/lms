// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

function getSafeRedirect(next: string | null, origin: string): string {
    if (!next) return '/dashboard';
    // Only allow relative paths starting with /
    if (next.startsWith('/') && !next.startsWith('//')) return next;
    return '/dashboard';
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    //const next = searchParams.get('next') ?? '/dashboard'
    const safeNext = getSafeRedirect(searchParams.get('next'), origin)

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

    if (!data.user.email)
    {
        return NextResponse.redirect(`${origin}/login?error=no_email`);
    }


    // Sync user to your Prisma DB
    await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {
            email: data.user.email ?? undefined,
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
            role: UserRole.STUDENT,
        },
    })

    return NextResponse.redirect(new URL(safeNext, origin));
}