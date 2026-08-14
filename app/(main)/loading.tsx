export default function MainLoading() {
    return <main className="mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 md:py-20" aria-label="Loading page" aria-busy="true">
        <div className="mx-auto mb-10 h-12 w-64 animate-pulse rounded-xl bg-muted" />
        <div className="mx-auto mb-16 h-12 w-full max-w-md animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-3xl border border-border bg-card" />)}</div>
    </main>;
}
