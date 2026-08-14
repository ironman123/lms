"use client";

import {
    useMemo,
    useState,
    useTransition,
    useRef,
    useEffect,
} from "react";
import {
    Sparkles, Loader2, Plus, CheckCircle2, Trash2,
    FileText, BookOpen, AlertCircle, Save, Search, X, FileJson, Download
} from "lucide-react";
import { parsePaperPDF, type ParsedQuestion } from "@/app/(main)/actions/ocr-paper";
import { clearQuestionPaperQuestions, createQuestionPaper, publishQuestionPaper, updateQuestionPaper } from "@/app/(main)/actions/paper-actions";
import { commitPaperImportAction } from "@/app/(main)/actions/paper-import-actions";
import { toast } from "sonner";
import { QuestionPaperType } from "@prisma/client";
import QuestionCard, { type QuestionCardHandle } from "./QuestionCard";
import {
    PAPER_JSON_TEMPLATE,
    normalizePaperJsonQuestion,
    parsePaperJsonImport,
} from "@/lib/paper-json-import";
import type { PaperJsonImport } from "@/lib/paper-json-import";
import type { PaperReadinessIssue } from "@/lib/paper-readiness";
import {
    appendQuestion,
    removeQuestionByClientId,
    updateQuestionByClientId,
} from "@/lib/question-list-state";

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
    isCancelled: boolean;
    saved: boolean;
    topicId: string;
    topicPath: string;
    syllabusEntryId: string;
    categoryId: string;
    importSource?: "JSON" | "OCR" | "MANUAL";
    sourceNumber?: number;

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
    exams?: { id: string; name: string }[];
    initialPaper?: { id: string; title: string; year: number | null; type: QuestionPaperType; contentRevision?: number; status?: "DRAFT" | "PUBLISHED" };
    initialQuestions?: Question[];
    linkedExamIds?: string[];
    moderationCaseId?: string;
    reportedQuestionId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function createClientId() {
    return globalThis.crypto?.randomUUID?.()
        ?? `question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown error";
}

function questionToSavePayload(
    question: Question
) {
    const isOptionsType =
        question.type === "MCQ" ||
        question.type === "MSQ";

    const isNumerical =
        question.type === "NUMERICAL";

    const isSubjective =
        question.type === "SUBJECTIVE";

    return {
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks:
            question.negativeMarks,
        explanation:
            question.explanation ?? null,
        topicPath:
            question.topicPath || null,
        topicId:
            question.topicId || null,
        syllabusEntryId:
            question.syllabusEntryId || null,
        isCancelled:
            question.isCancelled,

        options: isOptionsType
            ? question.options
                .filter((option) =>
                    option.text.trim()
                )
                .map((option) => ({
                    index: option.index,
                    text: option.text,
                    ...(option.imageUrl
                        ? {
                            imageUrl:
                                option.imageUrl,
                        }
                        : {}),
                }))
            : [],

        correctOptions: isOptionsType
            ? question.correctOptions
            : [],

        exactAnswer: isNumerical
            ? question.exactAnswer
            : null,

        answerMin: isNumerical
            ? question.answerMin
            : null,

        answerMax: isNumerical
            ? question.answerMax
            : null,

        modelAnswer: isSubjective
            ? question.modelAnswer
            : null,
    };
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
        isCancelled: false,
        saved: false,
        topicId: "",
        topicPath: "",
        syllabusEntryId: "",
        categoryId: "",
        importSource: "MANUAL",
        sourceNumber: number,
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
        isCancelled: false,
        topicId: "",
        topicPath: "",
        syllabusEntryId: "",
        categoryId: "",
        importSource: "OCR",
        sourceNumber: pq.number || index + 1,
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

// ── Shared Topic Picker ───────────────────────────────────────────────────────

function SharedTopicPicker({
    question,
    examIds,
    matchingQuestionCount,
    onSelect,
    onClose,
}: {
    question: Question;
    examIds: string[];
    matchingQuestionCount: number;
    onSelect: (
        syllabusEntryId: string,
        topicId: string,
        topicPath: string,
        categoryId: string,
        applyToMatching: boolean
    ) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState(
        question.topicPath.split(">").pop()?.trim() ?? ""
    );
    const [applyToMatching, setApplyToMatching] = useState(
        matchingQuestionCount > 1
    );
    const [filteredTopics, setFilteredTopics] = useState<SyllabusEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const normalizedQuery = query.trim().toLowerCase();

    useEffect(() => {
        if (normalizedQuery.length < 2) {
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            setSearchError(null);
            const params = new URLSearchParams({ q: query.trim() });
            examIds.forEach((examId) => params.append("examId", examId));
            try {
                const response = await fetch(`/api/admin/topics/search?${params}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error("Topic search failed.");
                const payload = (await response.json()) as {
                    results: SyllabusEntry[];
                };
                setFilteredTopics(payload.results);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setSearchError(
                        error instanceof Error ? error.message : "Topic search failed."
                    );
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [examIds, normalizedQuery, query]);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-picker-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                        <p id="topic-picker-title" className="text-sm font-black text-foreground">
                            Choose Topic
                        </p>

                        <p className="mt-1 truncate text-xs text-muted-foreground">
                            Question {question.number}:{" "}
                            {question.content || "Untitled question"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close topic picker"
                    >
                        <X size={18} />
                    </button>
                </div>

                {question.topicPath && (
                    <div className="border-b border-border bg-blue-50 px-5 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                            Current Topic
                        </p>

                        <p className="mt-1 text-xs font-bold text-blue-800">
                            {question.topicPath}
                        </p>
                    </div>
                )}

                <div className="p-5">
                    <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
                        <Search
                            size={15}
                            className="shrink-0 text-muted-foreground"
                        />

                        <input
                            type="search"
                            value={query}
                            onChange={(event) => {
                                const value = event.target.value;
                                setQuery(value);
                                if (value.trim().length < 2) {
                                    setFilteredTopics([]);
                                    setSearchError(null);
                                    setIsLoading(false);
                                }
                            }}
                            placeholder="Type at least 2 characters..."
                            autoComplete="off"
                            autoFocus
                            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />

                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    setFilteredTopics([]);
                                    setSearchError(null);
                                    setIsLoading(false);
                                }}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Clear topic search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl border border-border">
                        {normalizedQuery.length === 0 && (
                            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                                Type at least 2 characters to search topics.
                            </p>
                        )}

                        {normalizedQuery.length === 1 && (
                            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                                Enter one more character to search.
                            </p>
                        )}

                        {normalizedQuery.length >= 2 &&
                            !isLoading &&
                            filteredTopics.length === 0 &&
                            !searchError && (
                                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                                    No matching topics found.
                                </p>
                            )}

                        {isLoading && (
                            <p className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-muted-foreground">
                                <Loader2 size={14} className="animate-spin" />
                                Searching the syllabus…
                            </p>
                        )}

                        {searchError && (
                            <p className="px-4 py-8 text-center text-xs text-destructive">
                                {searchError}
                            </p>
                        )}

                        {normalizedQuery.length >= 2 &&
                            filteredTopics.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    data-topic-result
                                    onClick={() =>
                                        onSelect(
                                            entry.id,
                                            entry.topicId ?? "",
                                            entry.topicPath,
                                            entry.categoryId,
                                            applyToMatching
                                        )
                                    }
                                    className="block w-full border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent"
                                >
                                    <p className="text-xs font-bold text-foreground">
                                        {entry.topicPath
                                            .split(">")
                                            .pop()
                                            ?.trim()}
                                    </p>

                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        {entry.topicPath}
                                    </p>

                                    {entry.category?.name && (
                                        <p className="mt-1 text-[10px] font-medium text-purple-600">
                                            {entry.category.name}
                                        </p>
                                    )}
                                </button>
                            ))}

                        {normalizedQuery.length >= 2 && !isLoading && (
                            <button
                                type="button"
                                onClick={() =>
                                    onSelect("", "", query.trim(), "", applyToMatching)
                                }
                                className="block w-full border-t border-border bg-muted/35 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted"
                            >
                                Use “{query.trim()}” as a custom topic
                            </button>
                        )}
                    </div>

                    <p className="mt-2 text-[10px] text-muted-foreground">
                        A maximum of 30 matching topics is displayed.
                    </p>
                    {matchingQuestionCount > 1 && (
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/25 p-3 text-xs text-foreground">
                            <input
                                type="checkbox"
                                checked={applyToMatching}
                                onChange={(event) => setApplyToMatching(event.target.checked)}
                                className="mt-0.5 size-4"
                            />
                            <span>
                                Apply this topic to all {matchingQuestionCount} questions that currently use the same imported topic text.
                            </span>
                        </label>
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
    canSave,
}: {
    questions: Question[];
    onScrollTo: (index: number) => void;
    onSaveAll: () => void;
    isSaving: boolean;
    canSave: boolean;
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
                        disabled={isSaving || !canSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        {isSaving
                            ? "Saving..."
                            : !canSave
                                ? "Create Paper First"
                                : `Save all unsaved (${unsavedCount})`
                        }
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
    exams = [],
    initialPaper,
    linkedExamIds,
    initialQuestions = [],
    moderationCaseId,
    reportedQuestionId,
}: PaperBuilderProps) {

    const [title, setTitle] = useState(initialPaper?.title ?? "");
    const [year, setYear] = useState<number | "">(initialPaper?.year ?? "");
    const [type, setType] = useState<QuestionPaperType>(initialPaper?.type ?? QuestionPaperType.MOCK);
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [topicPickerQuestionId, setTopicPickerQuestionId,] = useState<string | null>(null);
    const [paperId, setPaperId] = useState<string | null>(initialPaper?.id ?? null);
    const [paperRevision, setPaperRevision] = useState<number | undefined>(
        initialPaper?.contentRevision
    );
    const [paperSaved, setPaperSaved] = useState(!!initialPaper);
    const [paperStatus, setPaperStatus] = useState<"DRAFT" | "PUBLISHED">(
        initialPaper?.status ?? "DRAFT"
    );
    //const [paperSaved, setPaperSaved] = useState(false);

    // 🔥 Added the state for our new Multi-Select ExamPicker!
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>(linkedExamIds ?? (examId ? [examId] : []));


    const [isScanning, setIsScanning] = useState(false);
    const [isImportingJson, setIsImportingJson] = useState(false);
    const [pendingJsonImport, setPendingJsonImport] = useState<PaperJsonImport | null>(null);
    const [pendingJsonFileName, setPendingJsonFileName] = useState<string | null>(null);
    const [jsonImportMode, setJsonImportMode] = useState<"APPEND" | "REPLACE">("APPEND");
    const [jsonImportFeedback, setJsonImportFeedback] = useState<{
        kind: "success" | "error";
        title: string;
        details: string[];
    } | null>(null);
    const [isSavingPaper, startSavingPaper] = useTransition();
    const [isPublishing, startPublishing] = useTransition();
    const [isClearing, startClearing] = useTransition();
    const [clearStep, setClearStep] = useState<1 | 2 | null>(null);
    const [clearPhrase, setClearPhrase] = useState("");

    const savedCount = questions.filter(q => q.saved).length;
    const totalCount = questions.length;


    const cardRefs = useRef(new Map<string, QuestionCardHandle>());
    const scrollRefs = useRef(new Map<string, HTMLDivElement>());
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [pendingImportFileName, setPendingImportFileName] = useState<string | null>(null);
    const importAttemptRef = useRef<{
        signature: string;
        idempotencyKey: string;
    } | null>(null);
    const [publishFeedback, setPublishFeedback] = useState<{
        message: string;
        issues: PaperReadinessIssue[];
    } | null>(null);


    const topicPickerQuestion = useMemo(
        () =>
            topicPickerQuestionId
                ? questions.find(
                    (question) =>
                        question.clientId ===
                        topicPickerQuestionId
                ) ?? null
                : null,
        [questions, topicPickerQuestionId]
    );
    const topicPickerMatchingCount = useMemo(() => {
        const path = topicPickerQuestion?.topicPath.trim().toLocaleLowerCase("en");
        if (!path) return 1;
        return questions.filter(
            (question) =>
                question.topicPath.trim().toLocaleLowerCase("en") === path
        ).length;
    }, [questions, topicPickerQuestion]);

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

    const handleSaveAll = async () => {
        if (!paperId)
        {
            toast.error(
                "Create the paper before saving questions."
            );
            return;
        }

        const unsaved = questions
            .map((question, index) => ({
                question,
                index,
            }))
            .filter(
                ({ question }) => !question.saved
            );

        if (unsaved.length === 0)
        {
            toast.success(
                "All questions are already saved."
            );
            return;
        }

        /*
         * New imported questions can be inserted in batches.
         * Existing questions must continue through updateQuestion
         * because they may contain moderation logic.
         */
        const newQuestions = unsaved.filter(
            ({ question }) => !question.id
        );

        const existingQuestions = unsaved.filter(
            ({ question }) => Boolean(question.id)
        );

        setIsSavingAll(true);

        let failedCount = 0;
        let firstFailedIndex: number | null = null;

        try
        {
            if (newQuestions.length > 0)
            {
                const importItems = newQuestions.map(
                    ({ question, index }) => ({
                        clientId: question.clientId,
                        sourceNumber: question.sourceNumber ?? question.number,
                        position: index,
                        data: questionToSavePayload(question),
                    })
                );
                const signature = JSON.stringify(importItems);
                if (importAttemptRef.current?.signature !== signature)
                {
                    importAttemptRef.current = {
                        signature,
                        idempotencyKey: createClientId(),
                    };
                }

                const source = newQuestions.some(
                    ({ question }) => question.importSource === "JSON"
                )
                    ? "JSON"
                    : newQuestions.some(
                          ({ question }) => question.importSource === "OCR"
                      )
                      ? "OCR"
                      : "MANUAL";
                const result = await commitPaperImportAction({
                    paperId,
                    expectedRevision: paperRevision,
                    idempotencyKey:
                        importAttemptRef.current.idempotencyKey,
                    source,
                    sourceFileName: pendingImportFileName,
                    mode: source === "JSON" ? jsonImportMode : "APPEND",
                    items: importItems,
                });

                if (!result.success)
                {
                    failedCount += newQuestions.length;
                    firstFailedIndex = newQuestions[0]?.index ?? null;
                    const detail = result.issues[0];
                    toast.error(
                        detail
                            ? `${result.error} ${detail.path}: ${detail.message}`
                            : result.error
                    );
                } else
                {
                    const createdIds = new Map(
                        result.questions.map((created) => [
                            created.clientId,
                            created.id,
                        ])
                    );
                    setQuestions((current) =>
                        current.map((question) => {
                            const createdId = createdIds.get(question.clientId);
                            return createdId
                                ? { ...question, id: createdId, saved: true }
                                : question;
                        })
                    );
                    if (result.paperRevision !== null)
                    {
                        setPaperRevision(result.paperRevision);
                    }
                    setPaperStatus("DRAFT");
                    importAttemptRef.current = null;
                    setPendingImportFileName(null);
                    setJsonImportMode("APPEND");
                }
            }

            /*
             * Existing questions are updates rather than inserts.
             * Keep using each card's update workflow.
             */
            for (const {
                question,
                index,
            } of existingQuestions)
            {
                const card =
                    cardRefs.current.get(
                        question.clientId
                    );

                if (!card)
                {
                    failedCount++;

                    if (firstFailedIndex === null)
                    {
                        firstFailedIndex = index;
                    }

                    continue;
                }

                const saved = await card.save();

                if (!saved)
                {
                    failedCount++;

                    if (firstFailedIndex === null)
                    {
                        firstFailedIndex = index;
                    }
                }
            }

            if (failedCount > 0)
            {
                toast.error(
                    `${failedCount} question(s) could not be saved.`
                );

                if (firstFailedIndex !== null)
                {
                    scrollToQuestion(
                        firstFailedIndex
                    );
                }
            } else
            {
                toast.success(
                    `${unsaved.length} questions saved successfully!`
                );
            }
        } catch (error)
        {
            console.error(
                "Unexpected Save All failure:",
                error
            );

            toast.error(
                "Unexpected error while saving questions."
            );
        } finally
        {
            setIsSavingAll(false);
        }
    };

    const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPendingImportFileName(file.name);

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

        setPendingImportFileName(file.name);

        setIsImportingJson(true);
        setJsonImportFeedback(null);
        const toastId = toast.loading("Validating JSON paper...");
        try
        {
            if (file.size > 5 * 1024 * 1024)
            {
                toast.error("JSON file must be smaller than 5 MB.", {
                    id: toastId,
                });
                setJsonImportFeedback({
                    kind: "error",
                    title: "JSON import failed",
                    details: ["The JSON file must be smaller than 5 MB."],
                });
                return;
            }

            const parsed = parsePaperJsonImport(await file.text());
            if (!parsed.success)
            {
                toast.error(parsed.error, {
                    id: toastId,
                    duration: 10_000,
                });
                setJsonImportFeedback({
                    kind: "error",
                    title: "Fix these JSON validation problems",
                    details: parsed.issues.slice(0, 20).map((issue) =>
                        issue.questionNumber === null
                            ? `${issue.path}: ${issue.message}`
                            : `Question ${issue.questionNumber} · ${issue.path}: ${issue.message}`
                    ),
                });
                return;
            }

            setPendingJsonImport(parsed.data);
            setPendingJsonFileName(file.name);
            toast.success(`Validated ${parsed.data.questions.length} questions. Choose how to apply them.`, { id: toastId });
        } catch (error)
        {
            const message = getErrorMessage(error);
            toast.error(`JSON import failed: ${message}`, {
                id: toastId,
            });
            setJsonImportFeedback({
                kind: "error",
                title: "JSON import failed",
                details: [message],
            });
        } finally
        {
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
                    const result = await updateQuestionPaper(existingId, {
                        title: title.trim(),
                        year: year || null,
                        type: type,
                        examIds: selectedExamIds,
                    }, examSlug);
                    if (!result.success) {
                        toast.error(result.error);
                        return;
                    }
                    setPaperSaved(true);
                    setPaperStatus("DRAFT");
                    setPaperRevision(result.contentRevision);
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

                    if (!result.success) {
                        toast.error(result.error);
                        return;
                    }

                    setPaperId(result.id);
                    setPaperRevision(result.contentRevision);
                    setPaperStatus(result.status);
                    setPaperSaved(true);
                    toast.success("Paper created — now save your questions");
                }
            } catch (err: unknown)
            {
                toast.error(`Failed: ${getErrorMessage(err)}`);
            }
        });
    };

    const applyJsonImport = (mode: "APPEND" | "REPLACE") => {
        if (!pendingJsonImport) return;
        if (!initialPaper && !paperId) {
            setTitle(pendingJsonImport.title);
            setYear(pendingJsonImport.year ?? "");
            setType(pendingJsonImport.type as QuestionPaperType);
        }
        const imported = [...pendingJsonImport.questions]
            .sort((a, b) => a.number - b.number)
            .map((question, index) => ({
                clientId: createClientId(),
                number: index + 1,
                ...normalizePaperJsonQuestion(question),
                saved: false,
                topicId: "",
                syllabusEntryId: "",
                categoryId: "",
                importSource: "JSON" as const,
                sourceNumber: question.number,
            }));
        setQuestions((current) =>
            mode === "REPLACE"
                ? imported
                : [...current, ...imported].map((question, index) => ({
                    ...question,
                    number: index + 1,
                }))
        );
        setPendingImportFileName(pendingJsonFileName);
        setJsonImportMode(mode);
        setPendingJsonImport(null);
        setPendingJsonFileName(null);
        setJsonImportFeedback({
            kind: "success",
            title: `${mode === "REPLACE" ? "Replacement" : "Append"} ready`,
            details: [`${imported.length} imported questions are ready to save.`],
        });
    };

    const handlePublishPaper = () => {
        if (!paperId) {
            toast.error("Save the paper before publishing it.");
            return;
        }
        if (questions.some((question) => !question.saved)) {
            toast.error("Save every question before publishing the paper.");
            return;
        }
        startPublishing(async () => {
            try {
                const result = await publishQuestionPaper(paperId);
                if (!result.success) {
                    setPublishFeedback({
                        message: result.error,
                        issues: result.issues,
                    });
                    toast.error(result.error);
                    return;
                }
                setPublishFeedback(null);
                setPaperStatus("PUBLISHED");
                setPaperRevision(result.contentRevision);
                toast.success("Paper published and available to students.");
            } catch (error) {
                const message = getErrorMessage(error);
                setPublishFeedback({ message, issues: [] });
                toast.error(`Unable to publish: ${message}`);
            }
        });
    };

    const addQuestion = () => {
        setQuestions((previous) =>
            appendQuestion(previous, emptyQuestion(previous.length + 1))
        );
        setPaperStatus("DRAFT");
    };
    const updateQuestion_ = (clientId: string, updated: Question) => {
        setQuestions((previous) =>
            updateQuestionByClientId(previous, clientId, updated)
        );
        if (!updated.saved) setPaperStatus("DRAFT");
    };
    const deleteQuestion_ = (clientId: string) => {
        setPaperStatus("DRAFT");
        setQuestions((previous) =>
            removeQuestionByClientId(previous, clientId)
        );
    };

    const handleClearQuestions = () => {
        if (!paperId || clearPhrase !== `DELETE ${questions.length} QUESTIONS`) return;
        startClearing(async () => {
            const result = await clearQuestionPaperQuestions(paperId, paperRevision);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setQuestions([]);
            setPaperRevision(result.paperRevision);
            setPaperStatus("DRAFT");
            setClearStep(null);
            setClearPhrase("");
            toast.success(`${result.clearedCount} questions archived from this draft.`);
        });
    };

    const openTopicPicker = (clientId: string) => {
        setTopicPickerQuestionId(clientId);
    };

    const closeTopicPicker = () => {
        setTopicPickerQuestionId(null);
    };

    const selectTopicForQuestion = (
        syllabusEntryId: string,
        topicId: string,
        topicPath: string,
        categoryId: string,
        applyToMatching: boolean
    ) => {
        if (!topicPickerQuestionId)
        {
            return;
        }

        setQuestions((current) => {
            const selectedQuestion = current.find(
                (question) => question.clientId === topicPickerQuestionId
            );
            const previousPath = selectedQuestion?.topicPath
                .trim()
                .toLocaleLowerCase("en");
            return current.map((question) =>
                question.clientId === topicPickerQuestionId ||
                (applyToMatching &&
                    Boolean(previousPath) &&
                    question.topicPath.trim().toLocaleLowerCase("en") === previousPath)
                    ? {
                        ...question,
                        syllabusEntryId,
                        topicId,
                        topicPath,
                        categoryId,
                        saved: false,
                    }
                    : question
            );
        });

        setTopicPickerQuestionId(null);
    };

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
                {jsonImportFeedback && (
                    <div
                        role={
                            jsonImportFeedback.kind === "error"
                                ? "alert"
                                : "status"
                        }
                        className={`rounded-2xl border p-4 ${jsonImportFeedback.kind === "error"
                            ? "border-destructive/35 bg-destructive/5 text-destructive"
                            : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {jsonImportFeedback.kind === "error" ? (
                                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                            ) : (
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black">
                                    {jsonImportFeedback.title}
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-medium text-foreground/80">
                                    {jsonImportFeedback.details.map(
                                        (detail, index) => (
                                            <li key={`${detail}-${index}`}>
                                                {detail}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                            <button
                                type="button"
                                onClick={() => setJsonImportFeedback(null)}
                                className="rounded-lg p-1 text-current/70 transition-colors hover:bg-background/60 hover:text-current"
                                aria-label="Dismiss JSON import result"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                )}

                {pendingJsonImport && (
                    <section
                        role="dialog"
                        aria-label="Choose JSON import behaviour"
                        className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
                    >
                        <p className="text-sm font-black text-foreground">
                            Apply {pendingJsonImport.questions.length} validated JSON questions
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Append keeps the current questions. Replace removes the current active questions from this draft when you save; historical session records remain intact.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => applyJsonImport("APPEND")}
                                className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
                            >
                                Append questions
                            </button>
                            <button
                                type="button"
                                onClick={() => applyJsonImport("REPLACE")}
                                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700"
                            >
                                Replace current questions
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingJsonImport(null);
                                    setPendingJsonFileName(null);
                                }}
                                className="min-h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground hover:bg-muted"
                            >
                                Cancel import
                            </button>
                        </div>
                    </section>
                )}

                {publishFeedback && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-foreground"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black">Publishing needs attention</p>
                                <p className="mt-1 text-sm text-muted-foreground">{publishFeedback.message}</p>
                                {publishFeedback.issues.length > 0 && (
                                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-medium text-foreground/80">
                                        {publishFeedback.issues.map((issue) => (
                                            <li key={`${issue.questionId}-${issue.code}`}>{issue.message}</li>
                                        ))}
                                    </ul>
                                )}
                                {publishFeedback.issues.some((issue) => issue.code === "SUBJECTIVE_REQUIRES_MANUAL_GRADING") && (
                                    <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                        Subjective questions can be saved, but must stay draft until manual grading is implemented. Convert those questions to objective or numerical questions to publish today.
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPublishFeedback(null)}
                                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                                aria-label="Dismiss publishing feedback"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                )}

                {clearStep && (
                    <section role="alertdialog" aria-label="Clear all questions" className="rounded-2xl border border-rose-500/35 bg-rose-500/5 p-5">
                        {clearStep === 1 ? (
                            <>
                                <p className="text-sm font-black text-foreground">Clear all {questions.length} questions?</p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">They will be archived, not hard-deleted; historical sessions remain intact. This cannot be undone from the builder.</p>
                                <div className="mt-4 flex gap-2">
                                    <button type="button" onClick={() => setClearStep(null)} className="min-h-10 rounded-xl px-4 text-sm font-bold text-muted-foreground hover:bg-muted">Cancel</button>
                                    <button type="button" onClick={() => setClearStep(2)} className="min-h-10 rounded-xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700">Continue</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-black text-foreground">Final confirmation</p>
                                <p className="mt-1 text-xs text-muted-foreground">Type <span className="font-mono font-bold text-foreground">DELETE {questions.length} QUESTIONS</span> to archive every active question.</p>
                                <input value={clearPhrase} onChange={(event) => setClearPhrase(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-rose-500/30" />
                                <div className="mt-4 flex gap-2">
                                    <button type="button" disabled={isClearing} onClick={() => setClearStep(1)} className="min-h-10 rounded-xl px-4 text-sm font-bold text-muted-foreground hover:bg-muted">Back</button>
                                    <button type="button" disabled={isClearing || clearPhrase !== `DELETE ${questions.length} QUESTIONS`} onClick={handleClearQuestions} className="min-h-10 rounded-xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">{isClearing ? "Clearing…" : "Archive all questions"}</button>
                                </div>
                            </>
                        )}
                    </section>
                )}

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
                        {paperId && paperStatus === "DRAFT" && (
                            <button
                                type="button"
                                onClick={handlePublishPaper}
                                disabled={isPublishing || questions.length === 0}
                                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300"
                            >
                                {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {isPublishing ? "Checking…" : "Publish"}
                            </button>
                        )}
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
                        {paperId && (
                            <button type="button" onClick={() => setClearStep(1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 text-xs font-bold text-rose-700 hover:bg-rose-500/10 dark:text-rose-300">
                                <Trash2 size={14} /> Clear all questions
                            </button>
                        )}
                        {questions.length > 0 && (
                            <QuestionGrid
                                questions={questions}
                                onScrollTo={scrollToQuestion}
                                onSaveAll={handleSaveAll}
                                isSaving={isSavingAll}
                                canSave={Boolean(paperId)}
                            />
                        )}
                        {questions.map((q) => (
                            <QuestionCard
                                ref={el => registerCardRef(q.clientId, el)}
                                wrapperRef={el => registerScrollRef(q.clientId, el)}
                                key={q.clientId}
                                q={q}
                                paperId={paperId}
                                examSlug={examSlug}
                                onOpenTopicPicker={openTopicPicker}
                                onPaperRevisionChange={setPaperRevision}
                                onUpdate={(clientId, updated) =>
                                    updateQuestion_(clientId, updated)
                                }
                                onDelete={deleteQuestion_}
                                moderationCaseId={
                                    q.id === reportedQuestionId
                                        ? moderationCaseId
                                        : undefined
                                }
                                requireBulkImportSave={
                                    jsonImportMode === "REPLACE" &&
                                    q.importSource === "JSON" &&
                                    !q.saved
                                }
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
            {topicPickerQuestion && (
                <SharedTopicPicker
                    key={topicPickerQuestion.clientId}
                    question={topicPickerQuestion}
                    examIds={selectedExamIds}
                    matchingQuestionCount={topicPickerMatchingCount}
                    onSelect={selectTopicForQuestion}
                    onClose={closeTopicPicker}
                />
            )}
        </div>
    );
}
