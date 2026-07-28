import { useState, useRef, useEffect, useCallback } from "react";
import { completeExamSession } from "../actions/session-actions";
import type { RestoredInteraction } from "@/lib/session-interactions";

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
        restoredInteractions.map(({ checkpointRevision: _revision, ...metric }) => [
            metric.questionId,
            metric,
        ])
    );
    const metricsVault = useRef<Record<string, InteractionMetrics>>(restoredVault);
    const currentQuestionRef = useRef(initialQuestionId);
    const questionEnterTimeRef = useRef(Date.now());
    const isSubmittedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkpointInFlightRef = useRef<Promise<void> | null>(null);
    const revisionRef = useRef(
        restoredInteractions.reduce(
            (max, interaction) => Math.max(max, interaction.checkpointRevision),
            0
        )
    );
    const initializedRef = useRef(false);

    if (!initializedRef.current && initialQuestionId) {
        const resumed =
            metricsVault.current[initialQuestionId] ??
            emptyMetrics(initialQuestionId);
        resumed.visitCount += 1;
        metricsVault.current[initialQuestionId] = resumed;
        initializedRef.current = true;
    }

    const [currentMetrics, setCurrentMetrics] = useState<InteractionMetrics>(
        () =>
            metricsVault.current[initialQuestionId] ??
            emptyMetrics(initialQuestionId)
    );
    const [recentActivities, setRecentActivities] = useState<
        Array<{ event: string; time: string }>
    >([]);

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

    const sendCheckpoint = useCallback(
        (useBeacon = false) => {
            if (!sessionId || isSubmittedRef.current) return;

            const metrics = snapshotMetrics();
            if (metrics.length === 0) return;

            const revision = Math.max(
                Date.now(),
                revisionRef.current + 1
            );
            revisionRef.current = revision;
            const body = JSON.stringify({ revision, metrics });
            const url = `/api/sessions/${sessionId}/checkpoint`;

            if (
                useBeacon &&
                typeof navigator !== "undefined" &&
                navigator.sendBeacon
            ) {
                const accepted = navigator.sendBeacon(
                    url,
                    new Blob([body], { type: "application/json" })
                );
                if (accepted) return;
            }

            if (checkpointInFlightRef.current) return;

            const request = fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body,
                credentials: "same-origin",
                keepalive: true,
            })
                .then((response) => {
                    if (!response.ok && response.status !== 409) {
                        throw new Error(
                            `Checkpoint failed with ${response.status}`
                        );
                    }
                })
                .catch((error) => {
                    console.error("Session checkpoint error:", error);
                })
                .finally(() => {
                    checkpointInFlightRef.current = null;
                });

            checkpointInFlightRef.current = request;
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
        },
        [getOrInitMetrics]
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
        },
        [getOrInitMetrics, logActivity]
    );

    const handleAnswerSelection = useCallback(
        (
            questionId: string,
            answer: string,
            isCorrect: boolean,
            _questionType: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE"
        ) => {
            if (isSubmittedRef.current) return;
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
        },
        [getOrInitMetrics, logActivity]
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
        },
        [getOrInitMetrics, logActivity]
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
            () => sendCheckpoint(false),
            CHECKPOINT_INTERVAL_MS
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                sendCheckpoint(true);
            }
        };
        const handlePageHide = () => sendCheckpoint(true);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);

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
            sendCheckpoint(true);
        };
    }, [getOrInitMetrics, sendCheckpoint, sessionId]);

    return {
        currentMetrics,
        recentActivities,
        handleNavigation,
        handleAnswerSelection,
        syncAnswers,
        toggleFlag,
        flushAndSubmit,
    };
}
