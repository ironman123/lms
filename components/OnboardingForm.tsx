"use client";

import { useState, useTransition, useMemo } from "react";
import { completeOnboarding } from "@/app/(main)/actions/onboarding-actions";
import { Search, CheckCircle2, Circle, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exam {
    id: string;
    name: string;
    slug: string;
    examCategory: { name: string } | null;
}

interface Props {
    exams: Exam[];
    defaultName: string;
}

const REGIONS = [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
];

export default function OnboardingForm({ exams, defaultName }: Props) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState(defaultName);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [college, setCollege] = useState("");
    const [region, setRegion] = useState("");
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const filteredExams = useMemo(() => {
        if (!query.trim()) return exams;
        const q = query.toLowerCase();
        return exams.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.examCategory?.name.toLowerCase().includes(q)
        );
    }, [exams, query]);

    const toggleExam = (id: string) => {
        setSelectedExams((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        startTransition(async () => {
            const result = await completeOnboarding({
                name,
                targetExams: selectedExams,
                college: college || undefined,
                region: region || undefined,
            });
            if (result && !result.success) setError(result.error ?? "Something went wrong.");
        });
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div
                                className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors",
                                    step >= s
                                        ? "bg-slate-900 text-white"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {s}
                            </div>
                            {s < 3 && (
                                <div
                                    className={cn(
                                        "h-0.5 flex-1 transition-colors",
                                        step > s ? "bg-slate-900" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">

                    {/* ── Step 1: Name ── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Step 1 of 3</p>
                                <h1 className="text-2xl font-black text-foreground">What should we call you?</h1>
                                <p className="text-sm text-muted-foreground mt-1">This is how your name appears across the platform.</p>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full h-12 px-4 rounded-2xl border-2 border-border text-sm font-bold outline-none focus:border-foreground transition-colors"
                                    autoFocus
                                />
                                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                            </div>
                            <button
                                onClick={() => {
                                    if (!name.trim()) { setError("Please enter your name."); return; }
                                    setError("");
                                    setStep(2);
                                }}
                                className="w-full h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ── Step 2: Target Exams ── */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Step 2 of 3</p>
                                <h1 className="text-2xl font-black text-foreground">Which exams are you preparing for?</h1>
                                <p className="text-sm text-muted-foreground mt-1">Select all that apply. You can change this later.</p>
                            </div>

                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search exams..."
                                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-border text-sm outline-none focus:border-slate-400 transition-colors bg-background"
                                />
                            </div>

                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {filteredExams.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-6">No exams found.</p>
                                )}
                                {filteredExams.map((exam) => {
                                    const selected = selectedExams.includes(exam.id);
                                    return (
                                        <button
                                            key={exam.id}
                                            onClick={() => toggleExam(exam.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                                selected
                                                    ? "border-foreground bg-background"
                                                    : "border-border/60 hover:border-border"
                                            )}
                                        >
                                            {selected ? (
                                                <CheckCircle2 size={18} className="text-foreground shrink-0" />
                                            ) : (
                                                <Circle size={18} className="text-muted-foreground/60 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{exam.name}</p>
                                                {exam.examCategory && (
                                                    <p className="text-[10px] text-muted-foreground font-medium">{exam.examCategory.name}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedExams.length > 0 && (
                                <p className="text-xs font-bold text-muted-foreground">
                                    {selectedExams.length} exam{selectedExams.length > 1 ? "s" : ""} selected
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 h-12 border border-border text-muted-foreground rounded-2xl font-bold text-sm hover:border-slate-400 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Optional details ── */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Step 3 of 3 · Optional</p>
                                <h1 className="text-2xl font-black text-foreground">A little more about you</h1>
                                <p className="text-sm text-muted-foreground mt-1">Helps us personalise your experience. Skip if you prefer.</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">College / Institution</label>
                                    <input
                                        type="text"
                                        value={college}
                                        onChange={(e) => setCollege(e.target.value)}
                                        placeholder="e.g. University of Mysore"
                                        className="w-full h-11 px-4 rounded-xl border border-border text-sm outline-none focus:border-slate-400 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">State</label>
                                    <select
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-border text-sm outline-none focus:border-slate-400 transition-colors bg-card"
                                    >
                                        <option value="">Select your state</option>
                                        {REGIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 h-12 border border-border text-muted-foreground rounded-2xl font-bold text-sm hover:border-slate-400 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                    className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isPending ? (
                                        <><Loader2 size={16} className="animate-spin" /> Setting up...</>
                                    ) : (
                                        "Finish setup"
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isPending}
                                className="w-full text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}