type ExamEventFields = Record<
    string,
    string | number | boolean | null | undefined
>;

export function logExamEvent(
    event: string,
    fields: ExamEventFields,
    level: "info" | "error" = "info"
) {
    const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        service: "exam-session",
        event,
        ...fields,
    });
    if (level === "error") console.error(entry);
    else console.info(entry);
}

export function elapsedMs(startedAt: number) {
    return Math.round((performance.now() - startedAt) * 10) / 10;
}
