export const APP_TIME_ZONE = "Asia/Kolkata";

export function toAppDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
}

export function getEffectiveStreak(
    storedStreak: number,
    lastActiveDate: string | null | undefined,
    now = new Date()
) {
    if (!lastActiveDate || storedStreak <= 0) return 0;

    const today = toAppDateKey(now);
    const yesterday = toAppDateKey(
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    return lastActiveDate === today || lastActiveDate === yesterday
        ? storedStreak
        : 0;
}

export function formatCompactDuration(totalSeconds: number | null | undefined) {
    const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
}
