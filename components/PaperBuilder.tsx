"use client";

import { useState, useTransition, useRef } from "react";
import {
    Sparkles, Loader2, Plus, CheckCircle2,
    FileText, BookOpen, AlertCircle, Save, Search, X
} from "lucide-react";
import { parsePaperPDF, type ParsedQuestion } from "@/app/(main)/actions/ocr-paper";
import { createQuestionPaper, updateQuestionPaper } from "@/app/(main)/actions/paper-actions";
import { toast } from "sonner";

import QuestionCard, { type QuestionCardHandle } from "./QuestionCard";

// ── Shared Types ──────────────────────────────────────────────────────────────

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
    exams?: { id: string; name: string }[];
    initialPaper?: { id: string; title: string; year: number | null };
    initialQuestions?: Question[];
    linkedExamIds?: string[];
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
        explanation: pq.explanation ?? null,
        topicId: "",
        topicPath: "",
        categoryId: "",
        saved: false,
    };
}

// ── Exam Picker (Fixed Multi-Select) ───────────────────────────────────────────

function ExamPicker({
    exams, value, onChange,
}: {
    exams: { id: string; name: string }[];
    value: string[];
    onChange: (examIds: string[]) => void;
}) {
    const [query, setQuery] = useState("");

    const availableExams = exams.filter(e =>
        !value.includes(e.id) &&
        e.name.toLowerCase().includes(query.toLowerCase())
    );

    const selectedExams = exams.filter(e => value.includes(e.id));

    const toggleExam = (id: string) => {
        if (value.includes(id))
        {
            onChange(value.filter(v => v !== id)); // Remove
        } else
        {
            onChange([...value, id]); // Add
        }
        setQuery(""); // Reset search after picking
    };

    return (
        <div className="relative space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Assign to Exams <span className="font-normal normal-case">— optional</span>
            </label>

            {selectedExams.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedExams.map(exam => (
                        <div key={exam.id} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-purple-50 border border-purple-200 rounded-md">
                            <p className="text-[10px] font-bold text-purple-800">{exam.name}</p>
                            <button
                                type="button"
                                onClick={() => toggleExam(exam.id)}
                                className="text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-sm p-0.5"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                    <Search size={12} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search exams to add..."
                        className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"
                    />
                </div>
                <div className="max-h-32 overflow-y-auto divide-y divide-slate-50">
                    {availableExams.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-3 text-center">No more exams found</p>
                    ) : (
                        availableExams.map(e => (
                            <button
                                key={e.id}
                                type="button"
                                onClick={() => toggleExam(e.id)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                                <p className="text-xs font-medium text-slate-700">{e.name}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Bento Grid ────────────────────────────────────────────────────

function QuestionGrid({
    questions,
    onScrollTo,
    onSaveAll,
}: {
    questions: Question[];
    onScrollTo: (index: number) => void;
    onSaveAll: () => void;
}) {
    const savedCount = questions.filter(q => q.saved).length;
    const unsavedCount = questions.length - savedCount;

    return (
        <div className="sticky top-0 z-10 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Questions · {questions.length}
                </span>
                {unsavedCount > 0 && (
                    <button
                        type="button"
                        onClick={onSaveAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <Save size={12} /> Save all unsaved ({unsavedCount})
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto">
                {questions.map((q, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onScrollTo(i)}
                        title={q.content.slice(0, 60)}
                        className={`w-9 h-9 rounded-lg text-[11px] font-bold transition-transform hover:scale-110 active:scale-95 border ${q.saved
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-600 border-red-200"
                            }`}
                    >
                        {String(q.number).padStart(2, "0")}
                    </button>
                ))}
            </div>

            {questions.length > 0 && (
                <>
                    <div className="flex gap-4 mt-3">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> Saved
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Unsaved
                        </span>
                    </div>
                    <div className="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${questions.length ? (savedCount / questions.length) * 100 : 0}%` }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────

export default function PaperBuilder({
    examId,
    examSlug = "",
    categories = [],
    syllabusEntries = [],
    exams = [],
    initialPaper,
    linkedExamIds,
    initialQuestions = [],
}: PaperBuilderProps) {

    const [title, setTitle] = useState(initialPaper?.title ?? "");
    const [year, setYear] = useState<number | "">(initialPaper?.year ?? "");
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [paperId, setPaperId] = useState<string | null>(initialPaper?.id ?? null);
    //const [paperSaved, setPaperSaved] = useState(!!initialPaper);
    const [paperSaved, setPaperSaved] = useState(false);

    // 🔥 Added the state for our new Multi-Select ExamPicker!
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>(linkedExamIds ?? (examId ? [examId] : []));


    const [isScanning, setIsScanning] = useState(false);
    const [isSavingPaper, startSavingPaper] = useTransition();

    const savedCount = questions.filter(q => q.saved).length;
    const totalCount = questions.length;


    const cardRefs = useRef<(QuestionCardHandle | null)[]>([]);
    const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isSavingAll, setIsSavingAll] = useState(false);

    const scrollToQuestion = (index: number) => {
        scrollRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleSaveAll = async () => {
        setIsSavingAll(true);
        let failedCount = 0;
        let firstFailedIndex: number | null = null;

        try
        {
            const unsaved = questions
                .map((q, i) => ({ q, i }))
                .filter(({ q }) => !q.saved);

            if (unsaved.length === 0) return;

            const CHUNK_SIZE = 15;
            for (let c = 0; c < unsaved.length; c += CHUNK_SIZE)
            {
                const chunk = unsaved.slice(c, c + CHUNK_SIZE);
                const results = await Promise.allSettled(
                    chunk.map(({ i }) => cardRefs.current[i]?.save() ?? Promise.resolve())
                );

                results.forEach((result, ri) => {
                    if (result.status === "rejected")
                    {
                        failedCount++;
                        if (firstFailedIndex === null)
                        {
                            firstFailedIndex = chunk[ri].i;
                        }
                    }
                });
            }

            if (failedCount > 0)
            {
                toast.error(`${failedCount} question(s) couldn't be saved — check them manually.`);
                if (firstFailedIndex !== null)
                {
                    scrollToQuestion(firstFailedIndex);
                }
            } else
            {
                toast.success("All questions saved!");
            }

        } catch (error)
        {
            console.error("Unexpected error during save all:", error);
        } finally
        {
            setIsSavingAll(false);
        }
    };

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
                if (initialPaper)
                {
                    // Update existing paper
                    await updateQuestionPaper(initialPaper.id, {
                        title: title.trim(),
                        year: year || null,
                        examIds: selectedExamIds,
                    }, examSlug);
                    setPaperSaved(true);
                    toast.success("Paper updated!");
                } else
                {
                    // Create new paper
                    const result = await createQuestionPaper({
                        title: title.trim(),
                        year: year || null,
                        examIds: selectedExamIds,
                    }, examSlug);
                    setPaperId(result.id);
                    setPaperSaved(true);
                    toast.success("Paper created — now save your questions");
                }
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

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr] gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                //disabled={paperSaved}
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
                                //disabled={paperSaved}
                                placeholder="2023"
                                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>

                        {/* 🔥 Multi-select Exam Picker! */}
                        {/* {!paperSaved && ( */}
                        <div>
                            <ExamPicker
                                exams={exams}
                                value={selectedExamIds}
                                onChange={setSelectedExamIds}
                            />
                        </div>
                        {/* )} */}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSavePaper}
                            disabled={isSavingPaper || !title.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            {isSavingPaper ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSavingPaper
                                ? (initialPaper ? "Saving..." : "Creating...")
                                : (initialPaper ? "Save Changes" : "Create Paper")
                            }
                        </button>
                        {paperSaved && (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={14} />
                                {initialPaper ? "Changes saved" : "Paper created — add questions below"}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                        <CheckCircle2 size={16} />
                        Paper created — questions will be saved to it
                    </div>
                </div>

                {/* ── Not-saved-paper warning ── */}
                {!paperId && !initialPaper && questions.length > 0 && (
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
                        {questions.length > 0 && (
                            <QuestionGrid
                                questions={questions}
                                onScrollTo={scrollToQuestion}
                                onSaveAll={handleSaveAll}
                            />
                        )}
                        {questions.map((q, i) => (
                            <QuestionCard
                                ref={el => { cardRefs.current[i] = el; }}
                                wrapperRef={el => { scrollRefs.current[i] = el; }}
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