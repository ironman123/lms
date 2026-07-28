"use client";

import { useState, useEffect, useTransition } from "react";
import { createBundle } from "@/app/(main)/actions/purchase-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exam { id: string; name: string; slug: string; }
interface Paper { id: string; title: string; year: number | null; }

export default function CreateBundleForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [exams, setExams] = useState<Exam[]>([]);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loadingPapers, setLoadingPapers] = useState(false);
    const [examId, setExamId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [bundleType, setBundleType] = useState<"FULL_ACCESS" | "MOCK_PACK">("FULL_ACCESS");
    const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
    const [priceRupees, setPriceRupees] = useState<number>(99);
    const [validDays, setValidDays] = useState<string>("");

    useEffect(() => {
        fetch("/api/admin/exams")
            .then((r) => r.json())
            .then((data) => Array.isArray(data) ? setExams(data) : setExams([]))
            .catch(() => toast.error("Failed to load exams."));
    }, []);

    useEffect(() => {
        if (!examId) { setPapers([]); return; }
        setLoadingPapers(true);
        fetch(`/api/admin/papers?examId=${examId}`)
            .then((r) => r.json())
            .then(setPapers)
            .catch(() => toast.error("Failed to load papers."))
            .finally(() => setLoadingPapers(false));
    }, [examId]);

    const togglePaper = (id: string) =>
        setSelectedPapers((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const handleSubmit = () => {
        if (!examId) { toast.error("Select an exam."); return; }
        if (!name.trim()) { toast.error("Bundle name is required."); return; }
        if (priceRupees <= 0) { toast.error("Price must be greater than 0."); return; }
        if (bundleType === "MOCK_PACK" && selectedPapers.length === 0)
        {
            toast.error("Select at least one paper for a Mock Pack."); return;
        }

        startTransition(async () => {
            const result = await createBundle({
                name, description, examId, bundleType,
                paperIds: selectedPapers,
                priceRupees,
                validDays: validDays ? parseInt(validDays) : undefined,
            });
            if (result.success)
            {
                toast.success("Bundle created.");
                router.push("/library/bundles");
            } else
            {
                toast.error(result.error ?? "Failed to create bundle.");
            }
        });
    };

    return (
        <div className="space-y-5">
            <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
                <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Exam</h2>
                <select
                    value={examId}
                    onChange={(e) => { setExamId(e.target.value); setSelectedPapers([]); }}
                    className="w-full h-11 px-4 rounded-xl border border-border text-sm outline-none focus:border-foreground transition-colors bg-card"
                >
                    <option value="">Select exam...</option>
                    {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>

            <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
                <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Details</h2>
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Bundle Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. KPSC Assistant Grade II — Mock Pack"
                        className="w-full h-11 px-4 rounded-xl border border-border text-sm outline-none focus:border-foreground transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Description (optional)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        rows={2} placeholder="Short description for the subscription page"
                        className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-foreground transition-colors resize-none" />
                </div>
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-2">Bundle Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(["FULL_ACCESS", "MOCK_PACK"] as const).map((type) => (
                            <button key={type} onClick={() => { setBundleType(type); setSelectedPapers([]); }}
                                className={cn("p-3 rounded-xl border-2 text-sm font-bold transition-all text-left",
                                    bundleType === type ? "border-foreground bg-slate-900 text-white" : "border-border text-muted-foreground hover:border-slate-400")}>
                                {type === "FULL_ACCESS" ? "Full Access" : "Mock Pack"}
                                <p className={cn("text-[10px] font-normal mt-0.5", bundleType === type ? "text-muted-foreground/60" : "text-muted-foreground")}>
                                    {type === "FULL_ACCESS" ? "All current & future papers" : "Specific papers only"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {bundleType === "MOCK_PACK" && examId && (
                <div className="bg-card rounded-3xl border border-border p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Select Papers</h2>
                        {selectedPapers.length > 0 && <span className="text-xs font-bold text-muted-foreground">{selectedPapers.length} selected</span>}
                    </div>
                    {loadingPapers ? (
                        <div className="flex items-center gap-2 py-4 text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" /><span className="text-sm">Loading papers...</span>
                        </div>
                    ) : papers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No papers found for this exam.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {papers.map((p) => {
                                const sel = selectedPapers.includes(p.id);
                                return (
                                    <button key={p.id} onClick={() => togglePaper(p.id)}
                                        className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                            sel ? "border-foreground bg-background" : "border-border/60 hover:border-border")}>
                                        <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                            sel ? "bg-slate-900 border-foreground" : "border-slate-300")}>
                                            {sel && <div className="w-2 h-2 bg-card rounded-sm" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">{p.title}</p>
                                            {p.year && <p className="text-[10px] text-muted-foreground">{p.year}</p>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
                <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pricing</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Price (₹)</label>
                        <input type="number" min={1} step={1} value={priceRupees}
                            onChange={(e) => setPriceRupees(Number(e.target.value))}
                            className="w-full h-11 px-4 rounded-xl border border-border text-sm font-bold outline-none focus:border-foreground transition-colors" />
                    </div>
                    <div>
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">
                            Valid for (days) <span className="normal-case font-normal text-muted-foreground">— blank = lifetime</span>
                        </label>
                        <input type="number" min={1} value={validDays} onChange={(e) => setValidDays(e.target.value)}
                            placeholder="Lifetime"
                            className="w-full h-11 px-4 rounded-xl border border-border text-sm outline-none focus:border-foreground transition-colors" />
                    </div>
                </div>
            </div>

            <button onClick={handleSubmit} disabled={isPending}
                className="w-full h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {isPending ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : "Create Bundle"}
            </button>
        </div>
    );
}