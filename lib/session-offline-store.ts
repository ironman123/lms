import type { InteractionMetrics } from "@/app/(main)/hooks/useExamTelemetry";

export type SessionRecoveryRecord = {
    sessionId: string;
    revision: number;
    metrics: InteractionMetrics[];
    updatedAt: number;
};

const DATABASE_NAME = "lms-session-recovery";
const STORE_NAME = "sessions";
const DATABASE_VERSION = 1;

function openRecoveryDatabase(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    return new Promise((resolve) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME, {
                    keyPath: "sessionId",
                });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    });
}

export async function loadSessionRecovery(
    sessionId: string
): Promise<SessionRecoveryRecord | null> {
    const database = await openRecoveryDatabase();
    if (!database) return null;
    return new Promise((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(sessionId);
        request.onsuccess = () =>
            resolve((request.result as SessionRecoveryRecord | undefined) ?? null);
        request.onerror = () => resolve(null);
        transaction.oncomplete = () => database.close();
    });
}

export async function saveSessionRecovery(
    record: SessionRecoveryRecord
): Promise<void> {
    const database = await openRecoveryDatabase();
    if (!database) return;
    await new Promise<void>((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(record.sessionId);
        request.onsuccess = () => {
            const current = request.result as
                | SessionRecoveryRecord
                | undefined;
            if (!current || current.revision <= record.revision) {
                store.put(record);
            }
        };
        const finish = () => {
            database.close();
            resolve();
        };
        transaction.oncomplete = finish;
        transaction.onerror = finish;
        transaction.onabort = finish;
    });
}

export async function clearSessionRecoveryIfAtMost(
    sessionId: string,
    revision: number
): Promise<void> {
    const database = await openRecoveryDatabase();
    if (!database) return;
    await new Promise<void>((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(sessionId);
        request.onsuccess = () => {
            const current = request.result as
                | SessionRecoveryRecord
                | undefined;
            if (current && current.revision <= revision) {
                store.delete(sessionId);
            }
        };
        const finish = () => {
            database.close();
            resolve();
        };
        transaction.oncomplete = finish;
        transaction.onerror = finish;
        transaction.onabort = finish;
    });
}

export async function clearSessionRecovery(sessionId: string): Promise<void> {
    const database = await openRecoveryDatabase();
    if (!database) return;
    await new Promise<void>((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(sessionId);
        const finish = () => {
            database.close();
            resolve();
        };
        transaction.oncomplete = finish;
        transaction.onerror = finish;
        transaction.onabort = finish;
    });
}
