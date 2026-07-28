export const SESSION_CHECKPOINT_REQUEST_EVENT =
    "session:checkpoint-request";

export interface SessionCheckpointRequestDetail {
    complete: (success: boolean) => void;
}

export function requestSessionCheckpoint(timeoutMs = 8_000) {
    if (typeof window === "undefined") {
        return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
        let completed = false;
        const finish = (success: boolean) => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timeout);
            resolve(success);
        };
        const timeout = window.setTimeout(() => finish(false), timeoutMs);

        window.dispatchEvent(
            new CustomEvent<SessionCheckpointRequestDetail>(
                SESSION_CHECKPOINT_REQUEST_EVENT,
                { detail: { complete: finish } }
            )
        );
    });
}
