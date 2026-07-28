"use client";

import { useState, useTransition, useMemo } from "react";
import { updateProfile } from "@/app/(main)/actions/profile-actions";
import { Search, CheckCircle2, Circle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Exam {
    id: string;
    name: string;
    slug: string;
    examCategory: { name: string } | null;
}

interface Props {
    exams: Exam[];
    defaultValues: {
        name: string;
        targetExams: string[];
        college: string;
        region: string;
    };
}

const REGIONS = [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
];

export default function SettingsForm({ exams, defaultValues }: Props) {
    const [name, setName] = useState(defaultValues.name);
    const [selectedExams, setSelectedExams] = useState<string[]>(defaultValues.targetExams || []);
    const [college, setCollege] = useState(defaultValues.college);
    const [region, setRegion] = useState(defaultValues.region);
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();

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

    const handleSave = () => {
        if (!name.trim()) { toast.error("Name cannot be empty."); return; }
        startTransition(async () => {
            const result = await updateProfile({ name, targetExams: selectedExams, college, region });
            if (result.success)
            {
                toast.success("Profile saved.");
            } else
            {
                toast.error(result.error ?? "Failed to save.");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Profile */}
            <div className="bg-card rounded-3xl border border-border p-6 space-y-5">
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Profile</h2>

                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-border text-sm font-bold outline-none focus:border-foreground transition-colors"
                    />
                </div>

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

            {/* Target Exams */}
            <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Target Exams</h2>
                    {selectedExams.length > 0 && (
                        <span className="text-xs font-bold text-muted-foreground">
                            {selectedExams.length} selected
                        </span>
                    )}
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

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
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
                                    selected ? "border-foreground bg-background" : "border-border/60 hover:border-border"
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
                                        <p className="text-[10px] text-muted-foreground">{exam.examCategory.name}</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
                {isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                    <><Check size={16} /> Save changes</>
                )}
            </button>
        </div>
    );
}