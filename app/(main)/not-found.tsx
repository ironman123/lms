import Link from "next/link";

export default function MainNotFound() {
    return <main className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 text-center"><div className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm"><p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">404</p><h1 className="mt-3 text-2xl font-black">We couldn&apos;t find that page</h1><p className="mt-2 text-sm text-muted-foreground">It may have moved or been removed.</p><Link href="/library/exam" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">Browse exams</Link></div></main>;
}
