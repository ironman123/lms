export const MAX_PRACTICE_REMINDER_MINUTES = 24 * 60;

export function normalizePracticeReminderMinutes(
    value: string | number | null | undefined
) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }
    const minutes = Number(value);
    if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > MAX_PRACTICE_REMINDER_MINUTES
    ) {
        throw new Error("Reminder must be a whole number from 1 to 1440 minutes.");
    }
    return minutes;
}

function key(sessionId: string) {
    return `practice-reminder:${sessionId}`;
}

export function setPracticeReminder(sessionId: string, minutes: number) {
    if (typeof window === "undefined") return;
    const normalized = normalizePracticeReminderMinutes(minutes);
    if (normalized === null) return;
    window.sessionStorage.setItem(
        key(sessionId),
        String(Date.now() + normalized * 60_000)
    );
}

export function getPracticeReminderDeadline(sessionId: string) {
    if (typeof window === "undefined") return null;
    const value = Number(window.sessionStorage.getItem(key(sessionId)));
    return Number.isFinite(value) && value > 0 ? value : null;
}

export function clearPracticeReminder(sessionId: string) {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(key(sessionId));
}
