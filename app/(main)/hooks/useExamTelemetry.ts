import { useState, useRef, useEffect, useCallback } from "react";
import { completeExamSession } from "../actions/session-actions";

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

export function useExamTelemetry(sessionId: string, initialQuestionId: string) {
    const metricsVault = useRef<Record<string, InteractionMetrics>>({});
    const currentQuestionRef = useRef(initialQuestionId);
    const questionEnterTimeRef = useRef(Date.now());
    const isSubmittedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [currentMetrics, setCurrentMetrics] = useState<InteractionMetrics>({
        questionId: initialQuestionId,
        visitCount: 1,
        dwellTimeSeconds: 0,
        hesitationCount: 0,
        isFlagged: false,
        selectedAnswer: null,
        isCorrect: null,
        wasHinted: false,
        confidenceLevel: null,
    });
    const [recentActivities, setRecentActivities] = useState<Array<{ event: string; time: string }>>([]);

    const getOrInitMetrics = (qId: string): InteractionMetrics => {
        if (!metricsVault.current[qId])
        {
            metricsVault.current[qId] = {
                questionId: qId,
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
        return metricsVault.current[qId];
    };

    const logActivity = (eventName: string) => {
        setRecentActivities(prev =>
            [{ event: eventName, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5)
        );
    };

    const handleNavigation = useCallback((newQuestionId: string) => {
        if (isSubmittedRef.current) return;
        const now = Date.now();
        const oldQid = currentQuestionRef.current;
        const timeSpentSec = Math.floor((now - questionEnterTimeRef.current) / 1000);

        getOrInitMetrics(oldQid).dwellTimeSeconds += timeSpentSec;

        const newMetrics = getOrInitMetrics(newQuestionId);
        newMetrics.visitCount += 1;

        currentQuestionRef.current = newQuestionId;
        questionEnterTimeRef.current = now;

        setCurrentMetrics({ ...newMetrics });
        logActivity(`NAV → ${newQuestionId.slice(-4)}`);
    }, []);

    const handleAnswerSelection = useCallback((
        questionId: string,
        answer: string,
        isCorrect: boolean,
        questionType: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE"
    ) => {
        if (isSubmittedRef.current) return;
        const metrics = getOrInitMetrics(questionId);

        // 🔥 FIX: Apply hesitation logic to ALL question types
        if (metrics.selectedAnswer !== null && metrics.selectedAnswer !== answer)
        {
            metrics.hesitationCount += 1;
            logActivity(`HESITATED → ${questionId.slice(-4)}`);
        } else
        {
            logActivity(`ANSWERED → ${questionId.slice(-4)}`);
        }

        metrics.selectedAnswer = answer;
        metrics.isCorrect = isCorrect;

        if (currentQuestionRef.current === questionId)
        {
            setCurrentMetrics({ ...metrics });
        }
    }, []);

    const toggleFlag = useCallback((questionId: string) => {
        if (isSubmittedRef.current) return;
        const metrics = getOrInitMetrics(questionId);
        metrics.isFlagged = !metrics.isFlagged;
        if (currentQuestionRef.current === questionId) setCurrentMetrics({ ...metrics });
        logActivity(metrics.isFlagged ? `FLAGGED → ${questionId.slice(-4)}` : `UNFLAGGED → ${questionId.slice(-4)}`);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current)
        {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const flushAndSubmit = useCallback(async (
        answers: Record<string, string | string[]>,
        onSuccess: () => void,
        onError: () => void,
    ) => {
        // 1. Stop the dwell timer immediately
        stopTimer();

        // 2. Prevent double-submissions at the hook level
        if (isSubmittedRef.current) return;
        isSubmittedRef.current = true;

        // 3. Finalize the current question's dwell time
        const now = Date.now();
        const timeSpentSec = Math.floor((now - questionEnterTimeRef.current) / 1000);
        const currentMetrics = getOrInitMetrics(currentQuestionRef.current);
        currentMetrics.dwellTimeSeconds += timeSpentSec;

        // 4. Ensure the vault has the most up-to-date answer strings
        Object.entries(answers).forEach(([qId, answer]) => {
            const m = getOrInitMetrics(qId);
            m.selectedAnswer = Array.isArray(answer) ? answer.join(",") : answer;
        });

        try
        {
            // 5. Explicitly await the server action
            const result = await completeExamSession(sessionId, Object.values(metricsVault.current));

            // If your server action returns a success flag, check it here
            onSuccess();
        } catch (error)
        {
            console.error("Submission error:", error);
            isSubmittedRef.current = false; // Allow retry on failure
            onError();
        }
    }, [sessionId, stopTimer]);

    useEffect(() => {
        if (!sessionId) return;
        timerRef.current = setInterval(() => {
            const timeSpentSec = Math.floor((Date.now() - questionEnterTimeRef.current) / 1000);
            const baseDwell = getOrInitMetrics(currentQuestionRef.current).dwellTimeSeconds;
            setCurrentMetrics(prev => ({ ...prev, dwellTimeSeconds: baseDwell + timeSpentSec }));
        }, 1000);

        return () => stopTimer(); // cleanup on unmount
    }, [stopTimer, sessionId]);

    return {
        currentMetrics,
        recentActivities,
        handleNavigation,
        handleAnswerSelection,
        toggleFlag,
        flushAndSubmit,
    };
}