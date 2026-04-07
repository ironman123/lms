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
        where: { email: user.email! },
    })

    if (!dbUser) redirect('/login')

    return dbUser
}

// Use in server components where auth is optional
export async function getOptionalUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    return prisma.user.findUnique({
        where: { email: user.email! },
    })
}