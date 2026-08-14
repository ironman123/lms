import type { ReportCategoryValue } from "@/lib/moderation/schemas";

export type ContentHealthCase = {
    id: string;
    paper: {
        id: string;
        title: string;
        exams: Array<{ id: string; name: string; slug: string }>;
    };
    questionId: string | null;
    isEscalated: boolean;
    updatedAt: Date;
    reports: Array<{
        reporterId: string;
        category: ReportCategoryValue;
        updatedAt: Date;
    }>;
};

export type PaperContentHealth = {
    paperId: string;
    title: string;
    exams: Array<{ id: string; name: string; slug: string }>;
    openCaseCount: number;
    escalatedCaseCount: number;
    affectedQuestionCount: number;
    reportCount: number;
    uniqueReporterCount: number;
    completedAttemptCount: number;
    reportersPerHundredAttempts: number | null;
    topCategories: Array<{ category: ReportCategoryValue; count: number }>;
    lastReportedAt: Date;
};

export type ContentPerformance = {
    startedSessionCount: number;
    completedSessionCount: number;
    completionRate: number | null;
    averageScore: number | null;
    averageAccuracy: number | null;
    averageTimeTakenSecs: number | null;
};

export function buildContentPerformance(
    statusCounts: ReadonlyMap<string, number>,
    completedMetrics: {
        completedSessionCount: number;
        averageScore: number | null;
        averageAccuracy: number | null;
        averageTimeTakenSecs: number | null;
    }
): ContentPerformance {
    const startedSessionCount = [...statusCounts.values()].reduce(
        (total, count) => total + count,
        0
    );
    return {
        startedSessionCount,
        completedSessionCount: completedMetrics.completedSessionCount,
        completionRate:
            startedSessionCount === 0
                ? null
                : Number(
                      (
                          (completedMetrics.completedSessionCount /
                              startedSessionCount) *
                          100
                      ).toFixed(1)
                  ),
        averageScore:
            completedMetrics.averageScore === null
                ? null
                : Number(completedMetrics.averageScore.toFixed(1)),
        averageAccuracy:
            completedMetrics.averageAccuracy === null
                ? null
                : Number(completedMetrics.averageAccuracy.toFixed(1)),
        averageTimeTakenSecs:
            completedMetrics.averageTimeTakenSecs === null
                ? null
                : Math.round(completedMetrics.averageTimeTakenSecs),
    };
}

export type ExamContentHealth = {
    examId: string;
    name: string;
    slug: string;
    paperCount: number;
    openCaseCount: number;
    escalatedCaseCount: number;
    affectedQuestionCount: number;
    reportCount: number;
    uniqueReporterCount: number;
    completedAttemptCount: number;
    reportersPerHundredAttempts: number | null;
};

/**
 * Builds a paper-level moderation queue. Only unresolved cases belong here:
 * resolved history is important, but must not make a currently healthy paper
 * look risky. The rate is deliberately per completed session, not a claim
 * about unique students, because one student may legitimately complete more
 * than one paper session.
 */
export function buildPaperContentHealth(
    cases: ContentHealthCase[],
    completedAttemptsByPaper: Map<string, number>
): PaperContentHealth[] {
    const rows = new Map<
        string,
        PaperContentHealth & {
            reporterIds: Set<string>;
            questionIds: Set<string>;
            categoryCounts: Map<ReportCategoryValue, number>;
        }
    >();

    for (const moderationCase of cases) {
        const existing = rows.get(moderationCase.paper.id) ?? {
            paperId: moderationCase.paper.id,
            title: moderationCase.paper.title,
            exams: moderationCase.paper.exams,
            openCaseCount: 0,
            escalatedCaseCount: 0,
            affectedQuestionCount: 0,
            reportCount: 0,
            uniqueReporterCount: 0,
            completedAttemptCount:
                completedAttemptsByPaper.get(moderationCase.paper.id) ?? 0,
            reportersPerHundredAttempts: null,
            topCategories: [],
            lastReportedAt: moderationCase.updatedAt,
            reporterIds: new Set<string>(),
            questionIds: new Set<string>(),
            categoryCounts: new Map<ReportCategoryValue, number>(),
        };

        existing.openCaseCount += 1;
        existing.escalatedCaseCount += Number(moderationCase.isEscalated);
        if (moderationCase.questionId) {
            existing.questionIds.add(moderationCase.questionId);
        }
        if (moderationCase.updatedAt > existing.lastReportedAt) {
            existing.lastReportedAt = moderationCase.updatedAt;
        }
        for (const report of moderationCase.reports) {
            existing.reportCount += 1;
            existing.reporterIds.add(report.reporterId);
            existing.categoryCounts.set(
                report.category,
                (existing.categoryCounts.get(report.category) ?? 0) + 1
            );
            if (report.updatedAt > existing.lastReportedAt) {
                existing.lastReportedAt = report.updatedAt;
            }
        }
        rows.set(moderationCase.paper.id, existing);
    }

    return [...rows.values()]
        .map(({ reporterIds, questionIds, categoryCounts, ...row }) => {
            const uniqueReporterCount = reporterIds.size;
            const reportersPerHundredAttempts =
                row.completedAttemptCount > 0
                    ? Number(
                          (
                              (uniqueReporterCount /
                                  row.completedAttemptCount) *
                              100
                          ).toFixed(1)
                      )
                    : null;
            return {
                ...row,
                affectedQuestionCount: questionIds.size,
                uniqueReporterCount,
                reportersPerHundredAttempts,
                topCategories: [...categoryCounts.entries()]
                    .sort((left, right) => right[1] - left[1])
                    .slice(0, 3)
                    .map(([category, count]) => ({ category, count })),
            };
        })
        .sort(
            (left, right) =>
                right.escalatedCaseCount - left.escalatedCaseCount ||
                right.uniqueReporterCount - left.uniqueReporterCount ||
                right.reportCount - left.reportCount ||
                right.lastReportedAt.getTime() - left.lastReportedAt.getTime()
        );
}

/** A paper may intentionally be linked to more than one exam. Its moderation
 * evidence is relevant to each of those exam health views, while reporters are
 * still deduplicated within each exam. Completed attempts use the frozen
 * TestSession.examId attribution, never inferred current paper links. */
export function buildExamContentHealth(
    papers: Array<
        PaperContentHealth & { reporterIds?: readonly string[]; questionIds?: readonly string[] }
    >,
    completedAttemptsByExam: Map<string, number>,
    reporterIdsByPaper: Map<string, ReadonlySet<string>>,
    questionIdsByPaper: Map<string, ReadonlySet<string>>
): ExamContentHealth[] {
    const rows = new Map<
        string,
        ExamContentHealth & {
            reporterIds: Set<string>;
            questionIds: Set<string>;
            paperIds: Set<string>;
        }
    >();
    for (const paper of papers) {
        for (const exam of paper.exams) {
            const existing = rows.get(exam.id) ?? {
                examId: exam.id,
                name: exam.name,
                slug: exam.slug,
                paperCount: 0,
                openCaseCount: 0,
                escalatedCaseCount: 0,
                affectedQuestionCount: 0,
                reportCount: 0,
                uniqueReporterCount: 0,
                completedAttemptCount: completedAttemptsByExam.get(exam.id) ?? 0,
                reportersPerHundredAttempts: null,
                reporterIds: new Set<string>(),
                questionIds: new Set<string>(),
                paperIds: new Set<string>(),
            };
            existing.paperIds.add(paper.paperId);
            existing.openCaseCount += paper.openCaseCount;
            existing.escalatedCaseCount += paper.escalatedCaseCount;
            existing.reportCount += paper.reportCount;
            for (const reporterId of reporterIdsByPaper.get(paper.paperId) ?? []) {
                existing.reporterIds.add(reporterId);
            }
            for (const questionId of questionIdsByPaper.get(paper.paperId) ?? []) {
                existing.questionIds.add(questionId);
            }
            rows.set(exam.id, existing);
        }
    }
    return [...rows.values()]
        .map(({ reporterIds, questionIds, paperIds, ...row }) => {
            const uniqueReporterCount = reporterIds.size;
            return {
                ...row,
                paperCount: paperIds.size,
                affectedQuestionCount: questionIds.size,
                uniqueReporterCount,
                reportersPerHundredAttempts:
                    row.completedAttemptCount > 0
                        ? Number(
                              (
                                  (uniqueReporterCount /
                                      row.completedAttemptCount) *
                                  100
                              ).toFixed(1)
                          )
                        : null,
            };
        })
        .sort(
            (left, right) =>
                right.escalatedCaseCount - left.escalatedCaseCount ||
                right.uniqueReporterCount - left.uniqueReporterCount ||
                right.reportCount - left.reportCount ||
                left.name.localeCompare(right.name)
        );
}
