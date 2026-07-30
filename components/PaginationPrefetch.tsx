"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PaginationPrefetchProps = {
    nextHref?: string;
};

export default function PaginationPrefetch({
    nextHref,
}: PaginationPrefetchProps) {
    const router = useRouter();

    useEffect(() => {
        if (!nextHref) return;

        // Warm the next React Server Component payload after the current page
        // becomes interactive. Next keeps it in the in-memory Router Cache, so
        // the pagination click does not have to wait on a fresh server request.
        const prefetch = () => router.prefetch(nextHref);

        const idleWindow = window as unknown as {
            requestIdleCallback?: (
                callback: IdleRequestCallback,
                options?: IdleRequestOptions
            ) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        if (idleWindow.requestIdleCallback) {
            const idleId = idleWindow.requestIdleCallback(prefetch, {
                timeout: 1500,
            });
            return () => idleWindow.cancelIdleCallback?.(idleId);
        }

        const timeoutId = setTimeout(prefetch, 250);
        return () => clearTimeout(timeoutId);
    }, [nextHref, router]);

    return null;
}
