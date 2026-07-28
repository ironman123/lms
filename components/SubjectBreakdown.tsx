export default function SubjectBreakdown({ subjects }: {
    subjects: { subject: string; correct: number; total: number; accuracy: number }[]
}) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-black text-foreground mb-1">Subject Analysis</h3>
            <p className="text-xs text-muted-foreground mb-6">Detailed breakdown by subject</p>
            <div className="space-y-5">
                {subjects.map(s => (
                    <div key={s.subject}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-foreground">{s.subject}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{s.correct}/{s.total}</span>
                                <span className="text-sm font-black text-foreground">{s.accuracy}%</span>
                            </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${s.accuracy}%` }}
                            />
                        </div>
                    </div>
                ))}
                {subjects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No subject data yet</p>
                )}
            </div>
        </div>
    );
}