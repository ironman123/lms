export default function SubjectBreakdown({ subjects }: {
    subjects: { subject: string; correct: number; total: number; accuracy: number }[]
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-900 mb-1">Subject Analysis</h3>
            <p className="text-xs text-slate-400 mb-6">Detailed breakdown by subject</p>
            <div className="space-y-5">
                {subjects.map(s => (
                    <div key={s.subject}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-slate-900">{s.subject}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">{s.correct}/{s.total}</span>
                                <span className="text-sm font-black text-slate-900">{s.accuracy}%</span>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${s.accuracy}%` }}
                            />
                        </div>
                    </div>
                ))}
                {subjects.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No subject data yet</p>
                )}
            </div>
        </div>
    );
}