"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import {
    Loader2, Plus, Trash2, CheckCircle2, Circle, X, Search,
    ChevronDown, ChevronUp, Save,
} from "lucide-react";
import { createQuestion, updateQuestion, deleteQuestion } from "@/app/(main)/actions/question-actions";
import type { Question, Option, SyllabusEntry } from "./PaperBuilder";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const TYPES = ["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"] as const;

const DIFF_STYLES = {
    EASY: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HARD: "bg-red-50 text-red-700 border-red-200",
};

export interface QuestionCardHandle {
    save: () => Promise<void>;
}

export interface QuestionCardProps {
    q: Question;
    index: number;
    paperId: string | null;
    examSlug: string;
    syllabusEntries: SyllabusEntry[];
    onUpdate: (updated: Question) => void;
    onDelete: () => void;
    wrapperRef?: (el: HTMLDivElement | null) => void;
}

// ── Option Row ────────────────────────────────────────────────────────────────
function OptionRow({
    option,
    isCorrect,
    isMulti,
    onToggle,
    onChange,
    onRemove,
    canRemove,
}: {
    option: Option;
    isCorrect: boolean;       // driven by correctOptions[], not option.isCorrect
    isMulti: boolean;
    onToggle: () => void;
    onChange: (text: string) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${isCorrect
                ? "bg-emerald-50 border-emerald-300 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
            <button type="button" onClick={onToggle} className="shrink-0 transition-transform active:scale-90">
                {isCorrect
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <Circle size={18} className="text-slate-300 hover:text-slate-400" />
                }
            </button>
            <span className={`font-mono text-sm font-bold w-5 shrink-0 ${isCorrect ? "text-emerald-600" : "text-slate-400"}`}>
                {option.label}
            </span>
            <input
                type="text"
                value={option.text}
                onChange={e => onChange(e.target.value)}
                placeholder={`Option ${option.label}`}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300 ${isCorrect ? "text-emerald-800 font-medium" : "text-slate-700"
                    }`}
            />
            {canRemove && (
                <button type="button" onClick={onRemove} className="shrink-0 text-slate-300 hover:text-red-400 transition-colors">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

// ── Topic Picker ──────────────────────────────────────────────────────────────
function TopicPicker({
    entries, value, onChange,
}: {
    entries: SyllabusEntry[];
    value: string;
    onChange: (topicId: string, topicPath: string, categoryId: string) => void;
}) {
    const [query, setQuery] = useState("");
    const filtered = entries.filter(e =>
        e.topicPath.toLowerCase().includes(query.toLowerCase())
    );
    const selected = entries.find(e => e.topicPath === value);

    return (
        <div className="relative space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Topic</label>
            {selected ? (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                        <p className="text-xs font-bold text-blue-800">{selected.topicPath.split(">").pop()?.trim()}</p>
                        <p className="text-[10px] text-blue-500">{selected.topicPath}</p>
                    </div>
                    <button type="button" onClick={() => onChange("", "", "")} className="text-blue-300 hover:text-blue-600">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search topics..."
                            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-slate-400 px-3 py-3 text-center">No topics found</p>
                        ) : (
                            filtered.map(e => (
                                <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => { onChange(e.topicId ?? "", e.topicPath, e.categoryId); setQuery(""); }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-xs font-medium text-slate-700">{e.topicPath.split(">").pop()?.trim()}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{e.topicPath}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = forwardRef<QuestionCardHandle, QuestionCardProps>(
    ({ q, index, paperId, examSlug, syllabusEntries, onUpdate, onDelete, wrapperRef }, ref) => {
        const [expanded, setExpanded] = useState(!q.saved);
        const [saving, setSaving] = useState(false);

        const isOptionsType = q.type === "MCQ" || q.type === "MSQ";
        const isNumerical = q.type === "NUMERICAL";
        const isSubjective = q.type === "SUBJECTIVE";

        const updateField = <K extends keyof Question>(key: K, value: Question[K]) =>
            onUpdate({ ...q, [key]: value });

        // ── Option helpers ──────────────────────────────────────────────────────

        const toggleCorrect = (optionIndex: number) => {
            if (q.type === "MCQ")
            {
                // Radio behaviour — only one correct at a time
                onUpdate({ ...q, correctOptions: [optionIndex] });
            } else
            {
                // MSQ — toggle in/out of correctOptions array
                const already = q.correctOptions.includes(optionIndex);
                const next = already
                    ? q.correctOptions.filter(i => i !== optionIndex)
                    : [...q.correctOptions, optionIndex];
                onUpdate({ ...q, correctOptions: next });
            }
        };

        const updateOptionText = (optionIndex: number, text: string) => {
            const newOpts = q.options.map((o, i) =>
                i === optionIndex ? { ...o, text } : o
            );
            onUpdate({ ...q, options: newOpts });
        };

        const addOption = () => {
            if (q.options.length >= 6) return;
            const i = q.options.length;
            onUpdate({
                ...q,
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

            onUpdate({ ...q, options: newOpts, correctOptions: newCorrect });
        };

        // ── Validation ──────────────────────────────────────────────────────────

        const validate = (): string | null => {
            if (!paperId?.trim()) return "Save the paper first before adding questions";
            if (!q.content.trim()) return "Question content is required";

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

        useImperativeHandle(ref, () => ({ save: handleSave }));

        const handleSave = async () => {
            const error = validate();
            if (error)
            {
                toast.error(error);
                throw new Error(error);
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

                    // MCQ / MSQ
                    options: isOptionsType
                        ? q.options.filter(o => o.text.trim()).map(o => ({
                            index: o.index,
                            text: o.text,
                            imageUrl: o.imageUrl,
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
                    await updateQuestion(q.id, paperId!, examSlug, payload);
                    onUpdate({ ...q, saved: true });
                    toast.success(`Q${q.number} updated`);
                } else
                {
                    await createQuestion(paperId!, examSlug, payload);
                    onUpdate({ ...q, saved: true });
                    toast.success(`Q${q.number} saved`);
                }
                setExpanded(false);
            } catch (err: any)
            {
                toast.error(`Failed: ${err.message}`);
                throw err;
            } finally
            {
                setSaving(false);
            }
        };

        const handleDelete = async () => {
            if (q.id)
            {
                if (!confirm(`Delete question ${q.number}?`)) return;
                try
                {
                    await deleteQuestion(q.id, paperId as string, examSlug);
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
            if (isOptionsType)
            {
                const labels = q.correctOptions
                    .sort()
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
                        ? "border-slate-200 bg-white shadow-sm"
                        : "border-blue-200 bg-blue-50/30 shadow-sm"
                    }`}
            >
                {/* ── Header ── */}
                <div className="flex items-start gap-3 px-5 py-4">
                    <span className="font-black text-slate-300 text-sm w-8 pt-0.5 shrink-0">
                        {String(q.number).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                        {expanded ? (
                            <textarea
                                value={q.content}
                                onChange={e => updateField("content", e.target.value)}
                                placeholder="Enter question text..."
                                className="w-full text-sm text-slate-800 bg-transparent outline-none resize-none placeholder:text-slate-300 leading-relaxed min-h-[60px]"
                                rows={3}
                            />
                        ) : (
                            <p className="text-sm text-slate-800 leading-snug line-clamp-2">
                                {q.content || <span className="text-slate-300 italic">No content yet</span>}
                            </p>
                        )}
                        {!expanded && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFF_STYLES[q.difficulty]}`}>
                                    {q.difficulty}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                    {q.type}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {q.marks}M / -{q.negativeMarks}M
                                </span>
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
                            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* ── Expanded body ── */}
                {expanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

                        {/* Meta fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Type</label>
                                <select
                                    value={q.type}
                                    onChange={e => updateField("type", e.target.value as Question["type"])}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Difficulty</label>
                                <select
                                    value={q.difficulty}
                                    onChange={e => updateField("difficulty", e.target.value as Question["difficulty"])}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Marks</label>
                                <input
                                    type="number" step="0.5"
                                    value={q.marks}
                                    onChange={e => updateField("marks", parseFloat(e.target.value) || 0)}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Negative</label>
                                <input
                                    type="number" step="0.25"
                                    value={q.negativeMarks}
                                    onChange={e => updateField("negativeMarks", parseFloat(e.target.value) || 0)}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                        </div>

                        {/* MCQ / MSQ options */}
                        {isOptionsType && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Options
                                    <span className="ml-2 normal-case font-normal text-slate-400">
                                        {q.type === "MSQ" ? "— select all correct" : "— select one correct"}
                                    </span>
                                </label>
                                {q.options.map((opt, oi) => (
                                    <OptionRow
                                        key={oi}
                                        option={opt}
                                        isCorrect={q.correctOptions.includes(oi)}
                                        isMulti={q.type === "MSQ"}
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
                                        className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 mt-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add option
                                    </button>
                                )}
                            </div>
                        )}

                        {/* NUMERICAL */}
                        {isNumerical && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Correct Answer
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-slate-400 mb-1 block">Exact value</label>
                                        <input
                                            type="number" step="any"
                                            value={q.exactAnswer ?? ""}
                                            onChange={e => updateField("exactAnswer", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.8"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 mb-1 block">Range min</label>
                                        <input
                                            type="number" step="any"
                                            value={q.answerMin ?? ""}
                                            onChange={e => updateField("answerMin", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.7"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 mb-1 block">Range max</label>
                                        <input
                                            type="number" step="any"
                                            value={q.answerMax ?? ""}
                                            onChange={e => updateField("answerMax", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="e.g. 9.9"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Fill exact value OR both range fields — not both.
                                </p>
                            </div>
                        )}

                        {/* SUBJECTIVE */}
                        {isSubjective && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                                    Model Answer
                                </label>
                                <textarea
                                    value={q.modelAnswer ?? ""}
                                    onChange={e => updateField("modelAnswer", e.target.value || null)}
                                    placeholder="Expected answer for manual grading..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                                />
                            </div>
                        )}

                        {/* Topic */}
                        <TopicPicker
                            entries={syllabusEntries}
                            value={q.topicPath}
                            onChange={(topicId, topicPath, categoryId) =>
                                onUpdate({ ...q, topicId, topicPath, categoryId })
                            }
                        />

                        {/* Explanation */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                                Explanation <span className="font-normal normal-case">— optional</span>
                            </label>
                            <textarea
                                value={q.explanation ?? ""}
                                onChange={e => updateField("explanation", e.target.value || null)}
                                placeholder="Why is this answer correct?"
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? "Saving..." : (q.id ? "Update" : "Save Question")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

QuestionCard.displayName = "QuestionCard";
export default QuestionCard;