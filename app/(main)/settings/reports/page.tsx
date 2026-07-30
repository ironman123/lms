import { MessageSquareWarning } from "lucide-react";
import WithdrawReportButton from "@/components/WithdrawReportButton";
import { requireAuth } from "@/lib/auth";
import { getUserContentReports } from "@/lib/moderation/report-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";
import { cn } from "@/lib/utils";

export default async function MyReportsPage() {
    const user = await requireAuth();
    const reports = await getUserContentReports(user.id);

    return (
        <main className="mx-auto max-w-4xl px-4 py-10 pb-32 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Content feedback
            </p>
            <h1 className="mt-2 text-3xl font-black">My reports</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Review the content issues you submitted and withdraw reports
                that are no longer relevant.
            </p>

            {reports.length === 0 ? (
                <div className="mt-8 grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                    <div>
                        <MessageSquareWarning
                            className="mx-auto text-muted-foreground"
                            size={32}
                        />
                        <h2 className="mt-4 font-black">No reports yet</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Reports you submit during sessions or reviews will
                            appear here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-8 space-y-3">
                    {reports.map((report) => {
                        const moderationCase = report.moderationCase;
                        const title =
                            moderationCase.question?.content ??
                            moderationCase.paper?.title ??
                            "Unavailable content";
                        const paperTitle =
                            moderationCase.question?.paper?.title;
                        return (
                            <article
                                key={report.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                            >
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                                                {
                                                    REPORT_CATEGORY_LABELS[
                                                        report.category
                                                    ]
                                                }
                                            </span>
                                            <span
                                                className={cn(
                                                    "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                                                    report.withdrawnAt
                                                        ? "bg-muted text-muted-foreground"
                                                        : moderationCase.status ===
                                                            "RESOLVED"
                                                          ? "bg-success/10 text-success"
                                                          : moderationCase.status ===
                                                              "DISMISSED"
                                                            ? "bg-destructive/10 text-destructive"
                                                            : "bg-warning/10 text-warning"
                                                )}
                                            >
                                                {report.withdrawnAt
                                                    ? "Withdrawn"
                                                    : moderationCase.status.replace(
                                                          "_",
                                                          " "
                                                      )}
                                            </span>
                                        </div>
                                        <h2 className="mt-3 line-clamp-2 font-black leading-snug">
                                            {title}
                                        </h2>
                                        {paperTitle && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {paperTitle}
                                            </p>
                                        )}
                                        {report.comment && (
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
                                                {report.comment}
                                            </p>
                                        )}
                                        {moderationCase.resolutionNote && (
                                            <p className="mt-3 rounded-xl bg-muted/45 p-3 text-xs leading-relaxed text-foreground">
                                                <span className="font-black">
                                                    Admin response:
                                                </span>{" "}
                                                {
                                                    moderationCase.resolutionNote
                                                }
                                            </p>
                                        )}
                                    </div>
                                    {!report.withdrawnAt &&
                                        moderationCase.status !== "RESOLVED" &&
                                        moderationCase.status !==
                                            "DISMISSED" && (
                                            <WithdrawReportButton
                                                reportId={report.id}
                                            />
                                        )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
