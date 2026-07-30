"use client";

import { useState, useTransition, useRef } from "react";
import {
    Sparkles, Loader2, Plus, CheckCircle2,
    FileText, BookOpen, AlertCircle, Save, Search, X, FileJson, Download
} from "lucide-react";
import { parsePaperPDF, type ParsedQuestion } from "@/app/(main)/actions/ocr-paper";
import { createQuestionPaper, updateQuestionPaper } from "@/app/(main)/actions/paper-actions";
import { toast } from "sonner";
import { QuestionPaperType } from "@prisma/client";
import QuestionCard, { type QuestionCardHandle } from "./QuestionCard";
import {
    PAPER_JSON_TEMPLATE,
    normalizePaperJsonQuestion,
    parsePaperJsonImport,
} from "@/lib/paper-json-import";

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface Option {
    index: number;       // 0-based position
    label: string;       // "A", "B", "C", "D" — display only, derived from index
    text: string;
    imageUrl?: string;
}

export interface Question {
    clientId: string;
    id?: string;
    number: number;
    content: string;
    type: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    marks: number;
    negativeMarks: number;
    explanation: string | null;
    saved: boolean;
    topicId: string;
    topicPath: string;
    categoryId: string;

    // MCQ / MSQ
    options: Option[];
    correctOptions: number[];   // [2] for MCQ, [0,2] for MSQ, [] otherwise

    // NUMERICAL
    exactAnswer: number | null;
    answerMin: number | null;
    answerMax: number | null;

    // SUBJECTIVE
    modelAnswer: string | null;
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
    initialPaper?: { id: string; title: string; year: number | null; type: QuestionPaperType };
    initialQuestions?: Question[];
    linkedExamIds?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────

function createClientId() {
    return globalThis.crypto?.randomUUID?.()
        ?? `question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown error";
}

function emptyQuestion(number: number): Question {
    return {
        clientId: createClientId(),
        number,
        content: "",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0,
        explanation: null,
        saved: false,
        topicId: "",
        topicPath: "",
        categoryId: "",
        options: [
            { index: 0, label: "A", text: "" },
            { index: 1, label: "B", text: "" },
            { index: 2, label: "C", text: "" },
            { index: 3, label: "D", text: "" },
        ],
        correctOptions: [],
        exactAnswer: null,
        answerMin: null,
        answerMax: null,
        modelAnswer: null,
    };
}

function parsedToQuestion(pq: ParsedQuestion, index: number): Question {
    const options: Option[] = pq.options.map((o, i) => ({
        index: i,
        label: String.fromCharCode(65 + i), // A, B, C, D
        text: o.text,
    }));

    while (options.length < 4)
    {
        const i = options.length;
        options.push({ index: i, label: String.fromCharCode(65 + i), text: "" });
    }
    const correctOptions: number[] = pq.correctAnswer
        ? pq.correctAnswer
            .split(",")                                    // handles MSQ: "A,C"
            .map((label) => label.trim().toUpperCase())
            .map((label) => label.charCodeAt(0) - 65)     // "A"→0, "B"→1
            .filter((idx) => idx >= 0 && idx < options.length)
        : [];

    return {
        clientId: createClientId(),
        number: pq.number || index + 1,
        content: pq.content,
        type: pq.type,
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0,
        explanation: pq.explanation ?? null,
        topicId: "",
        topicPath: "",
        categoryId: "",
        saved: false,

        options,
        correctOptions,

        exactAnswer: null,
        answerMin: null,
        answerMax: null,
        modelAnswer: null
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
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Assign to Exams <span className="font-normal normal-case">— optional</span>
            </label>

            {selectedExams.length === 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <p className="text-xs font-bold text-blue-800">
                        Standalone topic paper
                    </p>
                    <p className="mt-0.5 text-[10px] text-blue-600">
                        This paper stays in the paper library without belonging to an exam.
                    </p>
                </div>
            )}

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

            <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
                    <Search size={12} className="text-muted-foreground shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search exams to add..."
                        className="flex-1 text-sm outline-none text-foreground/80 placeholder:text-muted-foreground/60"
                    />
                </div>
                <div className="max-h-32 overflow-y-auto divide-y divide-border/60">
                    {availableExams.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-3 text-center">No more exams found</p>
                    ) : (
                        availableExams.map(e => (
                            <button
                                key={e.id}
                                type="button"
                                onClick={() => toggleExam(e.id)}
                                className="w-full text-left px-3 py-2 hover:bg-background transition-colors"
                            >
                                <p className="text-xs font-medium text-foreground/80">{e.name}</p>
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
    isSaving,
}: {
    questions: Question[];
    onScrollTo: (index: number) => void;
    onSaveAll: () => void;
    isSaving: boolean;
}) {
    const savedCount = questions.filter(q => q.saved).length;
    const unsavedCount = questions.length - savedCount;

    return (
        <div className="sticky top-0 z-10 bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                    Questions · {questions.length}
                </span>
                {unsavedCount > 0 && (
                    <button
                        type="button"
                        onClick={onSaveAll}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        {isSaving ? "Saving..." : `Save all unsaved (${unsavedCount})`}
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto">
                {questions.map((q, i) => (
                    <button
                        key={q.clientId}
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
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> Saved
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Unsaved
                        </span>
                    </div>
                    <div className="mt-2.5 h-1 bg-muted rounded-full overflow-hidden">
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
    syllabusEntries = [],
    exams = [],
    initialPaper,
    linkedExamIds,
    initialQuestions = [],
}: PaperBuilderProps) {

    const [title, setTitle] = useState(initialPaper?.title ?? "");
    const [year, setYear] = useState<number | "">(initialPaper?.year ?? "");
    const [type, setType] = useState<QuestionPaperType>(initialPaper?.type ?? QuestionPaperType.MOCK);
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [paperId, setPaperId] = useState<string | null>(initialPaper?.id ?? null);
    const [paperSaved, setPaperSaved] = useState(!!initialPaper);
    //const [paperSaved, setPaperSaved] = useState(false);

    // 🔥 Added the state for our new Multi-Select ExamPicker!
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>(linkedExamIds ?? (examId ? [examId] : []));


    const [isScanning, setIsScanning] = useState(false);
    const [isImportingJson, setIsImportingJson] = useState(false);
    const [isSavingPaper, startSavingPaper] = useTransition();

    const savedCount = questions.filter(q => q.saved).length;
    const totalCount = questions.length;


    const cardRefs = useRef(new Map<string, QuestionCardHandle>());
    const scrollRefs = useRef(new Map<string, HTMLDivElement>());
    const [isSavingAll, setIsSavingAll] = useState(false);

    const scrollToQuestion = (index: number) => {
        const question = questions[index];
        if (question)
        {
            scrollRefs.current.get(question.clientId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const registerCardRef = (clientId: string, handle: QuestionCardHandle | null) => {
        if (handle) cardRefs.current.set(clientId, handle);
        else cardRefs.current.delete(clientId);
    };

    const registerScrollRef = (clientId: string, element: HTMLDivElement | null) => {
        if (element) scrollRefs.current.set(clientId, element);
        else scrollRefs.current.delete(clientId);
    };

    const updatePaperId = (id: string) => {
        setPaperId(id);
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
                    chunk.map(({ q }) => cardRefs.current.get(q.clientId)?.save() ?? Promise.resolve())
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
            } catch (err: unknown)
            {
                toast.error(`Failed: ${getErrorMessage(err)}`, { id: toastId });
            } finally
            {
                setIsScanning(false);
                e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    const handleJsonImport = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        setIsImportingJson(true);
        const toastId = toast.loading("Validating JSON paper...");
        try {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("JSON file must be smaller than 5 MB.", {
                    id: toastId,
                });
                return;
            }

            const parsed = parsePaperJsonImport(await file.text());
            if (!parsed.success) {
                toast.error(parsed.error, {
                    id: toastId,
                    duration: 10_000,
                });
                return;
            }

            if (
                questions.length > 0 &&
                !confirm(
                    `Append ${parsed.data.questions.length} imported questions to the existing ${questions.length}?`
                )
            ) {
                toast.dismiss(toastId);
                return;
            }

            if (!initialPaper && !paperId) {
                setTitle(parsed.data.title);
                setYear(parsed.data.year ?? "");
                setType(parsed.data.type as QuestionPaperType);
            }

            setQuestions((current) => {
                const offset = current.length;
                const importedQuestions = [...parsed.data.questions]
                    .sort((a, b) => a.number - b.number)
                    .map((question, index) => ({
                        clientId: createClientId(),
                        number: offset + index + 1,
                        ...normalizePaperJsonQuestion(question),
                        saved: false,
                        topicId: "",
                        categoryId: "",
                    }));
                return [...current, ...importedQuestions];
            });
            toast.success(
                `Validated and imported ${parsed.data.questions.length} questions.`,
                { id: toastId }
            );
        } catch (error) {
            toast.error(`JSON import failed: ${getErrorMessage(error)}`, {
                id: toastId,
            });
        } finally {
            setIsImportingJson(false);
            input.value = "";
        }
    };

    const downloadJsonTemplate = () => {
        const blob = new Blob(
            [JSON.stringify(PAPER_JSON_TEMPLATE, null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "paper-import-template.json";
        anchor.click();
        URL.revokeObjectURL(url);
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
                const existingId = initialPaper?.id ?? paperId;

                if (existingId)
                {
                    // Update existing paper
                    await updateQuestionPaper(existingId, {
                        title: title.trim(),
                        year: year || null,
                        type: type,
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
                        type: type,
                        examIds: selectedExamIds,
                    }, examSlug);

                    const newPaperId = result.id;
                    updatePaperId(newPaperId);
                    setPaperSaved(true);
                    toast.success("Paper created — now save your questions");
                }
            } catch (err: unknown)
            {
                toast.error(`Failed: ${getErrorMessage(err)}`);
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
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

                {/* ── Header bar ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Paper Builder</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {paperSaved ? `${savedCount}/${totalCount} questions saved` : "Create paper, then save questions"}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="file"
                            id="paper-upload"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={handleMagicImport}
                        />
                        <input
                            type="file"
                            id="paper-json-upload"
                            className="hidden"
                            accept=".json,application/json"
                            onChange={handleJsonImport}
                        />
                        <button
                            type="button"
                            disabled={isScanning || isImportingJson}
                            onClick={() => document.getElementById("paper-upload")?.click()}
                            className="flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-60 dark:shadow-none"
                        >
                            {isScanning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                            {isScanning ? "Scanning..." : "OCR import"}
                        </button>
                        <button
                            type="button"
                            disabled={isImportingJson || isScanning}
                            onClick={() =>
                                document
                                    .getElementById("paper-json-upload")
                                    ?.click()
                            }
                            className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                        >
                            {isImportingJson ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <FileJson size={15} />
                            )}
                            {isImportingJson ? "Validating..." : "JSON import"}
                        </button>
                        <button
                            type="button"
                            onClick={downloadJsonTemplate}
                            className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <Download size={14} />
                            Template
                        </button>
                    </div>
                </div>

                {/* ── Paper metadata card ── */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2 text-foreground font-black text-sm uppercase tracking-widest">
                        <FileText size={14} className="text-muted-foreground" />
                        Paper Details
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr] gap-4">
                        <div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    //disabled={paperSaved}
                                    placeholder="e.g. KPSC Assistant Grade II - 2023"
                                    className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring disabled:bg-background disabled:text-muted-foreground"
                                />
                            </div>
                            <div>
                                <label className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Type</label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as QuestionPaperType)}
                                    className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                                >
                                    {Object.values(QuestionPaperType).map((paperType) => (
                                        <option key={paperType} value={paperType}>
                                            {paperType}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Year</label>
                            <input
                                type="number"
                                value={year}
                                onChange={e => setYear(e.target.value ? parseInt(e.target.value) : "")}
                                //disabled={paperSaved}
                                placeholder="2023"
                                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring disabled:bg-background disabled:text-muted-foreground"
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
                                ? (paperId ? "Saving..." : "Creating...")
                                : (paperId ? "Save Changes" : "Create Paper")
                            }
                        </button>
                        {paperSaved && (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={14} />
                                {paperId && !initialPaper ? "Paper created — add questions below" : "Changes saved"}
                            </span>
                        )}
                    </div>

                </div>

                {/* ── Not-saved-paper warning ── */}
                {!paperId && !initialPaper && questions.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <AlertCircle size={16} className="shrink-0" />
                        Create the paper first, then use &quot;Save Question&quot; on each question below.
                    </div>
                )}

                {/* ── Questions ── */}
                {questions.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                                isSaving={isSavingAll}
                            />
                        )}
                        {questions.map((q, i) => (
                            <QuestionCard
                                ref={el => registerCardRef(q.clientId, el)}
                                wrapperRef={el => registerScrollRef(q.clientId, el)}
                                key={q.clientId}
                                q={q}
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
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-card">
                        <BookOpen className="mx-auto mb-3 text-slate-200" size={36} />
                        <p className="font-bold text-muted-foreground">No questions yet</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Use Magic Import or add manually</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full h-14 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-slate-400 hover:text-muted-foreground transition-colors font-bold text-sm flex items-center justify-center gap-2 bg-card"
                >
                    <Plus size={16} /> Add Question
                </button>

            </div>
        </div>
    );
}
