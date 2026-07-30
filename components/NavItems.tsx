'use client';
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions', href: '/subscription' },
    //{ label: 'Contact', href: '/contact' },
]
const NavItems = () => {
    const pathname = usePathname();
    return (
        <nav className="flex min-w-0 items-center gap-3 sm:gap-4">
            {navItems.map(({ label, href }) => (
                <Link
                    key={label}
                    href={href}
                    className={cn(
                        "whitespace-nowrap text-[13px] text-muted-foreground transition duration-100 hover:scale-105 hover:text-foreground sm:text-base",
                        pathname === href && "font-bold text-primary"
                    )}
                >
                    {label}
                </Link>
            ))}
        </nav>
    )
}

export default NavItems
