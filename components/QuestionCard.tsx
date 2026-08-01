"use client";

import { useState, forwardRef, useImperativeHandle, memo } from "react";
import { toast } from "sonner";
import {
    Loader2, Plus, Trash2, CheckCircle2, Circle, X,
    ChevronDown, ChevronUp, Save, Ban,
} from "lucide-react";
import { createQuestion, updateQuestion, deleteQuestion } from "@/app/(main)/actions/question-actions";
import type { Question, Option } from "./PaperBuilder";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const TYPES = ["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"] as const;

const DIFF_STYLES = {
    EASY: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HARD: "bg-red-50 text-red-700 border-red-200",
};

export interface QuestionCardHandle {
    save: () => Promise<boolean>;
}

export interface QuestionCardProps {
    q: Question;
    paperId: string | null;
    examSlug: string;
    onUpdate: (updated: Question) => void;
    onDelete: () => void;
    onOpenTopicPicker: (clientId: string) => void;
    onPaperRevisionChange?: (revision: number) => void;
    wrapperRef?: (el: HTMLDivElement | null) => void;
    moderationCaseId?: string;
}

// ── Option Row ────────────────────────────────────────────────────────────────
function OptionRow({
    option,
    isCorrect,
    onToggle,
    onChange,
    onRemove,
    canRemove,
}: {
    option: Option;
    isCorrect: boolean;       // driven by correctOptions[], not option.isCorrect
    onToggle: () => void;
    onChange: (text: string) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${isCorrect
            ? "bg-emerald-50 border-emerald-300 shadow-sm"
            : "bg-card border-border hover:border-slate-300"
            }`}>
            <button type="button" onClick={onToggle} className="shrink-0 transition-transform active:scale-90">
                {isCorrect
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <Circle size={18} className="text-muted-foreground/60 hover:text-muted-foreground" />
                }
            </button>
            <span className={`font-mono text-sm font-bold w-5 shrink-0 ${isCorrect ? "text-emerald-600" : "text-muted-foreground"}`}>
                {option.label}
            </span>
            <input
                type="text"
                value={option.text}
                onChange={e => onChange(e.target.value)}
                placeholder={`Option ${option.label}`}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 ${isCorrect ? "text-emerald-800 font-medium" : "text-foreground/80"
                    }`}
            />
            {canRemove && (
                <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground/60 hover:text-red-400 transition-colors">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

// ── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = forwardRef<QuestionCardHandle, QuestionCardProps>(
    ({
        q,
        paperId,
        examSlug,
        onUpdate,
        onDelete,
        onOpenTopicPicker,
        onPaperRevisionChange,
        wrapperRef,
        moderationCaseId,
    }, ref) => {
        const [expanded, setExpanded] = useState(!q.saved);
        const [saving, setSaving] = useState(false);

        const isOptionsType = q.type === "MCQ" || q.type === "MSQ";
        const isNumerical = q.type === "NUMERICAL";
        const isSubjective = q.type === "SUBJECTIVE";

        const updateQuestionDraft = (changes: Partial<Question>) =>
            onUpdate({ ...q, ...changes, saved: false });

        const updateField = <K extends keyof Question>(key: K, value: Question[K]) =>
            updateQuestionDraft({ [key]: value });

        // ── Option helpers ──────────────────────────────────────────────────────

        const toggleCorrect = (optionIndex: number) => {
            if (q.type === "MCQ")
            {
                // Radio behaviour — only one correct at a time
                updateQuestionDraft({ correctOptions: [optionIndex] });
            } else
            {
                // MSQ — toggle in/out of correctOptions array
                const already = q.correctOptions.includes(optionIndex);
                const next = already
                    ? q.correctOptions.filter(i => i !== optionIndex)
                    : [...q.correctOptions, optionIndex];
                updateQuestionDraft({ correctOptions: next });
            }
        };

        const updateOptionText = (optionIndex: number, text: string) => {
            const newOpts = q.options.map((o, i) =>
                i === optionIndex ? { ...o, text } : o
            );
            updateQuestionDraft({ options: newOpts });
        };

        const addOption = () => {
            if (q.options.length >= 6) return;
            const i = q.options.length;
            updateQuestionDraft({
                options: [
                    ...q.options,
                    { index: i, label: String.fromCharCode(65 + i), text: "" },
                ],
            });
        };

        const removeOption = (optionIndex: number) => {
            // Re-index remaining options
            const newOpts = q.options
                .filter((_, i) => i !== optionIndex)
                .map((o, i) => ({ ...o, index: i, label: String.fromCharCode(65 + i) }));

            // Remove or remap correctOptions
            const newCorrect = q.correctOptions
                .filter(i => i !== optionIndex)          // drop removed index
                .map(i => (i > optionIndex ? i - 1 : i)); // shift down indices above removed

            updateQuestionDraft({
                options: newOpts,
                correctOptions: newCorrect,
            });
        };

        // ── Validation ──────────────────────────────────────────────────────────

        const validate = (): string | null => {
            if (!paperId?.trim()) return "Save the paper first before adding questions";
            if (!q.content.trim()) return "Question content is required";
            if (q.isCancelled) return null;

            if (isOptionsType)
            {
                const filled = q.options.filter(o => o.text.trim());
                if (filled.length < 2) return "At least 2 options with text are required";
                if (q.correctOptions.length === 0) return "Mark at least one correct answer";
                if (q.type === "MCQ" && q.correctOptions.length > 1) return "MCQ can only have one correct answer";
            }

            if (isNumerical)
            {
                const hasExact = q.exactAnswer != null;
                const hasRange = q.answerMin != null && q.answerMax != null;
                if (!hasExact && !hasRange) return "Provide an exact answer or a min/max range";
                if (q.answerMin != null && q.answerMax != null && q.answerMin > q.answerMax)
                    return "Min cannot be greater than max";
            }

            if (isSubjective && !q.modelAnswer?.trim()) return "Model answer is required";

            return null;
        };

        // ── Save ────────────────────────────────────────────────────────────────

        const handleSave = async (): Promise<boolean> => {
            const error = validate();
            if (error)
            {
                toast.error(error);
                return false;
            }

            setSaving(true);
            try
            {
                const payload = {
                    content: q.content,
                    type: q.type,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    negativeMarks: q.negativeMarks,
                    explanation: q.explanation ?? null,
                    topicPath: q.topicPath || null,
                    topicId: q.topicId || null,
                    syllabusEntryId: q.syllabusEntryId || null,
                    isCancelled: q.isCancelled,

                    // MCQ / MSQ
                    options: isOptionsType
                        ? q.options
                            .filter((option) => option.text.trim())
                            .map((option) => ({
                                index: option.index,
                                text: option.text,
                                ...(option.imageUrl
                                    ? { imageUrl: option.imageUrl }
                                    : {}),
                            }))
                        : [],
                    correctOptions: isOptionsType ? q.correctOptions : [],

                    // NUMERICAL
                    exactAnswer: isNumerical ? (q.exactAnswer ?? null) : null,
                    answerMin: isNumerical ? (q.answerMin ?? null) : null,
                    answerMax: isNumerical ? (q.answerMax ?? null) : null,

                    // SUBJECTIVE
                    modelAnswer: isSubjective ? (q.modelAnswer ?? null) : null,
                };

                if (q.id)
                {
                    const result = await updateQuestion(
                        q.id,
                        paperId!,
                        examSlug,
                        payload,
                        moderationCaseId
                    );
                    onPaperRevisionChange?.(result.paperRevision);
                    onUpdate({ ...q, saved: true });
                    toast.success(
                        moderationCaseId
                            ? `Q${q.number} updated and report resolved`
                            : `Q${q.number} updated`
                    );
                } else
                {
                    const result = await createQuestion(
                        paperId!,
                        examSlug,
                        payload
                    );
                    onPaperRevisionChange?.(result.paperRevision);
                    onUpdate({ ...q, id: result.id, saved: true });
                    toast.success(`Q${q.number} saved`);
                }
                setExpanded(false);
                return true;
            } catch (err: unknown)
            {
                const message = err instanceof Error ? err.message : "Unknown error";
                toast.error(`Failed: ${message}`);
                throw err;
            } finally
            {
                setSaving(false);
            }
        };

        useImperativeHandle(ref, () => ({ save: handleSave }));

        const handleDelete = async () => {
            if (q.id)
            {
                if (!confirm(`Delete question ${q.number}?`)) return;
                try
                {
                    const result = await deleteQuestion(q.id, paperId as string, examSlug);
                    onPaperRevisionChange?.(result.paperRevision);
                } catch
                {
                    toast.error("Failed to delete");
                    return;
                }
            }
            onDelete();
        };

        // ── Collapsed summary helpers ───────────────────────────────────────────

        const collapsedAnswer = () => {
            if (q.isCancelled) return null;
            if (isOptionsType)
            {
                const labels = q.correctOptions
                    .toSorted((left, right) => left - right)
                    .map(i => String.fromCharCode(65 + i))
                    .join(", ");
                return labels || null;
            }
            if (isNumerical)
            {
                if (q.exactAnswer != null) return String(q.exactAnswer);
                if (q.answerMin != null && q.answerMax != null)
                    return `${q.answerMin} – ${q.answerMax}`;
            }
            if (isSubjective) return q.modelAnswer ? "Model answer set" : null;
            return null;
        };

        // ── Render ──────────────────────────────────────────────────────────────

        return (
            <div
                ref={wrapperRef}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${q.saved
                    ? "border-border bg-card shadow-sm"
                    : "border-blue-200 bg-blue-50/30 shadow-sm"
                    }`}
            >
                {/* ── Header ── */}
                <div className="flex items-start gap-3 px-5 py-4">
                    <span className="font-black text-muted-foreground/60 text-sm w-8 pt-0.5 shrink-0">
                        {String(q.number).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                        {expanded ? (
                            <textarea
                                value={q.content}
                                onChange={e => updateField("content", e.target.value)}
                                placeholder="Enter question text..."
                                className="w-full text-sm text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed min-h-[60px]"
                                rows={3}
                            />
                        ) : (
                            <p className="text-sm text-foreground leading-snug line-clamp-2">
                                {q.content || <span className="text-muted-foreground/60 italic">No content yet</span>}
                            </p>
                        )}
                        {!expanded && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFF_STYLES[q.difficulty]}`}>
                                    {q.difficulty}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                    {q.type}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {q.marks}M / -{q.negativeMarks}M
                                </span>
                                {q.isCancelled && (
                                    <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                        <Ban size={10} /> Officially cancelled
                                    </span>
                                )}
                                {collapsedAnswer() && (
                                    <span className="text-[10px] font-bold text-emerald-600">
                                        Ans: {collapsedAnswer()}
                                    </span>
                                )}
                                {q.saved && (
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Saved
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="p-1.5 text-muted-foreground hover:text-foreground/80 transition-colors rounded-lg hover:bg-muted"
                        >
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* ── Expanded body ── */}
                {expanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border/60 pt-4">

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3">
                            <input
                                type="checkbox"
                                checked={q.isCancelled}
                                onChange={(event) =>
                                    updateQuestionDraft(
                                        event.target.checked
                                            ? {
                                                isCancelled: true,
                                                marks: 0,
                                                negativeMarks: 0,
                                                correctOptions: [],
                                                exactAnswer: null,
                                                answerMin: null,
                                                answerMax: null,
                                                modelAnswer: null,
                                            }
                                            : { isCancelled: false }
                                    )
                                }
                                className="mt-0.5 size-4 rounded border-amber-500"
                            />
                            <span>
                                <span className="block text-xs font-black text-foreground">
                                    Cancelled in the official answer key
                                </span>
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                    Preserved in the paper, but excluded from marks,
                                    penalties, accuracy and completion.
                                </span>
                            </span>
                        </label>

                        {/* Meta fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                                <select
                                    value={q.type}
                                    onChange={e => updateField("type", e.target.value as Question["type"])}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Difficulty</label>
                                <select
                                    value={q.difficulty}
                                    onChange={e => updateField("difficulty", e.target.value as Question["difficulty"])}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Marks</label>
                                <input
                                    type="number" step="0.5"
                                    value={q.marks}
                                    disabled={q.isCancelled}
                                    onChange={e => updateField("marks", parseFloat(e.target.value) || 0)}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Negative</label>
                                <input
                                    type="number" step="0.25"
                                    value={q.negativeMarks}
                                    disabled={q.isCancelled}
                                    onChange={e => updateField("negativeMarks", parseFloat(e.target.value) || 0)}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {/* MCQ / MSQ options */}
                        {!q.isCancelled && isOptionsType && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                    Options
                                    <span className="ml-2 normal-case font-normal text-muted-foreground">
                                        {q.type === "MSQ" ? "— select all correct" : "— select one correct"}
                                    </span>
                                </label>
                                {q.options.map((opt, oi) => (
                                    <OptionRow
                                        key={`${q.clientId}-option-${opt.index}`}
                                        option={opt}
                                        isCorrect={q.correctOptions.includes(oi)}
                                        onToggle={() => toggleCorrect(oi)}
                                        onChange={text => updateOptionText(oi, text)}
                                        onRemove={() => removeOption(oi)}
                                        canRemove={q.options.length > 2}
                                    />
                                ))}
                                {q.options.length < 6 && (
                                    <button
                                        type="button"
                                        onClick={addOption}
                                        className="text-xs text-muted-foreground hover:text-foreground/80 flex items-center gap-1 mt-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add option
                                    </button>
                                )}
                            </div>
                        )}

                        {/* NUMERICAL */}
                        {!q.isCancelled && isNumerical && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                    Correct Answer
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground mb-1 block">Exact value</label>
                                        <input
                                            type="number" step="any"
                                            value={q.exactAnswer ?? ""}
                                            onChange={e => updateField("exactAnswer", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.8"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground mb-1 block">Range min</label>
                                        <input
                                            type="number" step="any"
                                            value={q.answerMin ?? ""}
                                            onChange={e => updateField("answerMin", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.7"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground mb-1 block">Range max</label>
                                        <input
                                            type="number" step="any"
                                            value={q.answerMax ?? ""}
                                            onChange={e => updateField("answerMax", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.9"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Fill exact value OR both range fields — not both.
                                </p>
                            </div>
                        )}

                        {/* SUBJECTIVE */}
                        {!q.isCancelled && isSubjective && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">
                                    Model Answer
                                </label>
                                <textarea
                                    value={q.modelAnswer ?? ""}
                                    onChange={e => updateField("modelAnswer", e.target.value || null)}
                                    placeholder="Expected answer for manual grading..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                                    Manual grading is not available yet. This question can be saved, but the paper cannot be published while it is subjective.
                                </p>
                            </div>
                        )}

                        {/* Topic */}
                        {/* Topic */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                Topic
                            </label>

                            {q.topicPath ? (
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-blue-800">
                                            {q.topicPath
                                                .split(">")
                                                .pop()
                                                ?.trim()}
                                        </p>

                                        <p className="truncate text-[10px] text-blue-500">
                                            {q.topicPath}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenTopicPicker(q.clientId)
                                            }
                                            className="rounded-md px-2 py-1 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
                                        >
                                            Change
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuestionDraft({
                                                    topicId: "",
                                                    topicPath: "",
                                                    categoryId: "",
                                                })
                                            }
                                            className="rounded-md p-1 text-blue-300 transition-colors hover:bg-blue-100 hover:text-blue-600"
                                            aria-label="Remove selected topic"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onOpenTopicPicker(q.clientId)
                                    }
                                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-border bg-card px-3 py-3 text-xs font-bold text-muted-foreground transition-colors hover:border-slate-400 hover:bg-accent hover:text-foreground"
                                >
                                    Choose or search for a topic
                                </button>
                            )}
                        </div>

                        {/* Explanation */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">
                                Explanation <span className="font-normal normal-case">— optional</span>
                            </label>
                            <textarea
                                value={q.explanation ?? ""}
                                onChange={e => updateField("explanation", e.target.value || null)}
                                placeholder="Why is this answer correct?"
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void handleSave();
                                }}
                                disabled={saving || !paperId}
                                title={
                                    !paperId
                                        ? "Create the paper before saving questions"
                                        : undefined
                                }
                                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving
                                    ? "Saving..."
                                    : !paperId
                                        ? "Create Paper First"
                                        : q.id
                                            ? "Update"
                                            : "Save Question"
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

QuestionCard.displayName = "QuestionCard";
const MemoizedQuestionCard = memo(
    QuestionCard,
    (previous, next) =>
        previous.q === next.q &&
        previous.paperId === next.paperId &&
        previous.examSlug === next.examSlug &&
        previous.moderationCaseId === next.moderationCaseId
);
MemoizedQuestionCard.displayName = "MemoizedQuestionCard";
export default MemoizedQuestionCard;
