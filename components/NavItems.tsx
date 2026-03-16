'use client';
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions', href: '/subscription' },
    { label: 'Contact', href: '/contact' },
]
const NavItems = () => {
    const pathname = usePathname();
    return (
        <nav className="flex items-center gap-4">
            {navItems.map(({ label, href }) => (
                <Link
                    key={label}
                    href={href}
                    className={cn("text-gray-700 hover:text-black transition hover:scale-105 transition-transform duration-100", pathname === href && 'text-primary font-bold')}
                >
                    {label}
                </Link>
            ))}
        </nav>
    )
}

export default NavItems