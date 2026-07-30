import { useState, useRef, useEffect, useCallback } from "react";
import { completeExamSession } from "../actions/session-actions";
import type { RestoredInteraction } from "@/lib/session-interactions";
import {
    SESSION_CHECKPOINT_REQUEST_EVENT,
    type SessionCheckpointRequestDetail,
} from "@/lib/session-checkpoint-client";
import {
    clearSessionRecovery,
    clearSessionRecoveryIfAtMost,
    loadSessionRecovery,
    saveSessionRecovery,
} from "@/lib/session-offline-store";

export interface InteractionMetrics {
    questionId: string;
    visitCount: number;
    dwellTimeSeconds: number;
    hesitationCount: number;
    isFlagged: boolean;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
    wasHinted: boolean;
    confidenceLevel: number | null;
}

const CHECKPOINT_INTERVAL_MS = 15_000;

function emptyMetrics(questionId: string): InteractionMetrics {
    return {
        questionId,
        visitCount: 0,
        dwellTimeSeconds: 0,
        hesitationCount: 0,
        isFlagged: false,
        selectedAnswer: null,
        isCorrect: null,
        wasHinted: false,
        confidenceLevel: null,
    };
}

export function useExamTelemetry(
    sessionId: string,
    initialQuestionId: string,
    restoredInteractions: RestoredInteraction[] = []
) {
    const restoredVault = Object.fromEntries(
        restoredInteractions.map((interaction) => [
            interaction.questionId,
            {
                questionId: interaction.questionId,
                selectedAnswer: interaction.selectedAnswer,
                visitCount: interaction.visitCount,
                dwellTimeSeconds: interaction.dwellTimeSeconds,
                hesitationCount: interaction.hesitationCount,
                isFlagged: interaction.isFlagged,
                isCorrect: interaction.isCorrect,
                wasHinted: interaction.wasHinted,
                confidenceLevel: interaction.confidenceLevel,
            },
        ])
    );
    const metricsVault = useRef<Record<string, InteractionMetrics>>(restoredVault);
    const currentQuestionRef = useRef(initialQuestionId);
    const questionEnterTimeRef = useRef(0);
    const isSubmittedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkpointInFlightRef = useRef<Promise<boolean> | null>(null);
    const revisionRef = useRef(
        restoredInteractions.reduce(
            (max, interaction) => Math.max(max, interaction.checkpointRevision),
            0
        )
    );
    const recoveryReadyRef = useRef(false);

    const [currentMetrics, setCurrentMetrics] = useState<InteractionMetrics>(
        () => restoredVault[initialQuestionId] ?? emptyMetrics(initialQuestionId)
    );
    const [recentActivities, setRecentActivities] = useState<
        Array<{ event: string; time: string }>
    >([]);
    const [offlineRecovery, setOfflineRecovery] = useState<
        InteractionMetrics[] | null
    >(null);

    const getOrInitMetrics = useCallback((questionId: string) => {
        if (!metricsVault.current[questionId]) {
            metricsVault.current[questionId] = emptyMetrics(questionId);
        }
        return metricsVault.current[questionId];
    }, []);

    const logActivity = useCallback((eventName: string) => {
        setRecentActivities((previous) =>
            [
                { event: eventName, time: new Date().toLocaleTimeString() },
                ...previous,
            ].slice(0, 5)
        );
    }, []);

    const snapshotMetrics = useCallback((): InteractionMetrics[] => {
        const currentQuestionId = currentQuestionRef.current;
        const activeDwellSeconds = Math.floor(
            (Date.now() - questionEnterTimeRef.current) / 1000
        );

        return Object.values(metricsVault.current).map((metric) => ({
            ...metric,
            dwellTimeSeconds:
                metric.questionId === currentQuestionId
                    ? metric.dwellTimeSeconds + activeDwellSeconds
                    : metric.dwellTimeSeconds,
        }));
    }, []);

    const persistOfflineSnapshot = useCallback(() => {
        if (
            !sessionId ||
            isSubmittedRef.current ||
            !recoveryReadyRef.current
        ) return;
        const revision = Math.max(Date.now(), revisionRef.current + 1);
        revisionRef.current = revision;
        void saveSessionRecovery({
            sessionId,
            revision,
            metrics: snapshotMetrics(),
            updatedAt: Date.now(),
        });
    }, [sessionId, snapshotMetrics]);

    const sendCheckpoint = useCallback(
        async (useBeacon = false, waitForInFlight = false) => {
            if (
                !sessionId ||
                isSubmittedRef.current ||
                !recoveryReadyRef.current
            ) return true;

            if (checkpointInFlightRef.current) {
                if (!waitForInFlight) return true;
                await checkpointInFlightRef.current;
            }

            const metrics = snapshotMetrics();
            if (metrics.length === 0) return true;

            const revision = Math.max(
                Date.now(),
                revisionRef.current + 1
            );
            revisionRef.current = revision;
            const body = JSON.stringify({ revision, metrics });
            const url = `/api/sessions/${sessionId}/checkpoint`;
            await saveSessionRecovery({
                sessionId,
                revision,
                metrics,
                updatedAt: Date.now(),
            });

            if (
                useBeacon &&
                typeof navigator !== "undefined" &&
                navigator.sendBeacon
            ) {
                const accepted = navigator.sendBeacon(
                    url,
                    new Blob([body], { type: "application/json" })
                );
                if (accepted) return true;
            }

            const request: Promise<boolean> = fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body,
                credentials: "same-origin",
                keepalive: true,
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Checkpoint failed with ${response.status}`
                        );
                    }
                    void clearSessionRecoveryIfAtMost(sessionId, revision);
                    return true;
                })
                .catch((error) => {
                    console.error("Session checkpoint error:", error);
                    return false;
                })
                .finally(() => {
                    if (checkpointInFlightRef.current === request) {
                        checkpointInFlightRef.current = null;
                    }
                });

            checkpointInFlightRef.current = request;
            return request;
        },
        [sessionId, snapshotMetrics]
    );

    const syncAnswers = useCallback(
        (answers: Record<string, string | string[]>) => {
            if (isSubmittedRef.current) return;
            Object.entries(answers).forEach(([questionId, answer]) => {
                getOrInitMetrics(questionId).selectedAnswer = Array.isArray(
                    answer
                )
                    ? answer.join(",")
                    : answer;
            });
            persistOfflineSnapshot();
        },
        [getOrInitMetrics, persistOfflineSnapshot]
    );

    const handleNavigation = useCallback(
        (newQuestionId: string) => {
            if (isSubmittedRef.current) return;

            const now = Date.now();
            const oldQuestionId = currentQuestionRef.current;
            const timeSpentSeconds = Math.floor(
                (now - questionEnterTimeRef.current) / 1000
            );

            if (oldQuestionId) {
                getOrInitMetrics(oldQuestionId).dwellTimeSeconds +=
                    timeSpentSeconds;
            }

            const newMetrics = getOrInitMetrics(newQuestionId);
            newMetrics.visitCount += 1;
            currentQuestionRef.current = newQuestionId;
            questionEnterTimeRef.current = now;
            setCurrentMetrics({ ...newMetrics });
            logActivity(`NAV → ${newQuestionId.slice(-4)}`);
            persistOfflineSnapshot();
        },
        [getOrInitMetrics, logActivity, persistOfflineSnapshot]
    );

    const handleAnswerSelection = useCallback(
        (
            questionId: string,
            answer: string,
            isCorrect: boolean,
            questionType: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE"
        ) => {
            if (isSubmittedRef.current) return;
            void questionType;
            const metrics = getOrInitMetrics(questionId);

            if (
                metrics.selectedAnswer !== null &&
                metrics.selectedAnswer !== answer
            ) {
                metrics.hesitationCount += 1;
                logActivity(`HESITATED → ${questionId.slice(-4)}`);
            } else {
                logActivity(`ANSWERED → ${questionId.slice(-4)}`);
            }

            metrics.selectedAnswer = answer;
            metrics.isCorrect = isCorrect;

            if (currentQuestionRef.current === questionId) {
                setCurrentMetrics({ ...metrics });
            }
            persistOfflineSnapshot();
        },
        [getOrInitMetrics, logActivity, persistOfflineSnapshot]
    );

    const toggleFlag = useCallback(
        (questionId: string) => {
            if (isSubmittedRef.current) return;
            const metrics = getOrInitMetrics(questionId);
            metrics.isFlagged = !metrics.isFlagged;
            if (currentQuestionRef.current === questionId) {
                setCurrentMetrics({ ...metrics });
            }
            logActivity(
                `${metrics.isFlagged ? "FLAGGED" : "UNFLAGGED"} → ${questionId.slice(-4)}`
            );
            persistOfflineSnapshot();
        },
        [getOrInitMetrics, logActivity, persistOfflineSnapshot]
    );

    const flushAndSubmit = useCallback(
        async (
            answers: Record<string, string | string[]>,
            onSuccess: () => void,
            onError: () => void
        ) => {
            if (isSubmittedRef.current) return;
            isSubmittedRef.current = true;

            const now = Date.now();
            const activeQuestionId = currentQuestionRef.current;
            if (activeQuestionId) {
                getOrInitMetrics(activeQuestionId).dwellTimeSeconds +=
                    Math.floor(
                        (now - questionEnterTimeRef.current) / 1000
                    );
                questionEnterTimeRef.current = now;
            }

            Object.entries(answers).forEach(([questionId, answer]) => {
                getOrInitMetrics(questionId).selectedAnswer = Array.isArray(
                    answer
                )
                    ? answer.join(",")
                    : answer;
            });

            try {
                const result = await completeExamSession(
                    sessionId,
                    Object.values(metricsVault.current)
                );

                if (result.success) {
                    await clearSessionRecovery(sessionId);
                    onSuccess();
                } else {
                    isSubmittedRef.current = false;
                    onError();
                }
            } catch (error) {
                console.error("Submission error:", error);
                isSubmittedRef.current = false;
                onError();
            }
        },
        [getOrInitMetrics, sessionId]
    );

    useEffect(() => {
        let cancelled = false;
        const now = Date.now();
        questionEnterTimeRef.current = now;
        const firstQuestionId = currentQuestionRef.current;
        if (firstQuestionId) {
            const restoredMetric =
                metricsVault.current[firstQuestionId] ??
                emptyMetrics(firstQuestionId);
            const initialMetric = {
                ...restoredMetric,
                visitCount: restoredMetric.visitCount + 1,
            };
            metricsVault.current[firstQuestionId] = initialMetric;
        }
        void loadSessionRecovery(sessionId).then((recovery) => {
            if (cancelled) return;
            if (!recovery) {
                recoveryReadyRef.current = true;
                return;
            }
            if (recovery.revision <= revisionRef.current) {
                recoveryReadyRef.current = true;
                void clearSessionRecoveryIfAtMost(
                    sessionId,
                    revisionRef.current
                );
                return;
            }

            for (const metric of recovery.metrics) {
                metricsVault.current[metric.questionId] = { ...metric };
            }
            revisionRef.current = recovery.revision;
            const activeMetric =
                metricsVault.current[currentQuestionRef.current];
            if (activeMetric) setCurrentMetrics({ ...activeMetric });
            recoveryReadyRef.current = true;
            setOfflineRecovery(recovery.metrics);
        });
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        timerRef.current = setInterval(() => {
            if (isSubmittedRef.current) return;
            const activeQuestionId = currentQuestionRef.current;
            if (!activeQuestionId) return;
            const timeSpentSeconds = Math.floor(
                (Date.now() - questionEnterTimeRef.current) / 1000
            );
            const baseDwell =
                getOrInitMetrics(activeQuestionId).dwellTimeSeconds;
            setCurrentMetrics((previous) => ({
                ...previous,
                dwellTimeSeconds: baseDwell + timeSpentSeconds,
            }));
        }, 1_000);

        checkpointTimerRef.current = setInterval(
            () => void sendCheckpoint(false),
            CHECKPOINT_INTERVAL_MS
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                void sendCheckpoint(true);
            }
        };
        const handlePageHide = () => void sendCheckpoint(true);
        const handleCheckpointRequest = (event: Event) => {
            const detail = (
                event as CustomEvent<SessionCheckpointRequestDetail>
            ).detail;
            if (!detail?.complete) return;
            void sendCheckpoint(false, true).then(detail.complete);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener(
            SESSION_CHECKPOINT_REQUEST_EVENT,
            handleCheckpointRequest
        );

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (checkpointTimerRef.current) {
                clearInterval(checkpointTimerRef.current);
            }
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener(
                SESSION_CHECKPOINT_REQUEST_EVENT,
                handleCheckpointRequest
            );
            void sendCheckpoint(true);
        };
    }, [getOrInitMetrics, sendCheckpoint, sessionId]);

    return {
        currentMetrics,
        recentActivities,
        offlineRecovery,
        handleNavigation,
        handleAnswerSelection,
        syncAnswers,
        toggleFlag,
        flushAndSubmit,
    };
}
