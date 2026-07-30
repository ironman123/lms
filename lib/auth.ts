// lib/auth.ts
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { withCache } from './cache'
import { cache } from 'react'

const getAuthSubject = cache(async (): Promise<string | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()

    if (error || typeof data?.claims?.sub !== 'string') return null
    return data.claims.sub
})

// Helper to fetch and cache the full user consistently across all auth checks
async function getCachedUser(supabaseId: string) {
    return withCache(
        `user:${supabaseId}`,
        300, // 5 minutes
        () => prisma.user.findUnique({ where: { supabaseId } }),
        [`user:${supabaseId}`] // Tag for easy invalidation
    );
}

// Use in server components that require auth
export async function requireAuth() {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) redirect('/login')

    const dbUser = await getCachedUser(supabaseId);

    if (!dbUser) redirect('/login')

    //if (!dbUser.onboarded) redirect('/onboarding')

    return dbUser
}

// Use in server components where auth is optional
export async function getOptionalUser() {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) return null

    return getCachedUser(supabaseId);
}

// Session pages only need the verified Supabase subject, not the full DB user.
export async function requireAuthSubject() {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) redirect('/login')
    return supabaseId
}

// API/Action protection for Admin routes
export async function requireAdmin() {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) throw new Error('UNAUTHORIZED')

    const dbUser = await getCachedUser(supabaseId);

    if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('FORBIDDEN')

    return dbUser
}

// Boolean check for UI rendering
export async function getIsAdmin(): Promise<boolean> {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) return false

    const dbUser = await getCachedUser(supabaseId);

    return dbUser?.role === 'ADMIN'
}

// Page protection for Admin dashboard
export async function requireAdminPage() {
    const supabaseId = await getAuthSubject()
    if (!supabaseId) redirect('/login')

    const dbUser = await getCachedUser(supabaseId);

    if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard')
    return dbUser
}
