import { useState, useRef, useEffect, useCallback } from "react";

// The exact shape of the data we will send to the database
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
    // 1. THE LOCAL VAULT (using refs so we don't cause UI lag)
    const metricsVault = useRef<Record<string, InteractionMetrics>>({});

    // 2. TIMERS
    const currentQuestionRef = useRef(initialQuestionId);
    const questionEnterTimeRef = useRef(Date.now());

    // 3. UI STATE (Just for your DevMetricsOverlay)
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

    const [recentActivities, setRecentActivities] = useState<Array<{ event: string, time: string }>>([]);

    // --- HELPER: Initialize or get a question's metrics ---
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

    // --- HELPER: Log Activity ---
    const logActivity = (eventName: string) => {
        setRecentActivities(prev => {
            const newLog = [{ event: eventName, time: new Date().toLocaleTimeString() }, ...prev];
            return newLog.slice(0, 5); // Keep only the last 5 logs for the UI
        });
    };

    // --- CORE ACTION: Navigation (Handles Dwell Time & Visits) ---
    const handleNavigation = useCallback((newQuestionId: string) => {
        const now = Date.now();
        const oldQid = currentQuestionRef.current;

        // 1. Calculate time spent on the LEAVING question
        const timeSpentMs = now - questionEnterTimeRef.current;
        const timeSpentSec = Math.floor(timeSpentMs / 1000);

        const oldMetrics = getOrInitMetrics(oldQid);
        oldMetrics.dwellTimeSeconds += timeSpentSec;

        // 2. Set up the ENTERING question
        const newMetrics = getOrInitMetrics(newQuestionId);
        newMetrics.visitCount += 1;

        // 3. Update our refs for the next cycle
        currentQuestionRef.current = newQuestionId;
        questionEnterTimeRef.current = now;

        // 4. Update UI state
        setCurrentMetrics({ ...newMetrics });
        logActivity(`MapsD_TO_${newQuestionId.slice(-4)}`);

    }, []);

    // --- CORE ACTION: Answer Selection (Handles Hesitations) ---
    const handleAnswerSelection = useCallback((questionId: string, optionId: string, isCorrect: boolean) => {
        const metrics = getOrInitMetrics(questionId);

        // Check for hesitation: Did they already have an answer, and is it different?
        if (metrics.selectedAnswer !== null && metrics.selectedAnswer !== optionId)
        {
            metrics.hesitationCount += 1;
            logActivity(`HESITATED_ON_${questionId.slice(-4)}`);
        } else
        {
            logActivity(`ANSWERED_${questionId.slice(-4)}`);
        }

        // Update the metrics
        metrics.selectedAnswer = optionId;
        metrics.isCorrect = isCorrect;

        // Update UI if it's the current question
        if (currentQuestionRef.current === questionId)
        {
            setCurrentMetrics({ ...metrics });
        }
    }, []);

    // --- CORE ACTION: Toggles ---
    const toggleFlag = useCallback((questionId: string) => {
        const metrics = getOrInitMetrics(questionId);
        metrics.isFlagged = !metrics.isFlagged;

        if (currentQuestionRef.current === questionId)
        {
            setCurrentMetrics({ ...metrics });
        }
        logActivity(metrics.isFlagged ? `FLAGGED_${questionId.slice(-4)}` : `UNFLAGGED_${questionId.slice(-4)}`);
    }, []);

    // Initial setup
    useEffect(() => {
        const initMetrics = getOrInitMetrics(initialQuestionId);
        initMetrics.visitCount = 1;
        setCurrentMetrics({ ...initMetrics });
        logActivity("SESSION_STARTED");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A live timer just for the Dev Overlay UI (updates every second)
    useEffect(() => {
        const interval = setInterval(() => {
            const timeSpentSec = Math.floor((Date.now() - questionEnterTimeRef.current) / 1000);
            const baseDwell = getOrInitMetrics(currentQuestionRef.current).dwellTimeSeconds;

            setCurrentMetrics(prev => ({
                ...prev,
                dwellTimeSeconds: baseDwell + timeSpentSec
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return {
        currentMetrics,
        recentActivities,
        handleNavigation,
        handleAnswerSelection,
        toggleFlag,
        // We will add `flushToDatabase` here in the next step!
    };
}