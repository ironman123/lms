import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function TopicStrengthCard({
    title, type, subjects
}: {
    title: string;
    type: "weak" | "strong";
    subjects: { subject: string; accuracy: number; total: number }[];
}) {
    const isWeak = type === "weak";
    return (
        <div className={`bg-white border rounded-2xl p-6 ${isWeak ? "border-amber-100" : "border-green-100"}`}>
            <div className="flex items-center gap-2 mb-1">
                {isWeak
                    ? <AlertCircle size={15} className="text-amber-500" />
                    : <CheckCircle2 size={15} className="text-green-500" />
                }
                <h3 className="font-black text-slate-900 text-sm">{title}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">{isWeak ? "Topics that need more practice" : "Topics where you excel"}</p>
            <div className="space-y-4">
                {subjects.slice(0, 3).map(s => (
                    <div key={s.subject} className={`rounded-xl p-4 border ${isWeak ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-slate-900">{s.subject}</span>
                            <span className="text-xs text-slate-400">{s.total} Qs</span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1">
                            <div
                                className={`h-full rounded-full ${isWeak ? "bg-amber-500" : "bg-green-500"}`}
                                style={{ width: `${s.accuracy}%` }}
                            />
                        </div>
                        <p className={`text-xs font-black ${isWeak ? "text-amber-600" : "text-green-600"}`}>
                            {s.accuracy}%
                        </p>
                    </div>
                ))}
                {subjects.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">No data yet</p>
                )}
            </div>
        </div>
    );
}