"use client";

import { useState, useTransition } from "react";
import {
    Sparkles, Loader2, Plus, CheckCircle2,
    FileText, BookOpen, AlertCircle, Save
} from "lucide-react";
import { parsePaperPDF, type ParsedQuestion } from "@/app/(main)/actions/ocr-paper";
import { createQuestionPaper } from "@/app/(main)/actions/paper-actions";
import { toast } from "sonner";

import QuestionCard from "./QuestionCard";

// ── Shared Types (Exported so QuestionCard can use them) ──────────────

export interface Option {
    label: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id?: string;
    number: number;
    content: string;
    type: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    marks: number;
    negativeMarks: number;
    options: Option[];
    correctAnswer: string | null;
    explanation: string | null;
    saved: boolean;
    topicId: string;
    topicPath: string;
    categoryId: string;
}

export interface SyllabusEntry {
    id: string;
    topicPath: string;
    categoryId: string;
    category: { name: string };
    topicId: string | null;
}

export interface PaperBuilderProps {
    examId?: string;
    examSlug?: string;
    categories?: { id: string; name: string }[];
    syllabusEntries?: SyllabusEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────

function emptyQuestion(number: number): Question {
    return {
        number,
        content: "",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0,
        options: [
            { label: "A", text: "", isCorrect: false },
            { label: "B", text: "", isCorrect: false },
            { label: "C", text: "", isCorrect: false },
            { label: "D", text: "", isCorrect: false },
        ],
        correctAnswer: null,
        explanation: null,
        saved: false,
        topicId: "",
        topicPath: "",
        categoryId: "",
    };
}

function parsedToQuestion(pq: ParsedQuestion, index: number): Question {
    const options: Option[] = pq.options.map(o => ({
        label: o.label,
        text: o.text,
        isCorrect: pq.correctAnswer === o.label,
    }));

    while (options.length < 4)
    {
        options.push({
            label: String.fromCharCode(65 + options.length),
            text: "",
            isCorrect: false,
        });
    }

    return {
        number: pq.number || index + 1,
        content: pq.content,
        type: pq.type,
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0,
        options,
        correctAnswer: pq.correctAnswer,
        explanation: null,
        topicId: "",
        topicPath: "",
        categoryId: "",
        saved: false,
    };
}

// ── Main Component ────────────────────────────────────────────────────

export default function PaperBuilder({
    examId,
    examSlug = "",
    categories = [],
    syllabusEntries = []
}: PaperBuilderProps) {

    const [title, setTitle] = useState("");
    const [year, setYear] = useState<number | "">("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [paperId, setPaperId] = useState<string | null>(null);
    const [paperSaved, setPaperSaved] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [isSavingPaper, startSavingPaper] = useTransition();

    const savedCount = questions.filter(q => q.saved).length;
    const totalCount = questions.length;

    const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading("Scanning paper — extracting questions...");

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try
            {
                const result = await parsePaperPDF(base64);
                if (!result.success)
                {
                    toast.error(result.error, { id: toastId });
                    return;
                }

                const d = result.data;
                if (d.title) setTitle(d.title);
                if (d.year) setYear(d.year);

                if (d.questions.length > 0)
                {
                    const parsed = d.questions.map((pq, i) => parsedToQuestion(pq, i));
                    setQuestions(parsed);
                    toast.success(
                        `Imported: "${d.title ?? "paper"}" · ${d.questions.length} questions extracted`,
                        { id: toastId }
                    );
                } else
                {
                    toast.warning("No questions found — fill in manually", { id: toastId });
                }
            } catch (err: any)
            {
                toast.error(`Failed: ${err.message}`, { id: toastId });
            } finally
            {
                setIsScanning(false);
                e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSavePaper = () => {
        if (!title.trim())
        {
            toast.error("Paper title is required");
            return;
        }

        startSavingPaper(async () => {
            try
            {
                const result = await createQuestionPaper({
                    title: title.trim(),
                    year: year || null,
                    examId: examId ?? null,
                }, examSlug);

                setPaperId(result.id);
                setPaperSaved(true);
                toast.success("Paper created — now save your questions");
            } catch (err: any)
            {
                toast.error(`Failed: ${err.message}`);
            }
        });
    };

    const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion(prev.length + 1)]);
    const updateQuestion_ = (index: number, updated: Question) => setQuestions(prev => prev.map((q, i) => i === index ? updated : q));
    const deleteQuestion_ = (index: number) => setQuestions(prev => {
        const next = prev.filter((_, i) => i !== index);
        return next.map((q, i) => ({ ...q, number: i + 1 }));
    });

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

                {/* ── Header bar ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Paper Builder</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {paperSaved ? `${savedCount}/${totalCount} questions saved` : "Create paper, then save questions"}
                        </p>
                    </div>

                    {/* Magic Import */}
                    <div>
                        <input
                            type="file"
                            id="paper-upload"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={handleMagicImport}
                        />
                        <button
                            type="button"
                            disabled={isScanning}
                            onClick={() => document.getElementById("paper-upload")?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 shadow-sm shadow-violet-200"
                        >
                            {isScanning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                            {isScanning ? "Scanning..." : "Magic Import"}
                        </button>
                    </div>
                </div>

                {/* ── Paper metadata card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-widest">
                        <FileText size={14} className="text-slate-400" />
                        Paper Details
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                disabled={paperSaved}
                                placeholder="e.g. KPSC Assistant Grade II - 2023"
                                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Year</label>
                            <input
                                type="number"
                                value={year}
                                onChange={e => setYear(e.target.value ? parseInt(e.target.value) : "")}
                                disabled={paperSaved}
                                placeholder="2023"
                                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                    </div>

                    {!paperSaved ? (
                        <button
                            type="button"
                            onClick={handleSavePaper}
                            disabled={isSavingPaper || !title.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            {isSavingPaper ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSavingPaper ? "Creating..." : "Create Paper"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                            <CheckCircle2 size={16} />
                            Paper created — questions will be saved to it
                        </div>
                    )}
                </div>

                {/* ── Not-saved-paper warning ── */}
                {!paperSaved && questions.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <AlertCircle size={16} className="shrink-0" />
                        Create the paper first, then use "Save Question" on each question below.
                    </div>
                )}

                {/* ── Questions ── */}
                {questions.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Questions · {totalCount}
                            </span>
                            {paperSaved && (
                                <span className="text-[10px] font-bold text-emerald-600">
                                    {savedCount} saved
                                </span>
                            )}
                        </div>

                        {questions.map((q, i) => (
                            <QuestionCard
                                key={i}
                                q={q}
                                index={i}
                                paperId={paperId}
                                examSlug={examSlug}
                                syllabusEntries={syllabusEntries}
                                onUpdate={updated => updateQuestion_(i, updated)}
                                onDelete={() => deleteQuestion_(i)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Empty state ── */}
                {questions.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                        <BookOpen className="mx-auto mb-3 text-slate-200" size={36} />
                        <p className="font-bold text-slate-400">No questions yet</p>
                        <p className="text-sm text-slate-300 mt-1">Use Magic Import or add manually</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full h-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors font-bold text-sm flex items-center justify-center gap-2 bg-white"
                >
                    <Plus size={16} /> Add Question
                </button>

            </div>
        </div>
    );
}