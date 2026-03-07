'use client';
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscription', href: '/subscription' },
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
                    className={cn("text-gray-700 hover:text-black transition", pathname === href && 'text-primary font-bold')}
                >
                    {label}
                </Link>
            ))}
        </nav>
    )
}

export default NavItems