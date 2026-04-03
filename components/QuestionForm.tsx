'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useTransition } from 'react';
import { questionSchema, QuestionFormValues } from '@/types/question';
import { createQuestionPaper, updateQuestionPaper } from '@/app/(main)/actions/paper-actions';
import { createQuestion, updateQuestion } from '@/app/(main)/actions/question-actions';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
    paperId: string;
    examSlug: string;
    initialData?: any;
    onSaved: () => void;
    onCancel: () => void;
}

const TYPES = ["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"] as const;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export default function QuestionForm({ paperId, examSlug, initialData, onSaved, onCancel }: Props) {
    const [isPending, startTransition] = useTransition();
    const isEditing = !!initialData;

    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(questionSchema),
        defaultValues: initialData
            ? {
                content: initialData.content,
                type: initialData.type,
                difficulty: initialData.difficulty,
                marks: initialData.marks,
                negativeMarks: initialData.negativeMarks,
                explanation: initialData.explanation ?? '',
                correctAnswer: initialData.correctAnswer ?? '',
                topicId: initialData.topicId,
                options: initialData.options ?? [],
            }
            : {
                content: '',
                type: 'MCQ',
                difficulty: 'MEDIUM',
                marks: 1,
                negativeMarks: 0,
                explanation: '',
                correctAnswer: '',
                topicId: '',
                options: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                ],
            },
    });

    const watchedType = form.watch('type');
    const showOptions = watchedType === 'MCQ' || watchedType === 'MSQ';

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: 'options',
    });

    const onSubmit = (data: QuestionFormValues) => {
        startTransition(async () => {
            try
            {
                if (isEditing)
                {
                    await updateQuestion(initialData.id, paperId, examSlug, data);
                    toast.success("Question updated.");
                } else
                {
                    await createQuestion(paperId, examSlug, data);
                    toast.success("Question added.");
                    form.reset();
                }
                onSaved();
            } catch
            {
                toast.error("Failed to save question.");
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Type + Difficulty + Marks row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs">Type</FormLabel>
                            <select {...field} className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900">
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs">Difficulty</FormLabel>
                            <select {...field} className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900">
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="marks" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs">Marks</FormLabel>
                            <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="negativeMarks" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs">Negative</FormLabel>
                            <FormControl><Input type="number" step="0.25" {...field} /></FormControl>
                        </FormItem>
                    )} />
                </div>

                {/* Question Content */}
                <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold">Question</FormLabel>
                        <FormControl>
                            <Textarea {...field} placeholder="Enter the question..." className="min-h-[100px] resize-none" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* topicId — plain input for now, swap for a Topic picker later */}
                <FormField control={form.control} name="topicId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs">Topic ID</FormLabel>
                        <FormControl><Input placeholder="Paste topic UUID" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Options — MCQ / MSQ */}
                {showOptions && (
                    <div className="space-y-3">
                        <p className="font-bold text-sm">Options
                            <span className="text-slate-400 font-normal ml-2 text-xs">
                                {watchedType === 'MSQ' ? '(select all correct)' : '(select one correct)'}
                            </span>
                        </p>

                        {fields.map((field, idx) => {
                            const isCorrect = form.watch(`options.${idx}.isCorrect`);
                            return (
                                <div key={field.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCorrect ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                    {/* Correct toggle */}
                                    <button type="button" onClick={() => {
                                        if (watchedType === 'MCQ')
                                        {
                                            // Deselect all others first
                                            fields.forEach((_, i) => update(i, { ...form.getValues(`options.${i}`), isCorrect: false }));
                                        }
                                        update(idx, { ...form.getValues(`options.${idx}`), isCorrect: !isCorrect });
                                    }}>
                                        {isCorrect
                                            ? <CheckCircle2 size={20} className="text-green-500" />
                                            : <Circle size={20} className="text-slate-300" />
                                        }
                                    </button>

                                    <span className="font-mono text-sm text-slate-400 w-5">{String.fromCharCode(65 + idx)}</span>

                                    <FormField control={form.control} name={`options.${idx}.text`} render={({ field }) => (
                                        <FormItem className="flex-1 space-y-0">
                                            <FormControl>
                                                <Input {...field} placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                    className={`border-0 bg-transparent focus-visible:ring-0 p-0 h-8 ${isCorrect ? 'text-green-800' : ''}`} />
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    {fields.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => remove(idx)}
                                            className="text-slate-400 hover:text-red-500 transition-colors ml-2 p-1"
                                            title="Remove Option"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {fields.length < 6 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ text: '', isCorrect: false })}
                                className="mt-2 text-xs border-dashed text-slate-500 hover:text-slate-900"
                            >
                                <Plus size={14} className="mr-1" /> Add Option
                            </Button>
                        )}
                    </div>
                )}

                {/* Correct Answer — For NUMERICAL or SUBJECTIVE types */}
                {!showOptions && (
                    <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Correct Answer</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder={watchedType === 'NUMERICAL' ? "e.g., 42.5" : "Expected string or key points..."}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}

                {/* Explanation */}
                <FormField control={form.control} name="explanation" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold">Explanation (Optional)</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                placeholder="Explain why the answer is correct..."
                                className="min-h-[80px] resize-none"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                        {isPending ? 'Saving...' : (isEditing ? 'Update Question' : 'Save Question')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}