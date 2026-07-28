import { SessionMode, SessionStatus } from "@prisma/client";

export const RESUMABLE_SESSION_STATUSES = [
    SessionStatus.ACTIVE,
    SessionStatus.PAUSED,
] as const;

export const PRACTICE_RESUME_WINDOW_HOURS = 72;

export function isResumableSessionStatus(status: SessionStatus) {
    return (
        status === SessionStatus.ACTIVE ||
        status === SessionStatus.PAUSED
    );
}

export function getSessionExpiry(
    mode: SessionMode,
    durationMinutes: number,
    startedAt = new Date()
) {
    const lifetimeMs =
        mode === SessionMode.MOCK
            ? Math.max(durationMinutes, 1) * 60 * 1_000
            : PRACTICE_RESUME_WINDOW_HOURS * 60 * 60 * 1_000;

    return new Date(startedAt.getTime() + lifetimeMs);
}

export function isPastSessionExpiry(expiresAt: Date | null, now = new Date()) {
    return expiresAt !== null && expiresAt <= now;
}
