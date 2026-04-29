// lib/auth.ts
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { withCache } from './cache'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const dbUser = await getCachedUser(user.id);

    if (!dbUser) redirect('/login')

    //if (!dbUser.onboarded) redirect('/onboarding')

    return dbUser
}

// Use in server components where auth is optional
export async function getOptionalUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return getCachedUser(user.id);
}

// API/Action protection for Admin routes
export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('UNAUTHORIZED')

    const dbUser = await getCachedUser(user.id);

    if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('FORBIDDEN')

    return dbUser
}

// Boolean check for UI rendering
export async function getIsAdmin(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const dbUser = await getCachedUser(user.id);

    return dbUser?.role === 'ADMIN'
}

// Page protection for Admin dashboard
export async function requireAdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const dbUser = await getCachedUser(user.id);

    if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard')
}