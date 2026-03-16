'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { fi } from 'zod/v4/locales';

const syllabusItemSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    topics: z.array(z.string().min(1, 'Topic is required')).min(1, 'At least one topic is required'),
});

const examSchema = z.object({
    name: z.string().min(2, { message: 'Exam name is required' }),
    description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
    tags: z.array(z.string().min(1, 'Tag cannot be empty')).min(1, { message: 'At least one tag is required' }),
    duration: z.coerce.number().min(1, { message: 'Duration must be a positive number' }),
    totalMarks: z.coerce.number().min(1, { message: 'Total marks must be a positive number' }),
    syllabus: z.array(syllabusItemSchema).min(1, { message: 'At least one syllabus item is required' }),
});

const NewExamForm = () => {
    const form = useForm<z.infer<typeof examSchema>>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            name: '',
            description: '',
            tags: [],
            duration: 180,
            totalMarks: 100,
            syllabus: [
                {
                    category: '',
                    topics: [],
                }
            ],
        },
    });

    // Initialize the Field Array for Syllabus
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "syllabus",
    });

    const onSubmit = (data: z.infer<typeof examSchema>) => {
        console.log(data);
    };

    return (
        <Form {...form} >

            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-8 py-6 ">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Exam Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Exam Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. GATE CSE" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Tags Input */}
                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Tags</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Engineering ; National Level"
                                        value={Array.isArray(field.value) ? field.value.join(";") : ""}
                                        onChange={(e) => {
                                            const inputValue = e.target.value;
                                            const arrayValue = inputValue.split(";");
                                            field.onChange(arrayValue);
                                        }}
                                        onBlur={() => {
                                            const cleaned = field.value.map((t: string) => t.trim()).filter((t: string) => t !== "");
                                            field.onChange(cleaned);
                                            //console.log(cleaned);
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>Type tags separated by semicolons.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Description</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter a brief overview of the exam..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Duration */}
                    <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Duration (Mins)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Total Marks */}
                    <FormField
                        control={form.control}
                        name="totalMarks"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Total Marks</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Syllabus Section */}
                <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Syllabus Structure</h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ category: "", topics: [] })}
                        >
                            + Add Category
                        </Button>
                    </div>

                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-slate-50 border-dashed">
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    {/* Wrap the form content so the button doesn't see the internal spacing */}
                                    <div className="flex-1 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`syllabus.${index}.category`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. General Aptitude" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Use mt-8 to push the button down past the label's height */}
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="mt-6 shrink-0 hover:scale-102 transition-transform"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Topics Field */}
                                <FormField
                                    control={form.control}
                                    name={`syllabus.${index}.topics`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Topics (semicolons separated)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Topic 1 ; Topic 2 ; Topic 3"
                                                    className="min-h-[80px]"
                                                    value={Array.isArray(field.value) ? field.value.join("; ") : ""}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        const arrayValue = inputValue.split(";");
                                                        field.onChange(arrayValue);
                                                    }}
                                                    onBlur={() => {
                                                        const cleaned = field.value.map((t: string) => t.trim()).filter((t: string) => t !== "");
                                                        field.onChange(cleaned);
                                                        //console.log(cleaned);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </Card>
                    ))}
                </div>

                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600">
                    Create Exam
                </Button>
            </form>
        </Form>
    );
}

export default NewExamForm;