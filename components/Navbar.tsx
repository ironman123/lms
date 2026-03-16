import Link from 'next/link'
import Image from 'next/image'
import NavItems from './NavItems'
import { Show, SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs'

const Navbar = () => {
    return (
        <nav className='navbar'>
            <Link href='/'>
                <div className="flex items-center gap-2.5 cursor-pointer">
                    <Image src='/images/logo.svg' alt='logo' width={30} height={30} />
                </div>
            </Link>
            <div className="flex items-center gap-8">
                <NavItems />
                <Show when="signed-in">
                    <UserButton />
                </Show>
                <Show when="signed-out" >
                    <SignInButton>
                        <button className='button-signin cursor-pointer text-gray-700 hover:text-black hover:scale-105 transition-transform duration-100'>
                            Sign In
                        </button>
                    </SignInButton>
                </Show>
            </div>
        </nav>
    )
}

export default Navbar