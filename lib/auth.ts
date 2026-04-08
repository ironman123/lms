// lib/auth.ts
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

// Use in server components that require auth
export async function requireAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id! },
    })

    if (!dbUser) redirect('/login')

    //if (!dbUser.onboarded) redirect('/onboarding')

    return dbUser
}

// Use in server components where auth is optional
export async function getOptionalUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    return prisma.user.findUnique({
        where: { supabaseId: user.id! },
    })
}

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('UNAUTHORIZED')

    const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { role: true, id: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('FORBIDDEN')

    return dbUser
}

export async function getIsAdmin(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { role: true },
    })

    return dbUser?.role === 'ADMIN'
}

export async function requireAdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { role: true },
    })
    if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard')
}