'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QuestionForm from './QuestionForm';
import { deleteQuestion } from '@/app/(main)/actions/question-actions';
import { toast } from 'sonner';

interface Option { id: string; text: string; isCorrect: boolean; }
interface Question {
    id: string; content: string; type: string; difficulty: string;
    marks: number; negativeMarks: number; explanation: string | null;
    correctAnswer: string | null; topicId: string; options: Option[];
}

interface Props {
    paperId: string;
    examSlug: string;
    initialQuestions: Question[];
}

const DIFFICULTY_COLOR: Record<string, string> = {
    EASY: "bg-green-100 text-green-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HARD: "bg-red-100 text-red-700",
};

export default function QuestionBuilder({ paperId, examSlug, initialQuestions }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleSaved = () => {
        setShowForm(false);
        setEditingId(null);
    };

    const handleDelete = async (questionId: string) => {
        if (!confirm("Delete this question?")) return;
        try
        {
            await deleteQuestion(questionId, paperId, examSlug);
            toast.success("Question deleted.");
        } catch
        {
            toast.error("Failed to delete.");
        }
    };

    return (
        <div className="space-y-4">

            {/* Existing Questions */}
            {initialQuestions.map((q, i) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                    {/* Question Header Row */}
                    <div className="flex items-start gap-4 p-5">
                        <span className="text-slate-300 font-black text-lg w-6 shrink-0">{i + 1}</span>

                        <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-medium leading-snug line-clamp-2">{q.content}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">{q.type}</Badge>
                                <Badge className={`text-xs ${DIFFICULTY_COLOR[q.difficulty]}`}>{q.difficulty}</Badge>
                                <span className="text-xs text-slate-400">{q.marks}M / -{q.negativeMarks}M</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700"
                                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                                {expandedId === q.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                onClick={() => { setEditingId(q.id); setShowForm(false); }}>
                                <Pencil size={15} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"
                                onClick={() => handleDelete(q.id)}>
                                <Trash2 size={15} />
                            </Button>
                        </div>
                    </div>

                    {/* Expanded: options / answer */}
                    {expandedId === q.id && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2">
                            {q.options.map((o, oi) => (
                                <div key={o.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${o.isCorrect ? 'bg-green-50 text-green-800 font-medium' : 'text-slate-600'}`}>
                                    <span className="font-mono text-xs w-5">{String.fromCharCode(65 + oi)}.</span>
                                    {o.text}
                                </div>
                            ))}
                            {q.correctAnswer && (
                                <p className="text-sm text-slate-600">Answer: <span className="font-bold">{q.correctAnswer}</span></p>
                            )}
                            {q.explanation && (
                                <p className="text-xs text-slate-400 italic mt-2">{q.explanation}</p>
                            )}
                        </div>
                    )}

                    {/* Inline Edit Form */}
                    {editingId === q.id && (
                        <div className="border-t border-slate-100 p-5">
                            <QuestionForm
                                paperId={paperId}
                                examSlug={examSlug}
                                initialData={q}
                                onSaved={handleSaved}
                                onCancel={() => setEditingId(null)}
                            />
                        </div>
                    )}
                </div>
            ))}

            {/* Empty State */}
            {initialQuestions.length === 0 && !showForm && (
                <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <BookOpen className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="font-medium">No questions yet</p>
                    <p className="text-sm mt-1">Click "Add Question" to get started</p>
                </div>
            )}

            {/* Add New Question Form */}
            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
                        New Question
                    </h3>
                    <QuestionForm
                        paperId={paperId}
                        examSlug={examSlug}
                        onSaved={handleSaved}
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            {/* Add Question Button */}
            {!showForm && (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-14 border-dashed border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900 rounded-2xl font-bold"
                    onClick={() => { setShowForm(true); setEditingId(null); }}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
            )}
        </div>
    );
}