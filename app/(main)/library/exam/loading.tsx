function CardSkeleton() {
    return (
        <div className="h-[430px] overflow-hidden rounded-[2rem] border border-border bg-card">
            <div className="h-44 animate-pulse bg-muted" />
            <div className="space-y-4 p-6">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-36 animate-pulse rounded-xl bg-muted" />
                <div className="mx-auto h-8 w-20 animate-pulse rounded-full bg-muted" />
            </div>
        </div>
    );
}

export default function ExamLibraryLoading() {
    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
                <div className="mx-auto mb-10 max-w-2xl text-center">
                    <div className="mx-auto mb-4 h-12 w-64 animate-pulse rounded-xl bg-muted" />
                    <div className="mx-auto h-6 w-72 max-w-full animate-pulse rounded bg-muted" />
                </div>

                <div className="mx-auto mb-16 h-12 w-full max-w-md animate-pulse rounded-xl bg-muted" />

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:gap-10">
                    {Array.from({ length: 6 }, (_, index) => (
                        <CardSkeleton key={index} />
                    ))}
                </div>
            </main>
        </div>
    );
}
