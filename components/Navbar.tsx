import Link from 'next/link'
import Image from 'next/image'
import NavItems from './NavItems'
import { getOptionalUser } from '@/lib/auth'
import UserMenu from './UserMenu'
import NotificationBell from "./NotificationBell";
import {
    getRecentNotifications,
    getNotificationSeenAt,
} from "@/app/(main)/actions/notification-actions";
import { ThemeToggle } from "./ThemeToggle";
import { getOpenModerationAttentionCount } from "@/lib/moderation/admin-service";

//import { Show, SignInButton, UserButton } from '@clerk/nextjs'

const Navbar = async () => {
    const user = await getOptionalUser();

    const [notifications, seenAt, moderationAttentionCount] = user
        ? await Promise.all([
            getRecentNotifications(),
            getNotificationSeenAt(user.id),
            user.role === "ADMIN"
                ? getOpenModerationAttentionCount()
                : Promise.resolve(0),
        ])
        : [[], null, 0];


    return (
        <nav className='navbar'>
            <Link href='/' className="hidden shrink-0 sm:block">
                <div className="flex cursor-pointer items-center gap-2.5">
                    <Image src='/images/logo.svg' alt='logo' width={30} height={30} />
                </div>
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start sm:gap-8">
                <NavItems />
                {/* <Show when="signed-in">
                    <UserButton />
                </Show>
                <Show when="signed-out" >
                    <SignInButton mode="modal">
                        <button className='button-signin cursor-pointer text-muted-foreground hover:text-foreground hover:scale-105 transition-transform duration-100'>
                            Sign In
                        </button>
                    </SignInButton>
                </Show> */}
                <ThemeToggle />
                {user ? (
                    <>
                        <NotificationBell
                            notifications={notifications}
                            seenAt={seenAt}
                        />

                        <UserMenu
                            name={user.name}
                            email={user.email}
                            avatarUrl={user.avatarUrl}
                            role={user.role}
                            moderationAttentionCount={
                                moderationAttentionCount
                            }
                        />
                    </>
                ) : (
                    <Link
                        href='/login'
                        className='button-signin cursor-pointer text-muted-foreground hover:text-foreground hover:scale-105 transition-transform duration-100'
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    )
}

export default Navbar
